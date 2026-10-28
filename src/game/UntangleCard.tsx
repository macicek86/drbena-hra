import { CheckCircle2, Heart } from "lucide-react";
import { BONUS_CALM, BONUS_PARDON, type BonusAction, type BonusHud } from "./minigames";

type UntangleHud = Extract<BonusHud, { id: "untangle" }>;

/** Stejný vzhled dialogu jako erbovní hádanka, ale původní přehazování útržků zůstává beze změny. */
export function UntangleCard({
  bonus,
  lives,
  gained,
  onAct,
}: {
  bonus: UntangleHud;
  lives: number;
  gained: boolean;
  onAct: (action: BonusAction) => void;
}) {
  return (
    <section
      role="dialog"
      aria-label={bonus.title}
      className="w-full max-w-[27rem] rounded-3xl border-[3px] border-gold bg-cream p-4 text-ink shadow-xl sm:p-6"
    >
      <p className="text-center text-xs font-extrabold tracking-widest text-bow">U ZÁMECKÉHO RYBNÍKA</p>
      <h2 className="mt-1 text-center font-display text-2xl leading-tight">{bonus.title}</h2>

      {bonus.stage === "offer" && (
        <>
          <p className="mt-3 text-center text-sm font-semibold leading-snug text-ink-soft">
            <span aria-hidden="true">🐟 </span><strong>Ryba:</strong> {bonus.prompt}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onAct({ type: "play" })}
              className="flex min-h-12 w-full items-center justify-center rounded-full border-2 border-ink bg-bow px-3 font-extrabold text-cream"
            >
              Hrát
            </button>
            <button
              type="button"
              onClick={() => onAct({ type: "decline" })}
              className="min-h-11 w-full rounded-full border-2 border-ink bg-cream-deep px-3 text-sm font-extrabold"
            >
              Ne, díky
            </button>
          </div>
        </>
      )}

      {bonus.stage === "play" && (
        <>
          <p className="mt-2 text-center text-sm font-semibold leading-snug text-ink-soft">
            <span aria-hidden="true">🐟 </span><strong>Ryba:</strong> „Pomíchané věty! Pomůžeš mi je srovnat?“
          </p>
          <h3 className="mt-4 text-center font-display text-xl leading-snug">Slož drb ve správném pořadí</h3>
          <div className="mt-3 flex flex-col gap-2" role="group" aria-label="Tři části drbu k seřazení">
            {bonus.cards.map((card, index) => {
              const picked = bonus.picked === index;
              return (
                <button
                  key={index}
                  type="button"
                  aria-pressed={picked}
                  onClick={() => onAct({ type: "pick", index })}
                  className={[
                    "flex min-h-11 items-center gap-3 rounded-xl border-2 px-3 py-2 text-left font-extrabold leading-snug",
                    picked ? "border-ink bg-gold" : "border-ink bg-[#fff8ea] transition-colors active:bg-gold",
                  ].join(" ")}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-ink/30 bg-cream-deep text-sm">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">{card}</span>
                  {picked && <CheckCircle2 className="size-5 shrink-0 text-bow" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-center text-xs font-extrabold text-ink-soft">
            {bonus.picked === null
              ? "Klepni na dva útržky a prohoď jejich pořadí."
              : "Teď vyber druhý útržek, se kterým ho prohodíš."}
          </p>
          {bonus.wrong && (
            <p className="mt-2 text-center text-sm font-extrabold leading-snug text-bow" role="status">
              <span aria-hidden="true">🐟 </span>{bonus.wrong}
            </p>
          )}
          <button
            type="button"
            onClick={() => onAct({ type: "check" })}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full border-2 border-ink bg-bow px-3 font-extrabold text-cream"
          >
            Zkontrolovat
          </button>
          <button
            type="button"
            onClick={() => onAct({ type: "skip" })}
            className="mt-2 min-h-11 w-full rounded-full border-2 border-ink bg-cream-deep px-3 text-sm font-extrabold"
          >
            Přeskočit
          </button>
        </>
      )}

      {bonus.stage === "done" && (
        <div aria-live="polite">
          <p className="mt-3 text-center text-sm font-semibold leading-snug text-ink-soft">
            <span aria-hidden="true">🐟 </span><strong>Ryba:</strong> {bonus.success}
          </p>
          <p className="mt-3 text-center font-display text-xl text-bow">+{bonus.reward} bodů</p>
          <p className="mt-1 text-center font-extrabold text-[#3b814f]">
            <Heart className="mr-1 inline size-4 fill-bow text-bow" aria-hidden="true" />
            {gained ? "+1 život! Jedna příhoda se nepočítá." : "Životy máš naplno (max. 4)."}
          </p>
          <p className="mt-1 text-center text-xs font-semibold text-ink-soft" aria-label={gained ? BONUS_PARDON : BONUS_CALM}>
            {gained ? BONUS_PARDON : BONUS_CALM}
          </p>
          <button
            type="button"
            onClick={() => onAct({ type: "continue" })}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full border-2 border-ink bg-bow px-3 font-extrabold text-cream"
          >
            Pokračovat v běhu
          </button>
        </div>
      )}
    </section>
  );
}
