import { Heart } from "lucide-react";
import { BONUS_CALM, BONUS_PARDON, type AlarmHud, type BonusAction } from "@/game/minigames";

export function AlarmCard({
  bonus,
  lives,
  gained,
  onAct,
}: {
  bonus: AlarmHud;
  lives: number;
  gained: boolean;
  onAct: (action: BonusAction) => void;
}) {
  if (bonus.stage === "offer") {
    return (
      <section className="bonus-fit w-full max-w-[28em] rounded-[1.5em] border-2 border-ink bg-cream p-[1em] text-center shadow-lg sm:p-[1.5em]">
        <p className="text-[0.75em] font-extrabold tracking-wide text-bow">Ryba z rybníka</p>
        <h2 className="mt-[0.25em] leading-none">
          <span className="font-display text-[2.25em]">{bonus.title}</span>
        </h2>
        <p className="mt-[0.75em]">
          <span className="text-[0.875em] leading-snug text-ink-soft">{bonus.prompt}</span>
        </p>
        <div className="mt-[1.25em] grid grid-cols-2 gap-[0.5em]">
          <button type="button" className="flex h-[3.5em] items-center justify-center rounded-full border-2 border-ink bg-bow font-extrabold text-cream" onClick={() => onAct({ type: "play" })}>
            <span className="text-[1.125em]">Hrát</span>
          </button>
          <button type="button" className="flex h-[3.5em] items-center justify-center rounded-full border-2 border-ink bg-cream font-extrabold" onClick={() => onAct({ type: "decline" })}>
            <span className="text-[1.125em]">Ne, díky</span>
          </button>
        </div>
      </section>
    );
  }
  const ended = bonus.stage === "done";
  return (
    <section className="bonus-fit w-full max-w-[32em] rounded-[1.5em] border-2 border-ink bg-[#172033] p-[0.75em] text-center text-cream shadow-lg">
      <p className="text-[0.75em] font-extrabold tracking-wide text-gold">Noční Kopidlno</p>
      <h2 className="leading-none text-cream">
        <span className="font-display text-[1.875em]">{bonus.title}</span>
      </h2>
      <button
        type="button"
        className="mt-[0.5em] block w-full rounded-[1em]"
        aria-label={`Klepni ve zlatém poli. Rozsvíceno ${bonus.windows} z ${bonus.goal} oken.`}
        onClick={() => {
          if (!ended) onAct({ type: "tap" });
        }}
      >
        <AlarmScene bonus={bonus} />
      </button>
      <p className="mt-[0.5em] min-h-[2.5em]">
        <span className="text-[0.875em] font-extrabold leading-snug text-[#f6e7c1]">{bonus.note}</span>
      </p>
      {!ended && (
        <button type="button" className="mt-[0.5em] flex h-[2.75em] w-full items-center justify-center rounded-full border-2 border-cream/70 font-extrabold" onClick={() => onAct({ type: "skip" })}>
          Přeskočit
        </button>
      )}
      {ended && (
        <>
          {!bonus.failed && (
            <p className="mt-[0.25em] leading-none text-gold">
              <span className="font-display text-[2.25em]">+{bonus.reward}</span>
            </p>
          )}
          {!bonus.failed && (
            <div className="mt-[0.5em]">
              <div className="flex items-center justify-center gap-[0.25em]" aria-label={gained ? BONUS_PARDON : `Klid: ${lives}`}>
                {Array.from({ length: Math.max(3, lives) }, (_, i) => (
                  <Heart key={i} className={`size-[1.75em] ${i < lives ? "fill-bow text-bow" : "text-cream/30"} ${gained && i === lives - 1 ? "scale-125" : ""}`} />
                ))}
              </div>
              <p className={`mt-[0.25em] font-extrabold ${gained ? "text-gold" : "text-cream/70"}`}>{gained ? BONUS_PARDON : BONUS_CALM}</p>
            </div>
          )}
          <button type="button" className="mt-[0.75em] flex h-[3em] w-full items-center justify-center rounded-full border-2 border-ink bg-bow font-extrabold text-cream" onClick={() => onAct({ type: "continue" })}>
            Pokračovat
          </button>
        </>
      )}
    </section>
  );
}

function AlarmScene({ bonus }: { bonus: AlarmHud }) {
  const goat =
    bonus.pose === "hit" ? "/game/alarm/goat-hit.webp" : bonus.pose === "stumble" ? "/game/alarm/goat-miss.webp" : "/game/alarm/goat.webp";
  const awake = bonus.windows >= 2 || (bonus.stage === "done" && !bonus.failed);
  const gooseUp = bonus.windows >= 3 || (bonus.stage === "done" && !bonus.failed);
  const shake = Math.sin(bonus.shake * 28) * bonus.shake * 8;
  const perfectStart = bonus.zoneStart + (bonus.zoneEnd - bonus.zoneStart) * 0.31;
  const perfectWidth = Math.max(0.02, (bonus.zoneEnd - bonus.zoneStart) * 0.38);
  return (
    <div className="w-full">
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
        <div className="absolute inset-0" style={{ transform: `translateX(${shake}px)` }}>
          <img src="/game/alarm/inn.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
          {WINDOWS.map((spot, index) =>
            bonus.windows > index ? (
              <span key={spot.left + spot.top} className="absolute rounded-[2px] bg-[#ffd56a]/80 shadow-[0_0_12px_4px_rgba(255,213,106,0.75)]" style={spot} />
            ) : null,
          )}
          {awake && (
            <img src="/game/alarm/keeper-head.webp" alt="" className="absolute z-10 w-[9%]" style={{ left: "31.9%", top: "49.5%" }} />
          )}
        </div>
        <img
          src={gooseUp ? "/game/alarm/goose-honk.webp" : "/game/alarm/goose.webp"}
          alt=""
          className="absolute z-20"
          style={{ left: "68%", bottom: "3%", width: gooseUp ? "13%" : "15%" }}
        />
        <img src={goat} alt="" className="absolute bottom-0 left-[-4%] z-30 w-[36%]" />
      </div>
      <div className="relative mt-[0.5em] h-[1.75em] overflow-hidden rounded-full border-2 border-[#3a2618] bg-[#24180f]">
        <span className="absolute inset-y-0 bg-[#e8a317]" style={{ left: `${bonus.zoneStart * 100}%`, width: `${(bonus.zoneEnd - bonus.zoneStart) * 100}%` }} />
        <span className="absolute inset-y-1 rounded-full bg-[#fff1c4]" style={{ left: `${perfectStart * 100}%`, width: `${perfectWidth * 100}%` }} />
        <span className="absolute top-0 h-full w-3 -translate-x-1/2 rounded-full border-2 border-[#241c16] bg-[#f4efe4]" style={{ left: `${bonus.pointer * 100}%` }} />
      </div>
    </div>
  );
}

const WINDOWS = [
  { left: "33.7%", top: "47.4%", width: "5.5%", height: "11.6%" },
  { left: "42.6%", top: "47.4%", width: "5.5%", height: "11.6%" },
  { left: "33.7%", top: "61.8%", width: "5.5%", height: "10.8%" },
  { left: "42.6%", top: "61.8%", width: "5.5%", height: "10.8%" },
];