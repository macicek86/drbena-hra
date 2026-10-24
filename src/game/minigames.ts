export type MiniId = "untangle";

export type BonusAction =
  | { type: "play" }
  | { type: "decline" }
  | { type: "skip" }
  | { type: "pick"; index: number }
  | { type: "check" }
  | { type: "continue" };

export type BonusState = {
  stage: "offer" | "play" | "done";
  id: MiniId;
  title: string;
  prompt: string;
  reward: number;
  success: string;
  parts: readonly string[];
  order: number[];
  picked: number | null;
  wrong: boolean;
  rewarded: boolean;
};

export type BonusHud = {
  stage: BonusState["stage"];
  id: MiniId;
  title: string;
  prompt: string;
  cards: string[];
  picked: number | null;
  wrong: boolean;
  success: string;
  reward: number;
};

const TITLE = "Rozpleť drb!";
const PROMPT = "Drběno, já něco zaslechla, ale úplně se mi to pomotalo! Pomůžeš mi rozplést drb?";
const REWARD = 50;

const PUZZLES: readonly { parts: readonly [string, string, string]; success: string }[] = [
  {
    parts: ["Drběna se doslechla,", "že kapři v kopidlenském rybníku", "pořádají tajnou schůzi."],
    success: "Takhle to šplouchá! Přesně tak jsem to zaslechla.",
  },
  {
    parts: ["Na kopidlenském náměstí", "prý koza s růžovou mašlí", "sbírá drby rychleji než vítr."],
    success: "No vidíš. V žábrách jsem měla uzel a ty jsi ho rozpletla.",
  },
  {
    parts: ["Drběna tvrdila,", "že v zámeckém skleníku", "si palmy šeptají mezi listy."],
    success: "To je ono. Konečně to teče jako čistá voda.",
  },
  {
    parts: ["U staré školy", "se povídalo,", "že koza čte kroniku rohama."],
    success: "Výborně. Tenhle drb už se může roznést po Kopidlně.",
  },
  {
    parts: ["Drběna slyšela,", "že lavička na náměstí", "pamatuje víc drbů než kdokoliv."],
    success: "Správně. Já bych to ještě třikrát přežvýkala.",
  },
  {
    parts: ["V zámeckém parku", "prý keře naklánějí větve,", "aby líp slyšely."],
    success: "Šplouch. Teď to dává smysl i pod hladinou.",
  },
  {
    parts: ["Drběna přísahala,", "že rybník má", "vlastní šeptandu pod hladinou."],
    success: "Přesně! Já tam na té schůzi skoro byla.",
  },
  {
    parts: ["Na hrázi", "se šuškalo,", "že koza skáče, jen když je drb šťavnatý."],
    success: "A je to. Žábry si oddechly.",
  },
  {
    parts: ["Drběna donesla,", "že zvon na věži", "odbíjí pokaždé, když se něco provalí."],
    success: "Takhle jsem to slyšela, jenom trochu mokřeji.",
  },
  {
    parts: ["V Drahorazi", "prý jablka červenají,", "když zaslechnou čerstvý drb."],
    success: "Výborně. Tenhle drb už se nemusí stydět.",
  },
  {
    parts: ["Drběna se zakecala tak dlouho,", "že stihla Kopidlno", "třikrát obejít."],
    success: "Hotovo. Ani kapr by to nepopletl líp.",
  },
  {
    parts: ["U rybníka", "se říká,", "že nejlepší drb má žábry."],
    success: "No jasně. Vždyť je to náš domácí recept.",
  },
  {
    parts: ["Drběna zjistila,", "že ploty v Kopidlně", "nestojí na ochranu, ale na poslouchání."],
    success: "Správné pořadí. Už to můžu vyprávět dál.",
  },
  {
    parts: ["V palmovém skleníku", "prý jedna palma", "chtěla předplatné na všechny drby."],
    success: "To sedí. Palmy by za tohle daly list.",
  },
  {
    parts: ["Drběna běžela,", "protože čerstvý drb", "nevydrží ani do oběda."],
    success: "Výborně. Než se to zkazí, už je to srovnané.",
  },
  {
    parts: ["Na náměstí", "se povídalo,", "že růžová mašle je značka zpravodajství."],
    success: "Přesně tak. Mašle nelže, jenom poletuje.",
  },
  {
    parts: ["Drběna slyšela od vody,", "že kapr mlčí,", "jen když má plnou pusu drbů."],
    success: "Šplouch, šplouch. Konečně to plyne.",
  },
  {
    parts: ["U zámku", "prý schody počítají,", "kolikrát se novinka donese nahoru."],
    success: "Tak. Schody by ti za to zatleskaly.",
  },
  {
    parts: ["Drběna přinesla,", "že v Kopidlně je ticho", "jen tehdy, když všichni poslouchají."],
    success: "Ano! Ticho je u nás taky druh drbu.",
  },
  {
    parts: ["V parku", "se šuškalo,", "že koza sbírá drby i ve skoku."],
    success: "Rozpleteno. Můžeš zase běžet, než to vychladne.",
  },
  {
    parts: ["Drběna se dušovala,", "že nejdelší drb", "začíná u rybníka a končí až za humny."],
    success: "Dlouhý byl, ale ty jsi ho srovnala na tři řádky.",
  },
  {
    parts: ["Na hrázi", "kapři rozhodli,", "že koza smí poslouchat, ale ne kecat do vody."],
    success: "Usnesení platí. A ty jsi ho přečetla správně.",
  },
];

