import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Heart, MessageCircle, Pause, Play, RotateCcw, Dices, Share2, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { AlarmCard } from "@/game/GoatAlarmScene";
import { ChronicleBook } from "@/game/ChronicleBook";
import { FitOverlay } from "@/game/FitOverlay";
import { NicknameField } from "@/game/NicknameField";
import { Runner, emptyHud, type Hud } from "@/game/runner";
import { chronicleBook } from "@/game/chronicle";
import { BONUS_CALM, BONUS_PARDON, type BonusAction } from "@/game/minigames";
import { announceName, fetchStats, needsName, playerLabel, previewStats, randomName, type BoardRow } from "@/game/plays";
import { PlayersSheet } from "@/game/PlayersSheet";
import { WhoPlays } from "@/game/WhoPlays";
import { addProfile, loadProfiles, removeProfile, renameProfile, selectProfile, type Profiles } from "@/game/profiles";
import { publicUrl } from "@/lib/public-url";

function hudReactKey(h: Hud): string {
  const b = h.bonus;
  let bonus = "";
  if (b?.id === "alarm") {
    bonus = [
      b.stage,
      b.pointer.toFixed(3),
      b.zoneStart.toFixed(3),
      b.zoneEnd.toFixed(3),
      b.windows,
      b.goal,
      b.pose,
      b.shake.toFixed(3),
      b.note,
      b.failed ? 1 : 0,
      b.prompt,
      b.success,
      b.reward,
      b.wrong,
    ].join(",");
  } else if (b) {
    bonus = [b.stage, b.prompt, b.picked ?? "", b.wrong, b.success, b.reward, b.cards.join("|")].join(",");
  }
  return [
    h.phase,
    h.lives,
    h.bonusLife ? 1 : 0,
    h.fact?.title ?? "",
    h.fact?.text ?? "",
    h.factLabel,
    h.factComplete ? 1 : 0,
    h.chronicleNew,
    h.scrolls,
    h.scrollsTotal,
    h.newBest ? 1 : 0,
    h.muted ? 1 : 0,
    h.coach ? 1 : 0,
    h.showTale ? 1 : 0,
    h.line,
    h.taleTag,
    h.taleTitle,
    h.ready ? 1 : 0,
    Math.round(h.progress * 100),
    h.best,
    h.bestGossips,
    h.stagDialogue?.step ?? 0,
    h.stagDialogue?.title ?? "",
    h.stagDialogue?.speaker ?? "",
    h.stagDialogue?.text ?? "",
    h.fishDialogue ?? "",
    bonus,
  ].join("\u001f");
}

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef<HTMLParagraphElement>(null);
  const gossipRef = useRef<HTMLParagraphElement>(null);
  const biomeRef = useRef<HTMLParagraphElement>(null);
  const gameRef = useRef<Runner | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuContentRef = useRef<HTMLElement>(null);
  const [hud, setHud] = useState<Hud>(emptyHud);
  const liveHud = useRef(hud);
  const hudKey = useRef("");
  const [copied, setCopied] = useState(false);
  const [players, setPlayers] = useState<number | null>(previewStats?.players ?? null);
  const [board, setBoard] = useState<BoardRow[]>(previewStats?.board ?? []);
  // Players sharing this device (src/game/profiles.ts); loaded after mount, localStorage is not there on the server.
  const [profiles, setProfiles] = useState<Profiles>({ current: "", list: [] });
  const [playersOpen, setPlayersOpen] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);
  // Computer with a mouse and keyboard: keyboard hints and no on-screen buttons. Decided after mount (no window on the server).
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const decide = () => setKeyboard(query.matches && navigator.maxTouchPoints === 0);
    decide();
    query.addEventListener("change", decide);
    return () => query.removeEventListener("change", decide);
  }, []);
  // The start gate runs inside the game loop, so it reads the players through a ref.
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  // Set right before a start that already knows who plays, so the gate does not ask again.
  const playerChosen = useRef(false);
  const player = profiles.list.find((p) => p.id === profiles.current) ?? null;
  const [chronicle, setChronicle] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [askName, setAskName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const leaderboardOn = useRef(false);
  leaderboardOn.current = players != null;

  useEffect(() => setProfiles(loadProfiles()), []);

  // Every change of players goes through here, so the record on screen follows the selected player.
  function updatePlayers(next: Profiles) {
    setProfiles(next);
    gameRef.current?.refreshRecord();
  }

  // Mobile browsers scroll the page to keep a focused field above the keyboard and sometimes leave it scrolled
  // after the keyboard closes, uncovering the page background under the game. The game never scrolls, so undo it.
  useEffect(() => {
    const unscroll = () => {
      if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
      const root = document.scrollingElement;
      if (root && (root.scrollTop || root.scrollLeft)) root.scrollTo(0, 0);
    };
    const later = () => window.setTimeout(unscroll, 120);
    window.addEventListener("focusout", later);
    window.addEventListener("orientationchange", later);
    window.visualViewport?.addEventListener("resize", later);
    return () => {
      window.removeEventListener("focusout", later);
      window.removeEventListener("orientationchange", later);
      window.visualViewport?.removeEventListener("resize", later);
    };
  }, []);

  function startPlaying(chosen: string) {
    updatePlayers(addProfile(chosen));
    setAskName(false);
    beginChosen();
  }

  function beginChosen() {
    playerChosen.current = true;
    setWhoOpen(false);
    gameRef.current?.begin();
  }

  function playAs(id: string) {
    updatePlayers(selectProfile(id));
    beginChosen();
  }

  function addAndPlay(nextName: string) {
    updatePlayers(addProfile(nextName));
    beginChosen();
  }
  const [chronicleNewFirst, setChronicleNewFirst] = useState(false);
  // Recompute saved progress when the game phase, the number of new entries or the player changes.
  const bookProgress = useMemo(() => chronicleBook(), [hud.phase, hud.chronicleNew, profiles?.current]);

  function openChronicle(showNewest = false) {
    setChronicleNewFirst(showNewest);
    setChronicle(true);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Runner(canvas, (next) => {
      liveHud.current = next;
      const score = scoreRef.current;
      if (score) score.textContent = String(next.score);
      const gossip = gossipRef.current;
      if (gossip) gossip.textContent = next.combo > 1 ? `${next.gossips} drbů · ×${next.combo}` : `${next.gossips} drbů`;
      const biome = biomeRef.current;
      if (biome && biome.textContent !== next.biome) biome.textContent = next.biome;
      const key = hudReactKey(next);
      if (key === hudKey.current) return;
      hudKey.current = key;
      setHud(next);
    });
    gameRef.current = game;
    // First start from the menu: invite the player to pick a leaderboard name.
    // Every start from the main menu asks who plays (a new device asks for a nickname). "Znovu" after a game
    // and starts from other screens keep the same player.
    game.startGate = () => {
      if (playerChosen.current) {
        playerChosen.current = false;
        return true;
      }
      if (leaderboardOn.current && needsName()) {
        setNameDraft((draft) => draft || randomName());
        setAskName(true);
        return false;
      }
      if (profilesRef.current.list.length > 0) {
        setWhoOpen(true);
        return false;
      }
      return true;
    };
    game.start();
    const onStats = (event: Event) => {
      const stats = (event as CustomEvent<{ players?: number; board?: BoardRow[] }>).detail;
      if (typeof stats?.players === "number") setPlayers(stats.players);
      if (Array.isArray(stats?.board)) setBoard(stats.board);
    };
    window.addEventListener("drbena-plays", onStats);
    void fetchStats().then((stats) => {
      if (!stats) return;
      setPlayers(stats.players);
      setBoard(stats.board);
    });
    return () => {
      window.removeEventListener("drbena-plays", onStats);
      game.destroy();
    };
  }, []);

  // Keep the whole opening menu visible, at the largest legible size that fits.
  // In particular, a short laptop display should not make the menu tiny if there
  // is still plenty of empty space above it.
  useLayoutEffect(() => {
    const next = liveHud.current;
    const score = scoreRef.current;
    if (score) score.textContent = String(next.score);
    const gossip = gossipRef.current;
    if (gossip) gossip.textContent = next.combo > 1 ? `${next.gossips} drbů · ×${next.combo}` : `${next.gossips} drbů`;
    const biome = biomeRef.current;
    if (biome) biome.textContent = next.biome;
  });

  // Keep the whole opening menu visible, at the largest legible size that fits.
  // In particular, a short laptop display should not make the menu tiny if there
  // is still plenty of empty space above it.
  useLayoutEffect(() => {
    if (hud.phase !== "menu") return;
    const menu = menuRef.current;
    const content = menuContentRef.current;
    const frame = content?.parentElement;
    if (!menu || !content || !frame) return;

    function fit() {
      if (!menu || !content || !frame) return;
      const availableHeight = () => {
        const style = getComputedStyle(frame);
        return menu.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      };
      const fits = () => content.getBoundingClientRect().height <= availableHeight() - 1;

      // Measure at full size first. Only shrink when the actual content needs it.
      menu.style.fontSize = "16px";
      if (fits()) return;

      let low = 6;
      let high = 16;
      for (let i = 0; i < 12; i++) {
        const mid = (low + high) / 2;
        menu.style.fontSize = `${mid}px`;
        if (fits()) low = mid;
        else high = mid;
      }
      menu.style.fontSize = `${low.toFixed(2)}px`;
    }

    let frameId = 0;
    const scheduleFit = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(fit);
    };
    const observer = new ResizeObserver(scheduleFit);
    observer.observe(menu);
    fit();
    // Fonts can change the height of labels after the initial measurement.
    void document.fonts.ready.then(scheduleFit);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [hud.phase, hud.best, hud.bestGossips, players, board]);

  async function share() {
    const text = `Drběna nasbírala ${hud.gossips} drbů a ${hud.score} bodů v Kopidlně. Zvládneš víc?`;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Drběna sbírá drby", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* user dismissed share */
    }
  }

  const playing = hud.phase === "play" || hud.phase === "pause" || hud.phase === "over" || hud.phase === "fish-intro" || hud.phase === "bonus" || hud.phase === "dialogue";

  return (
    // Chrome na Androidu kreslí hru až k dolnímu okraji displeje (viewport-fit=cover) a přes spodek dává
    // pruh navigace gesty. Hra proto končí nad ním (safe-area-inset-bottom), ať pruh nic nezakryje.
    <main className="fixed inset-x-0 top-0 bottom-[env(safe-area-inset-bottom,0px)] touch-none overflow-hidden bg-day text-ink select-none">
      <canvas key="drbena-surface" ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-label="Hra Drběna sbírá drby" />

      {(hud.phase === "loading" || hud.phase === "splash") && (
        <div
          className={`absolute inset-0 z-20 flex items-center justify-center overflow-hidden ${hud.ready ? "cursor-pointer" : "cursor-wait"}`}
          onClick={() => gameRef.current?.continueSplash()}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#3f8ec4_0%,#8ecae6_34%,#f6d7a0_72%,#f3e0b8_100%)]" />
          <div className="pointer-events-none absolute right-[16%] top-[14%] size-28 rounded-full bg-[#ffe7a8] sm:size-40" />
          <div className="pointer-events-none absolute right-[12%] top-[10%] size-48 rounded-full bg-[#ffe29a] opacity-80 blur-3xl sm:size-72" />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <g fill="#fff">
              <g transform="translate(150 110) scale(1.55)">
                <ellipse cx="6" cy="28" rx="86" ry="16" fill="#e8c98a" opacity="0.45" />
                <ellipse cx="-40" cy="6" rx="34" ry="24" />
                <ellipse cx="-4" cy="-10" rx="46" ry="32" />
                <ellipse cx="40" cy="-4" rx="38" ry="28" />
                <ellipse cx="72" cy="8" rx="26" ry="18" />
                <ellipse cx="8" cy="14" rx="78" ry="26" />
                <ellipse cx="-16" cy="-16" rx="18" ry="10" fill="#fffef8" />
              </g>
              <g transform="translate(1260 95) scale(1.25)">
                <ellipse cx="4" cy="26" rx="78" ry="14" fill="#e8c98a" opacity="0.4" />
                <ellipse cx="-36" cy="4" rx="30" ry="22" />
                <ellipse cx="2" cy="-12" rx="42" ry="30" />
                <ellipse cx="42" cy="-2" rx="34" ry="24" />
                <ellipse cx="6" cy="12" rx="70" ry="24" />
                <ellipse cx="-8" cy="-18" rx="16" ry="8" fill="#fffef8" />
              </g>
              <g transform="translate(760 70) scale(0.62)" opacity="0.92">
                <ellipse cx="-28" cy="2" rx="24" ry="16" />
                <ellipse cx="2" cy="-8" rx="30" ry="20" />
                <ellipse cx="30" cy="2" rx="22" ry="15" />
                <ellipse cx="4" cy="8" rx="48" ry="16" />
              </g>
              <g transform="translate(430 48) scale(0.42)" opacity="0.8">
                <ellipse cx="-20" cy="2" rx="18" ry="12" />
                <ellipse cx="6" cy="-6" rx="22" ry="15" />
                <ellipse cx="26" cy="2" rx="16" ry="11" />
                <ellipse cx="4" cy="6" rx="36" ry="12" />
              </g>
              <g transform="translate(70 430) scale(1.05)">
                <ellipse cx="4" cy="24" rx="72" ry="13" fill="#e8c98a" opacity="0.4" />
                <ellipse cx="-34" cy="2" rx="28" ry="20" />
                <ellipse cx="4" cy="-12" rx="38" ry="26" />
                <ellipse cx="40" cy="0" rx="30" ry="22" />
                <ellipse cx="4" cy="10" rx="64" ry="22" />
                <ellipse cx="-10" cy="-16" rx="14" ry="7" fill="#fffef8" />
              </g>
              <g transform="translate(1380 400) scale(1.2)">
                <ellipse cx="0" cy="26" rx="80" ry="14" fill="#e8c98a" opacity="0.42" />
                <ellipse cx="-42" cy="4" rx="32" ry="22" />
                <ellipse cx="-2" cy="-12" rx="44" ry="30" />
                <ellipse cx="42" cy="-2" rx="34" ry="24" />
                <ellipse cx="74" cy="8" rx="22" ry="16" />
                <ellipse cx="6" cy="12" rx="76" ry="24" />
                <ellipse cx="-14" cy="-18" rx="16" ry="8" fill="#fffef8" />
              </g>
              <g transform="translate(240 800) scale(0.9)" opacity="0.95">
                <ellipse cx="2" cy="22" rx="70" ry="12" fill="#e8c98a" opacity="0.35" />
                <ellipse cx="-30" cy="2" rx="26" ry="18" />
                <ellipse cx="6" cy="-10" rx="36" ry="24" />
                <ellipse cx="40" cy="0" rx="28" ry="20" />
                <ellipse cx="6" cy="10" rx="60" ry="20" />
              </g>
              <g transform="translate(1180 820) scale(1.05)">
                <ellipse cx="0" cy="22" rx="74" ry="12" fill="#e8c98a" opacity="0.38" />
                <ellipse cx="-36" cy="2" rx="28" ry="20" />
                <ellipse cx="2" cy="-12" rx="40" ry="26" />
                <ellipse cx="42" cy="0" rx="30" ry="20" />
                <ellipse cx="4" cy="10" rx="66" ry="22" />
                <ellipse cx="-8" cy="-16" rx="14" ry="7" fill="#fffef8" />
              </g>
            </g>
          </svg>
          <div className="pointer-events-none absolute bottom-[14%] left-1/2 h-16 w-[62%] -translate-x-1/2 rounded-[100%] bg-[#6b4a28]/20 blur-md" />
          <div className="relative z-10 flex w-[min(94vw,680px,84vh)] flex-col items-center">
            <img
              src={`${publicUrl("/game/splash-logo.webp")}?v=4`}
              alt="Kopidlenská drbna"
              className="z-20 -mb-[7%] w-[108%] max-w-none -rotate-1 drop-shadow-[0_10px_16px_rgba(36,28,22,0.28)]"
            />
            <img
              src={`${publicUrl("/game/splash-goat.webp")}?v=4`}
              alt="Drběna běží před zámkem"
              className="z-10 w-full drop-shadow-[0_18px_24px_rgba(36,28,22,0.25)]"
            />
            <img
              src={`${publicUrl("/game/splash-url.webp")}?v=4`}
              alt="www.kopidlenskadrbna.org"
              className="z-20 -mt-[9%] w-[84%] rotate-1 drop-shadow-[0_8px_12px_rgba(36,28,22,0.3)]"
            />
            {hud.ready ? (
              <p className="mt-3 text-sm font-extrabold tracking-wide text-[#3d2c22]/75">Klepni a pokračuj</p>
            ) : (
              <div className="mt-4 w-44" aria-label="Načítání">
                <div className="h-3 overflow-hidden rounded-full border-2 border-[#3d2c22] bg-[#fff6e8]">
                  <div className="h-full bg-[#e4577a]" style={{ width: `${Math.round(hud.progress * 100)}%` }} />
                </div>
              </div>
            )}
            <p className="mt-2 text-[11px] font-extrabold tracking-wide text-[#3d2c22]/55">© Kopidlenská drbna | Camledian</p>
          </div>
        </div>
      )}

      {hud.phase === "menu" && (
        <div
          ref={menuRef}
          className="menu-fit absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,rgba(36,28,22,0)_0%,rgba(36,28,22,0.28)_100%)]"
          onClick={() => gameRef.current?.begin()}
        >
          <div className="flex h-full min-h-0 items-center justify-center px-[1em] py-[0.75em]">
            <section ref={menuContentRef} className="flex w-full max-w-[25em] shrink-0 flex-col items-center text-center">
              <img
                src={`${publicUrl("/game/splash-logo.webp")}?v=4`}
                alt="Kopidlenská drbna"
                className="menu-pop w-[19em] max-w-full -rotate-2 drop-shadow-[0_0.5em_0.6em_rgba(36,28,22,0.35)]"
              />
              <p className="menu-pop mt-[0.15em] rotate-1 rounded-full border-2 border-ink bg-bow px-[1em] py-[0.2em] font-display text-[1.25em] text-cream shadow-[0_0.2em_0_#241c16] [animation-delay:80ms]">
                Drběna sbírá drby
              </p>
              <p className="menu-pop mt-[0.6em] rounded-full bg-ink/40 px-[0.9em] py-[0.2em] text-[0.78em] font-extrabold text-cream backdrop-blur-sm [animation-delay:120ms]">
                ♪ za doprovodu Esmeraldy od Františka Matěje Hilmara
              </p>

              <div
                className="menu-pop mt-[0.8em] w-full rounded-[1.75em] border-2 border-ink bg-cream/90 p-[1em] shadow-[0_0.4em_0_#241c16] backdrop-blur-md [animation-delay:160ms]"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="group relative flex h-[4em] w-full items-center justify-center gap-[0.5em] rounded-[1.25em] border-2 border-ink bg-bow font-extrabold text-cream shadow-[0_0.3em_0_#241c16] transition-[transform,box-shadow] hover:bg-bow-deep active:translate-y-[0.3em] active:shadow-none"
                  onClick={() => gameRef.current?.begin()}
                >
                  <span className="flex size-[1.9em] items-center justify-center rounded-full bg-cream text-bow">
                    <Play className="size-[1em] translate-x-[0.06em] fill-current" aria-hidden="true" />
                  </span>
                  <span className="text-[1.5em] tracking-wide">Vyrazit</span>
                </button>

                <div className="mt-[0.75em] flex justify-center gap-[0.4em] text-[0.8em] font-extrabold text-ink-soft">
                  <span className="rounded-full bg-cream-deep px-[0.75em] py-[0.25em]">{keyboard ? "⎵ mezerník = skok" : "👆 klepni = skok"}</span>
                  <span className="rounded-full bg-cream-deep px-[0.75em] py-[0.25em]">{keyboard ? "↓ šipka dolů = pokrč se" : "👇 táhni dolů = pokrč se"}</span>
                </div>

                <div className="mt-[0.85em] grid grid-cols-2 gap-[0.6em]">
                  <button
                    type="button"
                    className="flex flex-col items-start rounded-[1.1em] border-2 border-ink bg-cream p-[0.7em] text-left shadow-[0_0.2em_0_#241c16] transition-transform hover:-translate-y-[0.1em] active:translate-y-[0.15em] active:shadow-none"
                    aria-label={`Kronika Kopidlna, objeveno ${bookProgress.known}/${bookProgress.total} příběhů`}
                    onClick={() => openChronicle()}
                  >
                    <span className="flex w-full items-center justify-between">
                      <BookOpen className="size-[1.6em] text-bow" aria-hidden="true" />
                      <span className="font-display text-[1.1em]">
                        {bookProgress.known}
                        <span className="text-ink-soft">/{bookProgress.total}</span>
                      </span>
                    </span>
                    <span className="mt-[0.35em] font-display text-[1.05em] leading-tight">Kronika</span>
                    <span className="text-[0.72em] font-extrabold text-ink-soft">příběhy Kopidlna</span>
                    <span className="mt-[0.45em] block h-[0.4em] w-full overflow-hidden rounded-full bg-cream-deep">
                      <span
                        className="block h-full rounded-full bg-gold"
                        style={{ width: `${bookProgress.total ? Math.max(4, (bookProgress.known / bookProgress.total) * 100) : 0}%` }}
                      />
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex flex-col items-start rounded-[1.1em] border-2 border-ink bg-cream p-[0.7em] text-left shadow-[0_0.2em_0_#241c16] transition-transform hover:-translate-y-[0.1em] active:translate-y-[0.15em] active:shadow-none"
                    aria-label={hud.best > 0 ? `Žebříček, tvůj rekord ${hud.best}` : "Žebříček"}
                    onClick={() => setBoardOpen(true)}
                  >
                    <span className="flex w-full items-center justify-between">
                      <Trophy className="size-[1.6em] text-gold" aria-hidden="true" />
                      <span className="font-display text-[1.1em]">{hud.best > 0 ? hud.best : "–"}</span>
                    </span>
                    <span className="mt-[0.35em] font-display text-[1.05em] leading-tight">Žebříček</span>
                    <span className="text-[0.72em] font-extrabold text-ink-soft">
                      {players != null ? playerLabel(players) : hud.best > 0 ? "tvůj rekord" : "zatím bez rekordu"}
                    </span>
                    <span className="mt-[0.45em] flex w-full items-center gap-[0.3em] text-[0.72em] font-extrabold text-ink-soft">
                      {board[0] ? (
                        <>
                          <span className="truncate">👑 {board[0].name}</span>
                          <span className="ml-auto">{board[0].score}</span>
                        </>
                      ) : (
                        <span>buď první!</span>
                      )}
                    </span>
                  </button>
                </div>
              </div>

            </section>
          </div>
          <p className="pointer-events-none absolute inset-x-0 bottom-[0.6em] px-[1em] text-center text-[0.68em] font-extrabold leading-snug text-cream/90 [text-shadow:0_1px_2px_#241c16]">
            {previewStats ? "Náhled · " : ""}© Kopidlenská drbna | Camledian
          </p>
        </div>
      )}

      {hud.phase === "menu" && boardOpen && (
        <div
          className="absolute inset-0 z-30 flex items-end justify-center bg-ink/55 p-3 backdrop-blur-sm sm:items-center"
          onClick={() => setBoardOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Žebříček"
            className="menu-pop w-full max-w-sm rounded-[1.75rem] border-2 border-ink bg-cream p-5 shadow-[0_6px_0_#241c16]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-2xl">
                <Trophy className="size-6 text-gold" aria-hidden="true" /> Žebříček
              </h2>
              <button
                type="button"
                aria-label="Zavřít"
                className="flex size-9 items-center justify-center rounded-full border-2 border-ink bg-cream-deep"
                onClick={() => setBoardOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            {hud.best > 0 && (
              <p className="mt-1 text-sm font-extrabold text-ink-soft">
                Tvůj rekord: {hud.best}
                {hud.bestGossips > 0 ? ` · ${hud.bestGossips} drbů` : ""}
              </p>
            )}
            <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-ink/15 bg-cream-deep/60 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-extrabold tracking-wide text-ink-soft">HRAJEŠ JAKO</span>
                <span className="block truncate font-extrabold">{player?.name ?? "zatím nikdo"}</span>
              </span>
              <button
                type="button"
                className="h-10 shrink-0 rounded-xl border-2 border-ink bg-cream px-3 font-extrabold"
                onClick={() => {
                  setBoardOpen(false);
                  setPlayersOpen(true);
                }}
              >
                {player ? "Změnit hráče" : "Přidat hráče"}
              </button>
            </div>
            {board.length > 0 ? (
              <ol className="mt-4 space-y-1.5">
                {board.slice(0, 5).map((row, index) => (
                  <li
                    key={`${row.name}-${row.score}-${index}`}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 font-extrabold ${index === 0 ? "bg-gold/25" : "bg-cream-deep/70"}`}
                  >
                    <span className="w-6 text-center font-display text-lg">{["🥇", "🥈", "🥉"][index] ?? index + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{row.name}</span>
                    <span className="text-right">
                      {row.score}
                      {row.gossips > 0 && <span className="ml-1 text-xs text-ink-soft">· {row.gossips} drbů</span>}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm font-extrabold text-ink-soft">Zatím tu nikdo není. Buď první!</p>
            )}
            {players != null && <p className="mt-3 text-center text-xs font-extrabold text-ink-soft">{playerLabel(players)}</p>}
          </div>
        </div>
      )}

      {hud.phase === "menu" && whoOpen && (
        <WhoPlays
          profiles={profiles}
          onPlay={playAs}
          onAddAndPlay={addAndPlay}
          onManage={() => {
            setWhoOpen(false);
            setPlayersOpen(true);
          }}
          onClose={() => setWhoOpen(false)}
        />
      )}

      {hud.phase === "menu" && playersOpen && (
        <PlayersSheet
          profiles={profiles}
          onSelect={(id) => {
            updatePlayers(selectProfile(id));
            setPlayersOpen(false);
          }}
          onRename={(id, nextName) => {
            const next = renameProfile(id, nextName);
            updatePlayers(next);
            const renamed = next.list.find((p) => p.id === id);
            if (renamed) announceName(renamed);
          }}
          onAdd={(nextName) => updatePlayers(addProfile(nextName))}
          onRemove={(id) => updatePlayers(removeProfile(id))}
          onClose={() => setPlayersOpen(false)}
        />
      )}

      {hud.phase === "menu" && askName && (
        <div
          className="absolute inset-0 z-30 flex items-end justify-center bg-ink/55 p-3 backdrop-blur-sm sm:items-center"
          onClick={() => setAskName(false)}
        >
          {/* Deliberately not a <form>: Chrome's password manager treats a form with one text field and a button
              as the username step of a sign-in and shows its key/card/address bar above the keyboard. */}
          <div
            role="dialog"
            aria-label="Jak ti máme říkat?"
            className="menu-pop w-full max-w-sm rounded-[1.75rem] border-2 border-ink bg-cream p-5 text-center shadow-[0_6px_0_#241c16]"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={`${publicUrl("/game/portrait.webp")}?v=2`}
              alt=""
              className="mx-auto -mt-12 size-20 rounded-full border-4 border-cream bg-[radial-gradient(circle_at_50%_40%,#ffeef3_0%,#f6c9d6_100%)] object-cover shadow-lg ring-2 ring-ink"
            />
            <h2 className="mt-2 font-display text-2xl leading-tight">Jak ti máme říkat?</h2>
            <p className="mt-1 text-sm font-extrabold text-ink-soft">Pod tímhle jménem tě uvidí ostatní v žebříčku.</p>
            <div className="mt-4 flex gap-2">
              <NicknameField
                value={nameDraft}
                label="Přezdívka do žebříčku"
                placeholder="Přezdívka"
                className="h-12 min-w-0 flex-1 py-3"
                onChange={setNameDraft}
                onEnter={() => startPlaying(nameDraft)}
              />
              <button
                type="button"
                aria-label="Vymyslet jiné jméno"
                title="Vymyslet jiné jméno"
                className="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-gold shadow-[0_3px_0_#241c16] active:translate-y-[3px] active:shadow-none"
                onClick={() => setNameDraft(randomName())}
              >
                <Dices className="size-6" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => startPlaying(nameDraft)}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink bg-bow font-extrabold text-cream shadow-[0_4px_0_#241c16] active:translate-y-[4px] active:shadow-none"
            >
              <Play className="size-4 fill-current" /> {nameDraft.trim() ? `Hrát jako ${nameDraft.trim()}` : "Hrát s náhodným jménem"}
            </button>
            <p className="mt-2 text-xs font-extrabold text-ink-soft">Jméno změníš kdykoli v žebříčku.</p>
          </div>
        </div>
      )}

      {playing && (
        <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-4">
          <div className="pointer-events-auto rounded-3xl border-2 border-ink bg-cream/95 px-3 py-2">
            <p ref={scoreRef} className="font-display text-3xl leading-none" />
            <p ref={gossipRef} className="text-sm font-extrabold text-ink-soft" />
            {hud.scrollsTotal > 0 && (
              <div className="mt-1.5 w-36" aria-label={`Kronika ${hud.scrolls} z ${hud.scrollsTotal}, zbývá ${hud.scrollsTotal - hud.scrolls} neodemčených příběhů`}>
                <div className="flex items-center gap-1">
                  <span className="size-3 shrink-0 rounded-full border-2 border-ink bg-gold" aria-hidden="true" />
                  <span className="relative h-2.5 flex-1 overflow-hidden rounded-full border-2 border-ink bg-cream-deep">
                    <span
                      className="absolute inset-y-0 left-0 bg-gold"
                      style={{ width: `${Math.round((hud.scrolls / hud.scrollsTotal) * 100)}%` }}
                    />
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-extrabold text-ink-soft">
                  Kronika {hud.scrolls}/{hud.scrollsTotal}
                </p>
              </div>
            )}
          </div>
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <p ref={biomeRef} className="rounded-full border-2 border-ink bg-cream px-3 py-1 text-sm font-extrabold" />
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-full border-2 border-ink bg-cream"
                aria-label={hud.muted ? "Zapnout zvuk" : "Vypnout zvuk"}
                onClick={() => gameRef.current?.toggleMute()}
              >
                {hud.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </button>
              {hud.phase !== "over" && hud.phase !== "bonus" && hud.phase !== "dialogue" && hud.phase !== "fish-intro" && (
                <button
                  type="button"
                  className="flex size-11 items-center justify-center rounded-full border-2 border-ink bg-cream"
                  aria-label={hud.phase === "pause" ? "Pokračovat" : "Pauza"}
                  onClick={() => gameRef.current?.togglePause()}
                >
                  {hud.phase === "pause" ? <Play className="size-5" /> : <Pause className="size-5" />}
                </button>
              )}
            </div>
            <div className="flex gap-1" aria-label={`Klid: ${hud.lives}`}>
              {Array.from({ length: Math.max(3, hud.lives) }, (_, i) => (
                <Heart key={i} className={i < hud.lives ? "size-6 fill-bow text-bow" : "size-6 text-ink/25"} />
              ))}
            </div>
          </div>
        </header>
      )}

      {hud.phase === "play" && (hud.fact || (hud.showTale && hud.line)) && (
        // A new story and a mishap can come at once: both cards stay readable, the story on top.
        <div className="pointer-events-none absolute inset-x-0 top-40 z-10 mx-auto flex w-[min(100%-1.5rem,32rem)] flex-col gap-2 sm:top-36">
          {hud.fact && (
            <article
              className="rounded-3xl border-[3px] border-gold bg-cream px-4 py-3 shadow-[0_0_0_4px_rgba(232,163,23,0.22),0_12px_26px_rgba(32,27,20,0.2)]"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <BookOpen className="mt-0.5 size-7 shrink-0 text-bow" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-extrabold tracking-wide text-bow">{hud.factLabel || "Nové tajemství odhaleno!"}</p>
                  <h2 className="mt-0.5 font-display text-xl leading-tight">{hud.fact.title}</h2>
                  <p className="mt-1 text-sm font-bold leading-snug text-ink-soft">
                    {hud.factComplete ? hud.fact.text : "Nový příběh čeká v kronice."}
                  </p>
                  {hud.fact.title && hud.factComplete && (
                    <p className="mt-2 inline-flex items-center rounded-full border border-gold/70 bg-gold/15 px-3 py-1 text-sm font-extrabold text-ink">
                      +16 bodů za pergamen
                    </p>
                  )}
                </div>
              </div>
            </article>
          )}
          {hud.showTale && hud.line && (
            <article
              className={`rounded-3xl border-[3px] border-bow bg-cream shadow-[0_0_0_4px_rgba(228,87,122,0.18),0_12px_26px_rgba(32,27,20,0.2)] ${hud.fact ? "px-4 py-2" : "px-4 py-3"}`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <MessageCircle className={`mt-0.5 shrink-0 text-bow ${hud.fact ? "size-6" : "size-7"}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-extrabold tracking-wide text-bow">{hud.taleTag}</p>
                  <h2 className={`mt-0.5 font-display leading-tight ${hud.fact ? "text-lg" : "text-xl"}`}>{hud.taleTitle || "Drběnina příhoda"}</h2>
                  <p className="mt-1 text-sm font-bold leading-snug text-ink-soft">{hud.line}</p>
                </div>
              </div>
            </article>
          )}
        </div>
      )}

      {hud.coach && !hud.fact && !hud.showTale && hud.phase === "play" && (
        <p className="pointer-events-none absolute inset-x-3 top-40 text-center text-sm font-extrabold text-ink sm:top-36">
          <span className="rounded-full border-2 border-ink bg-cream/95 px-4 py-2">
            {keyboard ? "Mezerník = skok. Šipka dolů = pokrč se." : "Klepni = skok. Táhni dolů = pokrč se."}
          </span>
        </p>
      )}

      {hud.phase === "dialogue" && (hud.stagDialogue || hud.fishDialogue !== null) && (
        <FitOverlay
          testId={hud.stagDialogue ? "stag-dialogue" : "fish-dialogue"}
          className="z-30 bg-ink/20"
          fitKey={hud.stagDialogue?.step ?? "fish"}
        >
          <section
            role="dialog"
            aria-label={hud.stagDialogue ? "Setkání s bílým jelenem" : "Ryba z rybníka"}
            className="w-full max-w-md rounded-3xl border-[3px] border-gold bg-cream p-5 text-ink shadow-xl sm:p-6"
          >
            {hud.stagDialogue ? (
              <>
                <p className="text-xs font-extrabold tracking-widest text-bow">
                  {hud.stagDialogue.chapter
                    ? `SETKÁNÍ ${hud.stagDialogue.chapter} Z ${hud.stagDialogue.chapters}`
                    : "DALŠÍ POVÍDÁNÍ V OBOŘE"}
                </p>
                <h2 className="mt-1 font-display text-xl leading-tight text-bow">{hud.stagDialogue.title}</h2>
              </>
            ) : (
              <p className="text-xs font-extrabold tracking-widest text-bow">U KOPIDLENSKÉHO RYBNÍKA</p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl leading-tight">
                {hud.stagDialogue?.speaker ?? "Ryba z rybníka"}
              </h2>
              {hud.stagDialogue && (
                <span className="shrink-0 text-xs font-extrabold text-ink-soft">
                  {hud.stagDialogue.step}/{hud.stagDialogue.total}
                </span>
              )}
            </div>
            <p className="mt-3 min-h-16 text-lg font-semibold leading-snug" aria-live="polite">
              {hud.stagDialogue?.text ?? hud.fishDialogue}
            </p>
            {hud.stagDialogue ? (
              <div className="mt-5 grid grid-cols-[1fr_2fr] gap-2">
                <button
                  type="button"
                  className="flex min-h-12 items-center justify-center rounded-full border-2 border-ink bg-cream-deep px-3 text-sm font-extrabold"
                  onClick={() => gameRef.current?.advanceStagDialogue(true)}
                >
                  Přeskočit
                </button>
                <button
                  type="button"
                  className="flex min-h-12 items-center justify-center rounded-full border-2 border-ink bg-bow px-3 text-base font-extrabold text-cream"
                  onClick={() => gameRef.current?.advanceStagDialogue()}
                >
                  {hud.stagDialogue.step === hud.stagDialogue.total ? "Pokračovat v běhu" : "Dál"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full border-2 border-ink bg-bow px-3 text-base font-extrabold text-cream"
                onClick={() => gameRef.current?.continueFishDialogue()}
              >
                Pokračovat
              </button>
            )}
            <p className="mt-3 text-center text-[11px] font-semibold text-ink-soft">
              {hud.stagDialogue ? "Mezerník nebo Enter = dál · Esc = přeskočit" : "Mezerník nebo Enter = pokračovat"}
            </p>
          </section>
        </FitOverlay>
      )}

      {hud.phase === "pause" && (
        <FitOverlay testId="pause" className="bg-ink/30">
          <section className="w-full max-w-sm rounded-3xl border-2 border-ink bg-cream p-6 text-center">
            <h2 className="font-display text-4xl">Pauza</h2>
            <p className="mt-2 text-ink-soft">Drby počkají. Kopidlno nikam neuteče.</p>
            <button
              type="button"
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-bow font-extrabold text-cream"
              onClick={() => gameRef.current?.togglePause()}
            >
              <Play className="size-5" /> Pokračovat
            </button>
            <button
              type="button"
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-cream-deep font-extrabold"
              onClick={() => openChronicle()}
            >
              <BookOpen className="size-5" /> Kronika {bookProgress.known}/{bookProgress.total}
            </button>
          </section>
        </FitOverlay>
      )}

      {hud.phase === "over" && (
        <FitOverlay
          testId="over"
          className="bg-ink/35"
          fitKey={`${hud.line}:${hud.score}:${hud.chronicleNew}:${players}:${copied}:${player?.name ?? ""}:${JSON.stringify(board)}`}
        >
          <section className="w-full max-w-sm rounded-3xl border-2 border-ink bg-cream p-6 text-center">
            <p className="text-sm font-extrabold text-bow">Příhoda</p>
            <h2 className="mt-1 whitespace-nowrap font-display text-[clamp(1rem,5vw,1.625rem)] leading-none">Drběna se nevzdává!</h2>
            <p className="mt-2 text-ink-soft">{hud.line}</p>
            <p className="mt-4 font-display text-5xl leading-none">{hud.score}</p>
            <p className="mt-1 font-extrabold">
              {hud.gossips} drbů
              {hud.newBest ? " · nový rekord" : hud.best > 0 ? ` · rekord ${hud.best}` : ""}
            </p>
            <div className="mt-3 rounded-2xl border-2 border-gold bg-cream-deep/70 p-3 text-left">
              <div className="flex items-center gap-2">
                <BookOpen className="size-6 shrink-0 text-bow" aria-hidden="true" />
                <p className="font-display text-lg leading-tight">
                  {hud.chronicleNew === 1
                    ? "Drběna našla nový příběh!"
                    : hud.chronicleNew > 1 && hud.chronicleNew < 5
                      ? `Drběna našla ${hud.chronicleNew} nové příběhy!`
                      : hud.chronicleNew >= 5
                        ? `Drběna našla ${hud.chronicleNew} nových příběhů!`
                        : bookProgress.known === bookProgress.total
                          ? "Kronika je kompletní!"
                          : "Další tajemství čekají na objevení!"}
                </p>
              </div>
              <p className="mt-1 text-sm font-extrabold text-ink-soft">
                Už znáš {bookProgress.known} z {bookProgress.total} příběhů Kopidlna.
              </p>
              <button
                type="button"
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-gold font-extrabold"
                onClick={() => openChronicle(hud.chronicleNew > 0)}
              >
                {hud.chronicleNew > 0 ? "Prohlédnout nové příběhy" : "Otevřít kroniku"}
              </button>
            </div>
            {players != null && <p className="mt-2 text-sm font-extrabold text-ink-soft">{playerLabel(players)}</p>}
            {board.length > 0 && (() => {
              // The board keeps each player's best score under their current nickname.
              const mine = player ? board.findIndex((row) => row.name === player.name && row.score === hud.best) : -1;
              const shown = board.slice(0, 5).map((row, index) => ({ row, index }));
              if (mine >= 5) shown.push({ row: board[mine]!, index: mine });
              const gap = mine > 0 ? board[mine - 1]!.score - hud.best + 1 : board.length >= 10 && mine < 0 ? board[9]!.score - hud.best + 1 : 0;
              return (
                <>
                  {mine >= 0 ? (
                    <p className="mt-2 text-sm font-extrabold text-bow">
                      {mine === 0 ? "Vedeš celý žebříček!" : `Jsi ${mine + 1}. v žebříčku. Na ${mine}. místo ti chybí ${gap} ${gap === 1 ? "bod" : gap < 5 ? "body" : "bodů"}.`}
                    </p>
                  ) : gap > 0 ? (
                    <p className="mt-2 text-sm font-extrabold text-bow">
                      Do první desítky ti chybí {gap} {gap === 1 ? "bod" : gap < 5 ? "body" : "bodů"}.
                    </p>
                  ) : null}
                  <ol className="mt-2 text-left text-sm font-extrabold">
                    {shown.map(({ row, index }) => (
                      <li
                        key={`${row.name}-${row.score}-${index}`}
                        className={`flex justify-between gap-3 rounded-lg px-1.5 ${index === mine ? "bg-gold/25" : ""} ${index === mine && mine >= 5 ? "mt-1 border-t border-dashed border-ink/25 pt-1" : ""}`}
                      >
                        <span>
                          {index + 1}. {row.name}
                        </span>
                        <span>{row.score}</span>
                      </li>
                    ))}
                  </ol>
                </>
              );
            })()}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-ink bg-bow font-extrabold text-cream"
                onClick={() => gameRef.current?.begin()}
              >
                <RotateCcw className="size-4" /> Znovu
              </button>
              <button
                type="button"
                className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-ink bg-cream font-extrabold"
                onClick={() => void share()}
              >
                <Share2 className="size-4" /> {copied ? "Hotovo" : "Sdílet"}
              </button>
            </div>

            <a
              href="https://www.kopidlenskadrbna.org"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm font-extrabold text-bow underline"
            >
              www.kopidlenskadrbna.org
            </a>
          </section>
        </FitOverlay>
      )}

      {hud.phase === "bonus" && hud.bonus && (
        <FitOverlay
          testId="bonus"
          className="z-30 bg-ink/40"
          fitKey={`${hud.bonus.id}:${hud.bonus.stage}:${hud.bonus.wrong}:${hud.bonus.id === "alarm" ? hud.bonus.note : hud.bonus.success}:${hud.bonusLife}:${hud.lives}`}
        >
          <BonusCard bonus={hud.bonus} lives={hud.lives} gained={hud.bonusLife} onAct={(action) => gameRef.current?.bonusAct(action)} />
        </FitOverlay>
      )}

      {hud.phase === "play" && !keyboard && (
        <div className="absolute inset-x-0 bottom-3 flex items-end justify-between gap-3 px-3 sm:bottom-4 sm:justify-end">
          <button
            type="button"
            className="flex h-20 min-w-36 items-center justify-center rounded-full border-2 border-ink bg-cream px-5 text-lg font-extrabold"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              gameRef.current?.pressDuck(true);
            }}
            onPointerUp={(event) => {
              event.stopPropagation();
              gameRef.current?.pressDuck(false);
            }}
            onPointerCancel={() => gameRef.current?.pressDuck(false)}
          >
            Pokrčit
          </button>
          <button
            type="button"
            className="flex h-20 min-w-36 items-center justify-center rounded-full border-2 border-ink bg-bow px-5 text-lg font-extrabold text-cream"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              gameRef.current?.pressJump(true);
            }}
            onPointerUp={(event) => {
              event.stopPropagation();
              gameRef.current?.pressJump(false);
            }}
            onPointerCancel={() => gameRef.current?.pressJump(false)}
          >
            Skok
          </button>
        </div>
      )}
      {chronicle && <ChronicleBook startAtNewest={chronicleNewFirst} onClose={() => setChronicle(false)} />}
    </main>
  );
}

function BonusCard({
  bonus,
  lives,
  gained,
  onAct,
}: {
  bonus: NonNullable<Hud["bonus"]>;
  lives: number;
  gained: boolean;
  onAct: (action: BonusAction) => void;
}) {
  if (bonus.id === "alarm") return <AlarmCard bonus={bonus} lives={lives} gained={gained} onAct={onAct} />;
  return (
    <section className="bonus-fit w-full max-w-[28em] rounded-[1.5em] border-2 border-ink bg-cream p-[1em] text-center shadow-lg sm:p-[1.5em]">
      <p className="text-[0.75em] font-extrabold tracking-wide text-bow">Ryba z rybníka</p>
      <h2 className="mt-[0.25em] leading-none">
        <span className="font-display text-[2.25em]">{bonus.title}</span>
      </h2>
      {bonus.stage !== "done" && (
        <p className="mt-[0.75em]">
          <span className="text-[0.875em] leading-snug text-ink-soft">{bonus.prompt}</span>
        </p>
      )}
      {bonus.stage === "offer" && (
        <div className="mt-[1.25em] grid grid-cols-2 gap-[0.5em]">
          <button
            type="button"
            className="flex h-[3.5em] items-center justify-center rounded-full border-2 border-ink bg-bow font-extrabold text-cream"
            onClick={() => onAct({ type: "play" })}
          >
            <span className="text-[1.125em]">Hrát</span>
          </button>
          <button
            type="button"
            className="flex h-[3.5em] items-center justify-center rounded-full border-2 border-ink bg-cream font-extrabold"
            onClick={() => onAct({ type: "decline" })}
          >
            <span className="text-[1.125em]">Ne, díky</span>
          </button>
        </div>
      )}
      {bonus.stage === "play" && (
        <>
          <div className="mt-[1em] flex flex-col gap-[0.5em]">
            {bonus.cards.map((card, index) => (
              <button
                key={`${card}-${index}`}
                type="button"
                aria-pressed={bonus.picked === index}
                className={`rounded-[0.75em] border-2 px-[0.75em] py-[0.3em] text-left font-extrabold leading-snug ${
                  bonus.picked === index ? "border-ink bg-gold" : "border-ink bg-[#fff8ea]"
                }`}
                onClick={() => onAct({ type: "pick", index })}
              >
                <span className="text-[1em] sm:text-[1.125em]">{card}</span>
              </button>
            ))}
          </div>
          <p className="mt-[0.75em]">
            <span className="text-[0.75em] font-extrabold text-ink-soft">Klepni na dvě kartičky a prohoď je.</span>
          </p>
          {bonus.wrong && (
            <p className="mt-[0.5em]">
              <span className="text-[0.875em] font-extrabold text-bow">{bonus.wrong}</span>
            </p>
          )}
          <button
            type="button"
            className="mt-[1em] flex h-[3.5em] w-full items-center justify-center rounded-full border-2 border-ink bg-bow font-extrabold text-cream"
            onClick={() => onAct({ type: "check" })}
          >
            <span className="text-[1.125em]">Zkontrolovat</span>
          </button>
          <button
            type="button"
            className="mt-[0.5em] flex h-[3em] w-full items-center justify-center rounded-full border-2 border-ink bg-cream font-extrabold"
            onClick={() => onAct({ type: "skip" })}
          >
            Přeskočit
          </button>
        </>
      )}
      {bonus.stage === "done" && (
        <>
          <p className="mt-[0.75em]">
            <span className="text-[0.875em] leading-snug">{bonus.success}</span>
          </p>
          <p className="mt-[0.75em] leading-none text-bow">
            <span className="font-display text-[2.25em]">+{bonus.reward}</span>
          </p>
          <LifeReward lives={lives} gained={gained} />
          <button
            type="button"
            className="mt-[1.25em] flex h-[3.5em] w-full items-center justify-center rounded-full border-2 border-ink bg-bow font-extrabold text-cream"
            onClick={() => onAct({ type: "continue" })}
          >
            <span className="text-[1.125em]">Pokračovat</span>
          </button>
        </>
      )}
    </section>
  );
}

function LifeReward({ lives, gained }: { lives: number; gained: boolean }) {
  return (
    <div className="mt-[0.5em]">
      <div className="flex items-center justify-center gap-[0.25em]" aria-label={gained ? BONUS_PARDON : `Klid: ${lives}`}>
        {Array.from({ length: Math.max(3, lives) }, (_, i) => (
          <Heart
            key={i}
            className={`size-[1.75em] ${i < lives ? "fill-bow text-bow" : "text-ink/25"} ${gained && i === lives - 1 ? "scale-125" : ""}`}
          />
        ))}
      </div>
      <p className={`mt-[0.25em] font-extrabold ${gained ? "text-bow" : "text-ink-soft"}`}>{gained ? BONUS_PARDON : BONUS_CALM}</p>
    </div>
  );
}
