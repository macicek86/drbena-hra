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
  wrong: string;
  rewarded: boolean;
};

export type BonusHud = {
  stage: BonusState["stage"];
  id: MiniId;
  title: string;
  prompt: string;
  cards: string[];
  picked: number | null;
  wrong: string;
  success: string;
  reward: number;
};

const TITLE = "Rozpleť drb!";
const PROMPT = "Drběno, já něco zaslechla, ale úplně se mi to pomotalo! Pomůžeš mi rozplést drb?";
const REWARD = 50;

const WRONG_LINES = [
  "Bubliny moje! Takhle zamotaný drb jsem ještě neviděla!",
  "Tohle nesedí! A já o sezení něco vím… sedím tu ve vodě celý den!",
  "Drběno, zkus to znovu! Tohle by nesežral ani kapr!",
  "Něco ti tam uplavalo. Zkus ty věty přeházet!",
  "Taková motanice! Ještě chvíli a budu z toho mít zauzlované ploutve!",
  "Tohle mi nějak nešplouchá dohromady!",
  "Pozor, pozor! V rybníce se šíří falešné drby!",
  "Já mám paměť jako ryba, ale tohle si pamatuju jinak!",
] as const;

let lastWrong = -1;

function pickWrong(rng: () => number = Math.random) {
  let index = Math.floor(rng() * WRONG_LINES.length);
  if (WRONG_LINES.length > 1 && index === lastWrong) index = (index + 1) % WRONG_LINES.length;
  lastWrong = index;
  return WRONG_LINES[index]!;
}

