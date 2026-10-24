import type { AlarmHud, BonusAction } from "@/game/minigames";

export function AlarmCard({ bonus, onAct }: { bonus: AlarmHud; onAct: (action: BonusAction) => void }) {
  if (bonus.stage === "offer") {
    return (
      <section className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-3xl border-2 border-ink bg-cream p-4 text-center shadow-lg sm:p-6">
        <p className="text-xs font-extrabold tracking-wide text-bow">Ryba z rybníka</p>
        <h2 className="mt-1 font-display text-4xl leading-none">{bonus.title}</h2>
        <p className="mt-3 text-sm leading-snug text-ink-soft">{bonus.prompt}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" className="flex h-14 items-center justify-center rounded-full border-2 border-ink bg-bow text-lg font-extrabold text-cream" onClick={() => onAct({ type: "play" })}>
            Hrát
          </button>
          <button type="button" className="flex h-14 items-center justify-center rounded-full border-2 border-ink bg-cream text-lg font-extrabold" onClick={() => onAct({ type: "decline" })}>
            Ne, díky
          </button>
        </div>
      </section>
    );
  }
  const ended = bonus.stage === "done";
  return (
    <section className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl border-2 border-ink bg-[#172033] p-3 text-center text-cream shadow-lg">
      <p className="text-xs font-extrabold tracking-wide text-gold">Noční Kopidlno</p>
      <h2 className="font-display text-3xl leading-none text-cream">{bonus.title}</h2>
      <button
        type="button"
        className="mt-2 block w-full rounded-2xl"
        aria-label={`Klepni ve zlatém poli. Rozsvíceno ${bonus.windows} z ${bonus.goal} oken.`}
        onClick={() => {
          if (!ended) onAct({ type: "tap" });
        }}
      >
        <AlarmScene bonus={bonus} />
      </button>
      <p className="mt-2 min-h-10 text-sm font-extrabold leading-snug text-[#f6e7c1]">{bonus.note}</p>
      {!ended && (
        <button type="button" className="mt-2 flex h-11 w-full items-center justify-center rounded-full border-2 border-cream/70 font-extrabold" onClick={() => onAct({ type: "skip" })}>
          Přeskočit
        </button>
      )}
      {ended && (
        <>
          {!bonus.failed && <p className="mt-1 font-display text-4xl leading-none text-gold">+{bonus.reward}</p>}
          <button type="button" className="mt-3 flex h-12 w-full items-center justify-center rounded-full border-2 border-ink bg-bow font-extrabold text-cream" onClick={() => onAct({ type: "continue" })}>
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
  const shift = bonus.pose === "hit" ? "16%" : bonus.pose === "stumble" ? "-6%" : "-1%";
  const tilt = bonus.pose === "stumble" ? -14 : bonus.pose === "hit" ? -6 : 0;
  const shake = Math.sin(bonus.shake * 28) * bonus.shake * 8;
  const perfectStart = bonus.zoneStart + (bonus.zoneEnd - bonus.zoneStart) * 0.31;
  const perfectWidth = Math.max(0.02, (bonus.zoneEnd - bonus.zoneStart) * 0.38);
  return (
    <div className="w-full">
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl" style={{ transform: `translateX(${shake}px)` }}>
        <img src="/game/alarm/inn.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
        {WINDOWS.map((spot, index) =>
          bonus.windows > index ? (
            <span
              key={spot.left + spot.top}
              className="absolute rounded-sm bg-[#ffd56a] shadow-[0_0_18px_8px_rgba(255,213,106,0.85)]"
              style={spot}
            />
          ) : null,
        )}
        {awake && (
          <img src="/game/alarm/keeper.webp" alt="" className="absolute z-10 w-[14%] drop-shadow-md" style={{ left: "39%", top: "34%" }} />
        )}
        <img
          src={gooseUp ? "/game/alarm/goose-honk.webp" : "/game/alarm/goose.webp"}
          alt=""
          className="absolute z-20 drop-shadow-md"
          style={{ left: "64%", bottom: "5%", width: gooseUp ? "14%" : "18%" }}
        />
        <img
          src={goat}
          alt=""
          className="absolute z-30 w-[34%] drop-shadow-lg transition-all duration-150"
          style={{
            left: shift,
            bottom: "0%",
            transform: `rotate(${tilt}deg)`,
            transformOrigin: "80% 90%",
          }}
        />
      </div>
      <div className="relative mt-2 h-7 overflow-hidden rounded-full border-2 border-[#3a2618] bg-[#24180f]">
        <span className="absolute inset-y-0 bg-[#e8a317]" style={{ left: `${bonus.zoneStart * 100}%`, width: `${(bonus.zoneEnd - bonus.zoneStart) * 100}%` }} />
        <span className="absolute inset-y-1 rounded-full bg-[#fff1c4]" style={{ left: `${perfectStart * 100}%`, width: `${perfectWidth * 100}%` }} />
        <span className="absolute top-0 h-full w-3 -translate-x-1/2 rounded-full border-2 border-[#241c16] bg-[#f4efe4]" style={{ left: `${bonus.pointer * 100}%` }} />
      </div>
    </div>
  );
}

const WINDOWS = [
  { left: "30.2%", top: "45.2%", width: "7.4%", height: "9.2%" },
  { left: "40.4%", top: "45.2%", width: "7.4%", height: "9.2%" },
  { left: "30.2%", top: "59.2%", width: "7.4%", height: "9.2%" },
  { left: "40.4%", top: "59.2%", width: "7.4%", height: "9.2%" },
];