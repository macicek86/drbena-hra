import type { BonusAction } from "@/game/minigames";
import type { AlarmHud } from "@/game/minigames";

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
  const elapsed = bonus.pose === "hit" ? Math.max(0, 0.52 - bonus.poseT) : 0;
  const lunge = bonus.pose === "hit" ? Math.sin(Math.min(1, elapsed / 0.18) * Math.PI) : 0;
  const stumble = bonus.pose === "stumble" ? Math.sin(Math.min(1, (0.56 - bonus.poseT) / 0.56) * Math.PI) : 0;
  const shake = Math.sin(bonus.shake * 28) * bonus.shake * 7;
  const awake = bonus.windows >= 2 || (bonus.stage === "done" && !bonus.failed);
  const gooseUp = bonus.windows >= 3 || (bonus.stage === "done" && !bonus.failed);
  const candle = Math.max(0.08, bonus.timeLeft / 26);
  const perfectStart = bonus.zoneStart + (bonus.zoneEnd - bonus.zoneStart) * 0.31;
  const perfectEnd = bonus.zoneEnd - (bonus.zoneEnd - bonus.zoneStart) * 0.31;
  return (
    <svg viewBox="0 0 640 390" className="h-auto w-full rounded-2xl bg-[#121a2e]">
      <defs>
        <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24345c" />
          <stop offset="1" stopColor="#12182b" />
        </linearGradient>
      </defs>
      <rect width="640" height="390" fill="url(#night)" />
      <circle cx="520" cy="58" r="28" fill="#f6e7b2" />
      <circle cx="532" cy="50" r="22" fill="#24345c" opacity="0.35" />
      {[40, 90, 150, 210, 300, 430, 580].map((x, i) => (
        <circle key={x} cx={x} cy={28 + (i % 3) * 16} r={i % 2 ? 1.4 : 2} fill="#fff6e8" opacity={0.8} />
      ))}
      <path d="M0 250 C80 230 140 240 210 228 C260 220 300 236 360 232 C430 226 500 214 640 230 L640 390 L0 390 Z" fill="#1d2a22" />
      <g transform={`translate(${shake} 0)`}>
        <path d="M250 150 L400 78 L560 150 Z" fill="#6d2430" />
        <rect x="268" y="146" width="270" height="150" rx="6" fill="#e6d2ae" />
        <path d="M268 170 H538 M300 146 V296 M400 146 V296 M500 146 V296" stroke="#6b3f28" strokeWidth="8" />
        <rect x="286" y="248" width="46" height="48" rx="3" fill="#5a341f" />
        <Window x={318} y={168} lit={bonus.windows > 0} />
        <Window x={430} y={168} lit={bonus.windows > 1} keeper={awake} />
        <Window x={318} y={214} lit={bonus.windows > 2} />
        <Window x={470} y={214} lit={bonus.windows > 3} />
        <rect x="360" y="128" width="92" height="22" rx="4" fill="#6b3f28" />
        <text x="406" y="144" textAnchor="middle" fill="#f6e7c1" fontSize="13" fontWeight="700">
          Hostinec
        </text>
      </g>
      <g transform={`translate(${70 + lunge * 54} ${168 + stumble * 10}) rotate(${stumble * 16 - lunge * 10} 70 70)`}>
        <path d="M118 78 C150 70 168 108 150 124" fill="none" stroke="#d9c7a2" strokeWidth="7" strokeLinecap="round" />
        <path d="M132 74 C158 58 176 96 160 118" fill="none" stroke="#cbb68a" strokeWidth="7" strokeLinecap="round" />
        <ellipse cx="78" cy="92" rx="48" ry="28" fill="#8d7356" />
        <path d="M40 78 Q78 60 112 80 Q100 96 70 98 Q48 96 40 78" fill="#6d5844" />
        <ellipse cx="128" cy="78" rx="24" ry="20" fill="#a08468" />
        <path d="M146 92 Q138 112 150 118 Q162 108 154 92" fill="#efe6d6" />
        <path d="M112 86 Q128 98 146 88" fill="none" stroke="#4d382c" strokeWidth="3" />
        <circle cx="138" cy="74" r="2.4" fill="#241c16" />
        <path d="M128 68 Q138 64 148 70" fill="none" stroke="#3a2a22" strokeWidth="3" strokeLinecap="round" />
        <rect x="48" y="112" width="8" height="28" rx="3" fill="#5c4636" />
        <rect x="78" y="114" width="8" height="26" rx="3" fill="#5c4636" />
        <rect x="96" y="112" width="8" height="28" rx="3" fill="#5c4636" />
      </g>
      <line x1="168" y1="214" x2="250" y2="230" stroke="#c2a36a" strokeWidth="2" />
      <rect x="236" y="188" width="10" height="78" rx="3" fill="#5a341f" />
      <g transform={`translate(150 ${gooseUp ? 236 : 252})`}>
        <ellipse cx="0" cy="18" rx="22" ry={gooseUp ? 12 : 14} fill="#f4efe4" />
        {gooseUp ? (
          <>
            <path d="M16 16 Q28 -8 18 -2" fill="none" stroke="#f4efe4" strokeWidth="8" strokeLinecap="round" />
            <path d="M20 -4 L34 -2 L20 2 Z" fill="#e39a3a" />
          </>
        ) : (
          <ellipse cx="16" cy="14" rx="10" ry="7" fill="#f7f3ea" />
        )}
        <path d="M-8 28 Q0 34 10 28" fill="none" stroke="#e39a3a" strokeWidth="3" />
      </g>
      <g transform="translate(24 300)">
        <rect x="0" y="8" width="70" height="16" rx="8" fill="#6b3f28" />
        <rect x="8" y={8 - 28 * candle} width="8" height={28 * candle} rx="2" fill="#f2d48a" />
        <circle cx="12" cy={8 - 28 * candle} r="4" fill="#ffe7a8" />
      </g>
      <g transform="translate(110 318)">
        <rect x="0" y="8" width="500" height="22" rx="11" fill="#3a2618" />
        <rect x={bonus.zoneStart * 500} y="8" width={(bonus.zoneEnd - bonus.zoneStart) * 500} height="22" rx="8" fill="#e8a317" />
        <rect x={perfectStart * 500} y="12" width={Math.max(8, (perfectEnd - perfectStart) * 500)} height="14" rx="7" fill="#fff1c4" />
        <g transform={`translate(${bonus.pointer * 500} 0)`}>
          <path d="M0 0 L10 19 L-10 19 Z" fill="#f4efe4" stroke="#241c16" strokeWidth="2" />
        </g>
      </g>
    </svg>
  );
}

function Window({ x, y, lit, keeper = false }: { x: number; y: number; lit: boolean; keeper?: boolean }) {
  return (
    <g>
      {lit && <ellipse cx={x + 16} cy={y + 16} rx="24" ry="20" fill="#ffd56a" opacity="0.45" />}
      <rect x={x} y={y} width="32" height="32" rx="3" fill={lit ? "#ffd56a" : "#1a243c"} stroke="#6b3f28" strokeWidth="3" />
      {keeper && (
        <g>
          <circle cx={x + 16} cy={y + 18} r="8" fill="#f0c7a2" />
          <path d={`M${x + 8} ${y + 12} Q${x + 16} ${y + 4} ${x + 24} ${y + 12}`} fill="#8d3b45" />
          <circle cx={x + 13} cy={y + 18} r="1.2" fill="#241c16" />
          <circle cx={x + 19} cy={y + 18} r="1.2" fill="#241c16" />
        </g>
      )}
    </g>
  );
}
