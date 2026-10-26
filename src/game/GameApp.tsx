import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Heart, Pause, Play, RotateCcw, Share2, Volume2, VolumeX } from "lucide-react";
import { AlarmCard } from "@/game/GoatAlarmScene";
import { ChronicleBook } from "@/game/ChronicleBook";
import { FitOverlay } from "@/game/FitOverlay";
import { Runner, emptyHud, type Hud } from "@/game/runner";
import { chronicleBook } from "@/game/chronicle";
import { BONUS_CALM, BONUS_PARDON, type BonusAction } from "@/game/minigames";
import { fetchStats, playerLabel, previewStats, saveName, savedName, type BoardRow } from "@/game/plays";
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
    h.chronicleNew,
    h.scrolls,
    h.scrollsTotal,
    h.newBest ? 1 : 0,
    h.muted ? 1 : 0,
    h.coach ? 1 : 0,
    h.showTale ? 1 : 0,
    h.line,
    h.taleTag,
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
  const [name, setName] = useState(savedName);
  const [chronicle, setChronicle] = useState(false);
  const [chronicleNewFirst, setChronicleNewFirst] = useState(false);
  // Recompute saved progress when the game phase or the number of new entries changes.
  const bookProgress = useMemo(() => chronicleBook(), [hud.phase, hud.chronicleNew]);

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

  const playing = hud.phase === "play" || hud.phase === "pause" || hud.phase === "over" || hud.phase === "bonus" || hud.phase === "dialogue";

  return (
    <main className="relative h-dvh w-full touch-none overflow-hidden bg-day text-ink select-none">
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
              alt="Kopidlnenská drbna"
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
        <div ref={menuRef}
          className="menu-fit absolute inset-0 overflow-hidden bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" onClick={() => gameRef.current?.begin()}>
          <div className="flex h-full min-h-0 items-center justify-center px-[1em] py-[0.5em] sm:px-[1.5em] sm:py-[0.75em]">
            <section ref={menuContentRef} className="w-full max-w-[24em] shrink-0 text-center">
              <img
                src={publicUrl("/game/portrait.webp")}
                alt="Drběna, černobílá koza s růžovou mašlí"
                className="mx-auto size-[6em] rounded-full border-4 border-cream bg-ink object-cover shadow-lg"
              />
              <p className="mt-[0.75em]">
                <span className="text-[0.75em] font-extrabold tracking-[0.22em] text-cream [text-shadow:0_2px_0_#241c16]">KOPIDLNO</span>
              </p>
              <h1 className="mt-[0.15em] text-cream [text-shadow:0_3px_0_#241c16]">
                <span className="block font-display text-[3.75em] leading-[0.85]">Drběna</span>
                <span className="block font-display text-[1.875em] leading-none text-bow [text-shadow:0_2px_0_#241c16]">sbírá drby</span>
              </h1>
              <p className="mt-[0.5em]">
                <span className="text-[0.75em] font-extrabold text-cream/90 [text-shadow:0_1px_0_#241c16]">
                  ♪ za doprovodu Esmeraldy od Františka Matěje Hilmara
                </span>
              </p>
              <button
                type="button"
                className="mx-auto mt-[1em] flex h-[3.5em] w-full max-w-[20em] items-center justify-center rounded-full border-2 border-ink bg-bow font-extrabold text-cream"
                onClick={(event) => {
                  event.stopPropagation();
                  gameRef.current?.begin();
                }}
              >
                <span className="text-[1.25em]">Vyrazit</span>
              </button>
              <p className="mt-[0.65em]">
                <span className="text-[0.875em] font-extrabold text-cream [text-shadow:0_1px_0_#241c16]">Klepni a skoč. Táhni dolů a pokrč se.</span>
              </p>
              <button
                type="button"
                className="mx-auto mt-[0.45em] text-[0.8em] font-extrabold text-cream/80 underline decoration-cream/40 underline-offset-4 [text-shadow:0_1px_0_#241c16]"
                onClick={(event) => {
                  event.stopPropagation();
                  gameRef.current?.beginAtStag();
                }}
              >
                K jelenovi
              </button>
              {hud.best > 0 && (
                <p className="mt-[0.25em]">
                  <span className="text-[0.875em] font-extrabold text-gold [text-shadow:0_1px_0_#241c16]">
                    Rekord {hud.best}
                    {hud.bestGossips > 0 ? ` · ${hud.bestGossips} drbů` : ""}
                  </span>
                </p>
              )}
              <button
                type="button"
                className="mx-auto mt-[0.75em] flex w-full max-w-[20em] items-center gap-[0.7em] rounded-[1.25em] border-[3px] border-gold bg-cream/95 px-[0.8em] py-[0.7em] text-left text-ink shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-4 focus-visible:outline-bow"
                onClick={(event) => {
                  event.stopPropagation();
                  openChronicle();
                }}
              >
                <BookOpen className="size-[2.2em] shrink-0 text-bow" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 font-display text-[1.15em] leading-tight">
                    <span>Kronika Kopidlna</span>
                    <span className="shrink-0 text-[0.85em]">{bookProgress.known}/{bookProgress.total}</span>
                  </span>
                  <span className="mt-[0.1em] block text-[0.75em] font-extrabold text-ink-soft">
                    Objev {bookProgress.total} příběhů a tajemství Kopidlna!
                  </span>
                  <span className="mt-[0.4em] block h-[0.45em] overflow-hidden rounded-full border border-ink/30 bg-cream-deep">
                    <span
                      className="block h-full rounded-full bg-gold"
                      style={{ width: `${bookProgress.total ? (bookProgress.known / bookProgress.total) * 100 : 0}%` }}
                    />
                  </span>
                </span>
              </button>
              {players != null && (
                <p className="mt-[0.25em]">
                  <span className="text-[0.875em] font-extrabold text-cream [text-shadow:0_1px_0_#241c16]">{playerLabel(players)}</span>
                </p>
              )}
              {players != null && (
                <label className="mx-auto mt-[0.65em] block max-w-[20em] text-left" onClick={(event) => event.stopPropagation()}>
                  <span className="text-[0.75em] font-extrabold tracking-wide text-cream [text-shadow:0_1px_0_#241c16]">Jméno do žebříčku</span>
                  <input
                    value={name}
                    maxLength={16}
                    placeholder="Drběna"
                    className="mt-[0.25em] h-[2.5em] w-full rounded-full border-2 border-ink bg-cream px-[1em] font-extrabold text-ink outline-none"
                    onChange={(event) => {
                      setName(event.target.value);
                      saveName(event.target.value);
                    }}
                  />
                </label>
              )}
              {board.length > 0 && (
                <ol className="mx-auto mt-[0.65em] w-full max-w-[20em] rounded-[1.5em] border-2 border-ink bg-cream/95 px-[1em] py-[0.4em] text-left font-extrabold">
                  {board.slice(0, 5).map((row, index) => (
                    <li key={`${row.name}-${row.score}-${index}`} className="flex justify-between gap-[0.75em] py-[0.1em] text-[0.875em]">
                      <span>
                        {index + 1}. {row.name}
                      </span>
                      <span>
                        {row.score}
                        {row.gossips > 0 ? ` · ${row.gossips}` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {previewStats && (
                <p className="mt-[0.25em]">
                  <span className="text-[0.75em] font-extrabold text-cream/80 [text-shadow:0_1px_0_#241c16]">Náhled, ještě to není venku</span>
                </p>
              )}
              <p className="mt-[0.65em]">
                <span className="text-[0.7em] font-extrabold tracking-wide text-cream/75 [text-shadow:0_1px_0_#241c16]">© Kopidlenská drbna | Camledian</span>
              </p>
            </section>
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
              {hud.phase !== "over" && hud.phase !== "bonus" && hud.phase !== "dialogue" && (
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

      {hud.showTale && hud.line && hud.phase === "play" && (
        <article className="pointer-events-none absolute inset-x-0 top-40 z-10 mx-auto w-[min(100%-1.5rem,32rem)] rounded-3xl border-2 border-ink bg-cream px-4 py-3 shadow-lg sm:top-36">
          <p className="text-xs font-extrabold tracking-wide text-bow">{hud.taleTag}</p>
          <p className="mt-1 text-sm leading-snug">{hud.line}</p>
        </article>
      )}

      {hud.fact && !hud.showTale && hud.phase === "play" && (
        <article
          className="pointer-events-none absolute inset-x-0 top-40 z-10 mx-auto w-[min(100%-1.5rem,32rem)] rounded-3xl border-[3px] border-gold bg-cream px-4 py-3 shadow-[0_0_0_4px_rgba(232,163,23,0.22),0_12px_26px_rgba(32,27,20,0.2)] sm:top-36"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="size-6 shrink-0 text-bow" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-extrabold tracking-wide text-bow">{hud.factLabel || "Nové tajemství odhaleno!"}</p>
              <h2 className="font-display text-xl leading-tight">{hud.fact.title}</h2>
              <p className="mt-1 text-sm font-bold text-ink-soft">Nový příběh čeká v kronice.</p>
            </div>
          </div>
        </article>
      )}

      {hud.coach && !hud.fact && !hud.showTale && hud.phase === "play" && (
        <p className="pointer-events-none absolute inset-x-3 top-40 text-center text-sm font-extrabold text-ink sm:top-36">
          <span className="rounded-full border-2 border-ink bg-cream/95 px-4 py-2">
            Klepni = skok. Táhni dolů = pokrč se.
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
          fitKey={`${hud.line}:${hud.score}:${hud.chronicleNew}:${players}:${copied}:${JSON.stringify(board)}`}
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
            {board.length > 0 && (
              <ol className="mt-3 text-left text-sm font-extrabold">
                {board.slice(0, 5).map((row, index) => (
                  <li key={`${row.name}-${row.score}-${index}`} className="flex justify-between gap-3">
                    <span>
                      {index + 1}. {row.name}
                    </span>
                    <span>{row.score}</span>
                  </li>
                ))}
              </ol>
            )}
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

      {hud.phase === "play" && (
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
