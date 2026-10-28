import { BookOpen, CheckCircle2, XCircle } from "lucide-react";
import type { ErbQuizRound } from "./erb-quiz";

export function ErbQuizCard({
  quiz,
  onAnswer,
  onContinue,
  onSkip,
}: {
  quiz: ErbQuizRound;
  onAnswer: (index: number) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const answered = quiz.selected !== null;
  const won = answered && quiz.selected === quiz.correct;
  return (
    <section role="dialog" aria-label={quiz.title}
      className="w-full max-w-[27rem] rounded-3xl border-[3px] border-gold bg-cream p-4 text-ink shadow-xl sm:p-6">
      <p className="text-center text-xs font-extrabold tracking-widest text-bow">U ERBU KOPIDLNA</p>
      <h2 className="mt-1 text-center font-display text-2xl leading-tight">{quiz.title}</h2>
      <p className="mt-2 text-center text-sm font-semibold leading-snug text-ink-soft">
        <span aria-hidden="true">🐐 </span><strong>Drběna:</strong> {quiz.intro.join(" ")}
      </p>
      <h3 className="mt-4 text-center font-display text-xl leading-snug">{quiz.question}</h3>
      <div className="mt-3 flex flex-col gap-2" role="group" aria-label="Tři odpovědi">
        {quiz.answers.map((answer, index) => {
          const isRight = index === quiz.correct;
          const isPicked = index === quiz.selected;
          const showRight = answered && isRight;
          const showWrong = answered && isPicked && !isRight;
          return (
            <button key={index} type="button" disabled={answered} aria-pressed={isPicked}
              onClick={() => onAnswer(index)}
              className={[
                "flex min-h-11 items-center gap-3 rounded-xl border-2 px-3 py-2 text-left font-extrabold leading-snug",
                showRight ? "border-[#3b814f] bg-[#e7f5dd]" :
                  showWrong ? "border-bow bg-[#ffe4dc]" : "border-ink bg-[#fff8ea]",
                answered ? "cursor-default" : "transition-colors active:bg-gold",
              ].join(" ")}>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-ink/30 bg-cream-deep text-sm">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="min-w-0 flex-1">{answer}</span>
              {showRight && <CheckCircle2 aria-label="Správná odpověď" className="size-5 shrink-0 text-[#3b814f]" />}
              {showWrong && <XCircle aria-label="Nesprávná odpověď" className="size-5 shrink-0 text-bow" />}
            </button>
          );
        })}
      </div>
      {answered ? (
        <div aria-live="polite">
          <p className="mt-3 text-center font-extrabold text-bow">{quiz.reaction}</p>
          {!won && <p className="mt-1 text-center text-sm font-extrabold">
            Správně: {quiz.answers[quiz.correct]}
          </p>}
          <p className="mt-2 text-center text-sm font-semibold leading-snug text-ink-soft">{quiz.explanation}</p>
          {won && <p className="mt-2 text-center font-display text-xl text-bow">+{quiz.earned} bodů</p>}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-sm font-extrabold">
            <a className="inline-flex items-center gap-1 text-bow underline underline-offset-2"
              href={quiz.history.href} target="_blank" rel="noopener noreferrer">
              <BookOpen className="size-4" /> Znak v kronice
            </a>
            <a className="text-bow underline underline-offset-2"
              href={quiz.legend.href} target="_blank" rel="noopener noreferrer">
              Pověst o kozlovi
            </a>
          </div>
          <button type="button" onClick={onContinue}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full border-2 border-ink bg-bow px-3 font-extrabold text-cream">
            Pokračovat v běhu
          </button>
        </div>
      ) : (
        <button type="button" onClick={onSkip}
          className="mt-3 min-h-11 w-full rounded-full border-2 border-ink bg-cream-deep px-3 text-sm font-extrabold">
          Přeskočit otázku
        </button>
      )}
    </section>
  );
}