const PUZZLES: readonly { parts: readonly [string, string, string]; success: string }[] = [
  {
    parts: ["Drběna zjistila, že Kopidlno získalo", "už v roce 1523 městský znak s kozlí hlavou,", "a od té doby si připadá jako místní šlechtična!"],
    success: "Tak proto si ta naše Drběna tolik vyskakuje! Ona si vážně myslí, že má modrou krev!",
  },
  {
    parts: ["V kopidlenském zámku kdysi sídlila šlechta,", "ale od roku 1948 slouží zahradnické škole,", "takže dnes tam místo hrabat vládnou zahradníci!"],
    success: "Dřív tam bydlela šlechta, dneska zahradníci. Hlavně aby tam Drběna nezačala spásat záhony!",
  },
  {
    parts: ["František Matěj Hilmar působil v Kopidlně", "jako učitel a hudební skladatel,", "a jeho polka Esmeralda teď doprovází i Drběnu!"],
    success: "Ten Hilmar uměl složit polku! Já umím akorát složit ploutve a jít spát.",
  },
  {
    parts: ["V zámeckém parku stojí palmový skleník", "postavený už v roce 1894,", "ale Drběna v něm zatím žádné kokosové ořechy nedostala!"],
    success: "Palmy v Kopidlně? Ještě pár stupňů navíc a budu si připadat jako tropická rybička!",
  },
  {
    parts: ["Roku 1514 získalo Kopidlno", "od krále Vladislava II. městská práva,", "ale Drběna stále marně žádá o titul královské kozy!"],
    success: "Městská práva? A kdy konečně někdo uzná práva kaprů na pořádně hluboký rybník?",
  },
  {
    parts: ["Zámecký rybník v Kopidlně", "existuje už od 16. století,", "takže zdejší kapři mají opravdu dlouhou rodinnou historii!"],
    success: "Šestnácté století? Tak to už chápu, proč dědeček kapr pořád říká, že za jeho mládí bylo víc vody!",
  },
  {
    parts: ["Kopidlenský skladatel František Matěj Hilmar", "vytvořil více než dvě stě tanečních skladeb,", "ale žádnou prý nevěnoval kozímu dupání!"],
    success: "Dvě stě skladeb? Já složila zatím jen tři bubliny do řady. A ještě mi uplavaly!",
  },
  {
    parts: ["Kopidlenská radnice na náměstí", "pochází z roku 1875 a má ve štítu kozlí hlavu,", "takže Drběna tvrdí, že na úřadě má příbuzného!"],
    success: "Kozlí hlava na radnici? Tak to už chápu, proč chce být Drběna starostkou!",
  },
  {
    parts: ["Kopidlenský zámecký park", "má rozlohu téměř osm hektarů,", "a Drběna by v něm nejraději spásla každý trávník!"],
    success: "Osm hektarů parku? To je trávy! Drběna by tam měla snídani na celý rok!",
  },
  {
    parts: ["Kopidlenský palmový skleník", "byl inspirován skleníkem ve vídeňském Schönbrunnu,", "ale místní kozy by prý raději skleník plný jetele!"],
    success: "Ve Vídni mají Schönbrunn, v Kopidlně palmy. A já? Já mám na dně rybníka starý hrnec!",
  },
  {
    parts: ["V Kopidlně se narodila Anna Honzáková,", "která roku 1902 jako první žena promovala na lékařku na české lékařské fakultě,", "a Drběna si říká, jestli by uměla léčit i kozí tvrdohlavost!"],
    success: "První lékařka! Kdyby tu byla dneska, hned bych se zeptala, jestli se dá vyléčit závislost na drbech!",
  },
  {
    parts: ["Železniční trať z Nymburka do Jičína", "zahájila provoz v roce 1881 a vede přes Kopidlno,", "ale Drběna stále tvrdí, že po čtyřech je to větší dobrodružství!"],
    success: "Vlakem do Kopidlna? Já radši plavu. Ale uznávám, že na kolejích je méně bahna!",
  },
  {
    parts: ["Kopidlenský kostel svatého Jakuba Většího", "byl postaven v letech 1704 až 1705,", "a Drběna si jeho vysokou věž plete s obřím kozím rozhledem!"],
    success: "Tak starý kostel! A já si myslela, že nejstarší věc v Kopidlně je náš kapr Franta!",
  },
  {
    parts: ["Hlavní kopidlenské náměstí", "nese jméno skladatele Františka Matěje Hilmara,", "a Drběna by tam nejraději pořádala kozí taneční soutěž!"],
    success: "Náměstí po skladateli? To je pocta! Po mně zatím pojmenovali jen jednu louži. A ta vyschla!",
  },
  {
    parts: ["Podobu kopidlenského zámeckého parku", "pomáhal koncem 19. století utvářet František Thomayer,", "ale o plánované výsadbě kozího zelí se nikde nepíše!"],
    success: "Ten Thomayer měl určitě rád rostliny. Ještě že nepotkal Drběnu, ta by mu udělala kompletní prostřih za pět minut!",
  },
  {
    parts: ["První písemná zmínka o Drahorazi", "pochází už z roku 1294,", "takže se tam mohou pochlubit opravdu dlouhou pamětí!"],
    success: "Drahoraz má tak dlouhou historii? To musí mít pořádně staré drby! Honem tam někoho pošli!",
  },
  {
    parts: ["U kostela v Drahorazi stojí kaple Božího hrobu,", "která vznikla v letech 1695 až 1698 podle jeruzalémského vzoru,", "a Drběna nevěří, že kvůli ní nemusí cestovat až do Jeruzaléma!"],
    success: "Kousek Jeruzaléma u Kopidlna? No vida! A já se bála vyplavat až na druhý břeh!",
  },
  {
    parts: ["Nedaleko Mlýnce leží rybník Zrcadlo,", "který patří k největším rybníkům na Jičínsku,", "a Drběna se tam chodí přesvědčit, jestli jí sluší mašle!"],
    success: "Rybník Zrcadlo? Tam já nesmím! Minule jsem se zahlédla a půl hodiny jsem si upravovala šupiny!",
  },
  {
    parts: ["V kopidlenské radnici býval", "kromě městského úřadu také divadelní sál a kino,", "takže Drběna tam chce okamžitě uvést svůj kozí muzikál!"],
    success: "Kino na radnici? Drběna by určitě chtěla hlavní roli. A já? Já bych dělala němý film!",
  },
  {
    parts: ["Ve staré škole v Hilmarově ulici", "kdysi sídlilo městské muzeum a dnes tam najdeme knihovnu,", "takže Drběna má kde hledat další historické drby!"],
    success: "Muzeum, knihovna… Tolik moudrosti v jedné budově! A Drběna stejně nejradši čte, co se kde šustlo!",
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
    wrong: "",
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
    return { state: { ...state, stage: "play", picked: null, wrong: "" }, grant: 0, resume: false };
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
    return { state: { ...state, order, picked: null, wrong: "" }, grant: 0, resume: false };
  }
  if (action.type === "check" && state.stage === "play") {
    const ok = state.order.every((part, index) => part === index);
    if (!ok) return { state: { ...state, wrong: pickWrong(), picked: null }, grant: 0, resume: false };
    return {
      state: { ...state, stage: "done", wrong: "", picked: null, rewarded: true },
      grant: state.rewarded ? 0 : state.reward,
      resume: false,
    };
  }
  return { state, grant: 0, resume: false };
}