let lastPuzzle = -1;

export function fishOffersMini(rng: () => number = Math.random) {
  return rng() >= 0.5;
}

export function puzzleCount() {
  return PUZZLES.length;
}

export function puzzleSentence(index: number) {
  return PUZZLES[index]!.parts.join(" ");
}

function shuffleOrder(length: number, rng: () => number) {
  const order = Array.from({ length }, (_, index) => index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = order[i]!;
    order[i] = order[j]!;
    order[j] = swap;
  }
  if (order.every((part, index) => part === index) && order.length > 1) {
    const swap = order[0]!;
    order[0] = order[1]!;
    order[1] = swap;
  }
  return order;
}

export function createUntangle(rng: () => number = Math.random, index?: number): BonusState {
  let pick = index ?? Math.floor(rng() * PUZZLES.length);
  pick = ((pick % PUZZLES.length) + PUZZLES.length) % PUZZLES.length;
  if (index == null && PUZZLES.length > 1 && pick === lastPuzzle) pick = (pick + 1) % PUZZLES.length;
  lastPuzzle = pick;
  const puzzle = PUZZLES[pick]!;
  return {
    stage: "offer",
    id: "untangle",
    title: TITLE,
    prompt: PROMPT,
    reward: REWARD,
    success: puzzle.success,
    parts: puzzle.parts,
    order: shuffleOrder(puzzle.parts.length, rng),
    picked: null,
    wrong: false,
    rewarded: false,
  };
}

export function bonusHud(state: BonusState): BonusHud {
  return {
    stage: state.stage,
    id: state.id,
    title: state.title,
    prompt: state.prompt,
    cards: state.stage === "offer" ? [] : state.order.map((index) => state.parts[index] ?? ""),
    picked: state.picked,
    wrong: state.wrong,
    success: state.success,
    reward: state.reward,
  };
}

export function bonusAct(state: BonusState, action: BonusAction): { state: BonusState | null; grant: number; resume: boolean } {
  if (action.type === "skip") return { state: null, grant: 0, resume: true };
  if (action.type === "decline" && state.stage === "offer") return { state: null, grant: 0, resume: true };
  if (action.type === "continue" && state.stage === "done") return { state: null, grant: 0, resume: true };
  if (action.type === "play" && state.stage === "offer") {
    return { state: { ...state, stage: "play", picked: null, wrong: false }, grant: 0, resume: false };
  }
  if (action.type === "pick" && state.stage === "play") {
    const index = action.index;
    if (index < 0 || index >= state.order.length) return { state, grant: 0, resume: false };
    if (state.picked == null) return { state: { ...state, picked: index }, grant: 0, resume: false };
    if (state.picked === index) return { state: { ...state, picked: null }, grant: 0, resume: false };
    const order = state.order.slice();
    const from = state.picked;
    const swap = order[from]!;
    order[from] = order[index]!;
    order[index] = swap;
    return { state: { ...state, order, picked: null, wrong: false }, grant: 0, resume: false };
  }
  if (action.type === "check" && state.stage === "play") {
    const ok = state.order.every((part, index) => part === index);
    if (!ok) return { state: { ...state, wrong: true, picked: null }, grant: 0, resume: false };
    return {
      state: { ...state, stage: "done", wrong: false, picked: null, rewarded: true },
      grant: state.rewarded ? 0 : state.reward,
      resume: false,
    };
  }
  return { state, grant: 0, resume: false };
}
