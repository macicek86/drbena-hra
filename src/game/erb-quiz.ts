import data from "./erb-quiz.json" with { type: "json" };

type Difficulty = keyof typeof data.settings.difficultyWeights;
export type ErbQuizLink = { label: string; href: string };
export type ErbQuizRound = {
  id: string;
  title: string;
  intro: readonly string[];
  question: string;
  answers: readonly string[];
  correct: number;
  selected: number | null;
  explanation: string;
  reaction: string;
  earned: number;
  lifeGranted: boolean;
  history: ErbQuizLink;
  legend: ErbQuizLink;
};

/** Počet platných otázek (když je hráč viděl všechny, začne se znovu). */
export function erbQuestionIds(): string[] {
  return data.questions.map((q) => q.id);
}

/**
 * Jedna náhodná otázka; obtížnosti vážíme jako skupiny, nikoli podle počtu otázek v souboru.
 * `seen` jsou otázky, které hráč už měl: dokud nějaké zbývají, vybírá se jen z nich nových.
 */
export function createErbQuiz(lastId: string | null, random: () => number = Math.random, seen: readonly string[] = []): ErbQuizRound {
  const valid = data.questions.filter(
    (q) => q.answers.length === data.settings.answersPerQuestion && q.correct >= 0 && q.correct < q.answers.length,
  );
  const unseen = valid.filter((q) => !seen.includes(q.id));
  const base = unseen.length ? unseen : valid;
  const fresh = data.settings.avoidImmediateRepeat ? base.filter((q) => q.id !== lastId) : base;
  const pool = fresh.length ? fresh : base;
  if (!pool.length) throw new Error("Erbovní hádanka nemá platné otázky.");
  const counts = new Map<string, number>();
  for (const q of pool) counts.set(q.difficulty, (counts.get(q.difficulty) ?? 0) + 1);
  const weighted = pool.map((question) => ({
    question,
    weight: Math.max(0, data.settings.difficultyWeights[question.difficulty as Difficulty] ?? 0)
      / (counts.get(question.difficulty) ?? 1),
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = random() * (total || pool.length);
  let chosen = pool[pool.length - 1]!;
  if (total > 0) {
    for (const item of weighted) {
      roll -= item.weight;
      if (roll < 0) { chosen = item.question; break; }
    }
  } else {
    chosen = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!;
  }

  // Promíchání voleb včetně pozice správné odpovědi.
  const options = chosen.answers.map((answer, index) => ({ answer, correct: index === chosen.correct }));
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j]!, options[i]!];
  }
  return {
    id: chosen.id,
    title: data.title,
    intro: data.intro,
    question: chosen.question,
    answers: options.map((item) => item.answer),
    correct: options.findIndex((item) => item.correct),
    selected: null,
    explanation: chosen.explanation,
    reaction: "",
    earned: 0,
    lifeGranted: false,
    history: data.links.history,
    legend: data.links.legend,
  };
}

/** Odpovědět lze jen jednou: opakované kliknutí nesmí přidat další body. */
export function answerErbQuiz(quiz: ErbQuizRound, index: number, random: () => number = Math.random): ErbQuizRound {
  if (quiz.selected !== null || !Number.isInteger(index) || index < 0 || index >= quiz.answers.length) return quiz;
  const correct = index === quiz.correct;
  const lines = correct ? data.outro.correct : data.outro.wrong;
  return {
    ...quiz,
    selected: index,
    reaction: lines[Math.min(lines.length - 1, Math.floor(random() * lines.length))] ?? "",
    earned: correct ? data.settings.rewardCorrectPoints : data.settings.rewardWrongPoints,
  };
}
