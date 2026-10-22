import { useEffect, useRef, useState } from "react";
import { Heart, Pause, Play, RotateCcw, Share2, Volume2, VolumeX } from "lucide-react";
import { Runner, emptyHud, type Hud } from "@/game/runner";
import { publicUrl } from "@/lib/public-url";

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Runner | null>(null);
  const [hud, setHud] = useState<Hud>(emptyHud);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Runner(canvas, setHud);
    gameRef.current = game;
    game.start();
    return () => game.destroy();
  }, []);

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

  const playing = hud.phase === "play" || hud.phase === "pause" || hud.phase === "over";

  return (
    <main className="relative h-dvh w-full touch-none overflow-hidden bg-day text-ink select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-label="Hra Drběna sbírá drby" />

      {(hud.phase === "loading" || hud.phase === "splash") && (
        <div
          className="absolute inset-0 z-20 flex cursor-pointer items-center justify-center overflow-hidden"
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
              alt="www.kopidlnenskadrbna.cz"
              className="z-20 -mt-[9%] w-[84%] rotate-1 drop-shadow-[0_8px_12px_rgba(36,28,22,0.3)]"
            />
            <p className="mt-3 text-sm font-extrabold tracking-wide text-[#3d2c22]/75">Klepni a pokračuj</p>
          </div>
        </div>
      )}

      {hud.phase === "menu" && (
        <div
          className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-ink/80 via-ink/20 to-transparent p-4 pb-6 sm:p-8"
          onClick={() => gameRef.current?.begin()}
        >
          <section className="w-full max-w-sm text-center">
            <img
              src={publicUrl("/game/portrait.webp")}
              alt="Drběna, černobílá koza s růžovou mašlí"
              className="mx-auto size-24 rounded-full border-4 border-cream bg-ink object-cover shadow-lg sm:size-28"
            />
            <p className="mt-3 text-xs font-extrabold tracking-[0.22em] text-cream [text-shadow:0_2px_0_#241c16]">
              KOPIDLNO
            </p>
            <h1 className="font-display text-6xl leading-[0.85] text-cream [text-shadow:0_3px_0_#241c16] sm:text-7xl">
              Drběna
              <span className="mt-1 block text-3xl text-bow [text-shadow:0_2px_0_#241c16] sm:text-4xl">sbírá drby</span>
            </h1>
            <button
              type="button"
              className="mx-auto mt-5 flex h-14 w-full max-w-xs items-center justify-center rounded-full border-2 border-ink bg-bow text-xl font-extrabold text-cream"
              onClick={(event) => {
                event.stopPropagation();
                gameRef.current?.begin();
              }}
            >
              Vyrazit
            </button>
            <p className="mt-3 text-sm font-extrabold text-cream [text-shadow:0_1px_0_#241c16]">
              Klepni a skoč. Táhni dolů a pokrč se.
            </p>
            {hud.best > 0 && (
              <p className="mt-1 text-sm font-extrabold text-gold [text-shadow:0_1px_0_#241c16]">
                Rekord {hud.best}
                {hud.bestGossips > 0 ? ` · ${hud.bestGossips} drbů` : ""}
              </p>
            )}
          </section>
        </div>
      )}

      {playing && (
        <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-4">
          <div className="pointer-events-auto rounded-3xl border-2 border-ink bg-cream/95 px-3 py-2">
            <p className="font-display text-3xl leading-none">{hud.score}</p>
            <p className="text-sm font-extrabold text-ink-soft">
              {hud.gossips} drbů{hud.combo > 1 ? ` · ×${hud.combo}` : ""}
            </p>
            <div className="mt-1 flex gap-1" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={i < hud.pips ? "size-1.5 rounded-full bg-gold" : "size-1.5 rounded-full bg-ink/15"} />
              ))}
            </div>
          </div>
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <p className="rounded-full border-2 border-ink bg-cream px-3 py-1 text-sm font-extrabold">{hud.biome}</p>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-full border-2 border-ink bg-cream"
                aria-label={hud.muted ? "Zapnout zvuk" : "Vypnout zvuk"}
                onClick={() => gameRef.current?.toggleMute()}
              >
                {hud.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </button>
              {hud.phase !== "over" && (
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
            <div className="flex gap-1" aria-label={`Životy: ${hud.lives}`}>
              {[0, 1, 2].map((i) => (
                <Heart key={i} className={i < hud.lives ? "size-6 fill-bow text-bow" : "size-6 text-ink/25"} />
              ))}
            </div>
          </div>
        </header>
      )}

      {hud.fact && hud.phase === "play" && (
        <article className="pointer-events-none absolute inset-x-0 top-28 z-10 mx-auto w-[min(100%-1.5rem,32rem)] rounded-3xl border-2 border-ink bg-cream px-4 py-3 shadow-lg sm:top-24">
          <p className="text-xs font-extrabold tracking-wide text-bow">Drb z Kopidlna</p>
          <h2 className="font-display text-xl leading-tight">{hud.fact.title}</h2>
          <p className="mt-1 text-sm leading-snug text-ink-soft">{hud.fact.text}</p>
        </article>
      )}

      {hud.coach && !hud.fact && hud.phase === "play" && (
        <p className="pointer-events-none absolute inset-x-3 top-28 text-center text-sm font-extrabold text-ink sm:top-24">
          <span className="rounded-full border-2 border-ink bg-cream/95 px-4 py-2">
            Klepni = skok. Táhni dolů = pokrč se.
          </span>
        </p>
      )}

      {hud.phase === "pause" && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/30 p-4">
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
          </section>
        </div>
      )}

      {hud.phase === "over" && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/35 p-4">
          <section className="w-full max-w-sm rounded-3xl border-2 border-ink bg-cream p-6 text-center">
            <p className="text-sm font-extrabold text-bow">Konec kola</p>
            <h2 className="mt-1 font-display text-4xl leading-none">Drby došly</h2>
            <p className="mt-2 text-ink-soft">{hud.line}</p>
            <p className="mt-4 font-display text-5xl leading-none">{hud.score}</p>
            <p className="mt-1 font-extrabold">
              {hud.gossips} drbů
              {hud.newBest ? " · nový rekord" : hud.best > 0 ? ` · rekord ${hud.best}` : ""}
            </p>
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
          </section>
        </div>
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
    </main>
  );
}
