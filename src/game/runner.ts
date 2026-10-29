import { knownIds, pageIds, rememberFact } from "@/game/chronicle";
import { Sfx } from "@/game/audio";
import { answerErbQuiz, createErbQuiz, erbQuestionIds, type ErbQuizRound } from "@/game/erb-quiz";
import { loadProgress, saveProgress } from "@/game/progress";
import { STAG_STORIES, stagStoryFor, type StagStory } from "@/game/stag-stories";
import { bonusAct as actBonus, bonusHud, BONUS_PARDON_TALE, createOfferedMini, healFromBonus, type AnyBonus, type BonusAction, type BonusHud } from "@/game/minigames";
import { tickAlarm, type AlarmEvent } from "./goatAlarm.ts";
import { reportPlayer, submitScore } from "@/game/plays";
import { currentProfile, ensureProfile, recordGame } from "@/game/profiles";
import { cyclistGap, gossipChance, gossipGap, hazardGap, pairGap, scrollGap, MERCY_SECONDS, MERCY_COOLDOWN, mercyDue, mercySlow, pairChance, roadZone, speedShape, WARM_BEST, type Zone } from "@/game/difficulty";
import { publicUrl } from "@/lib/public-url";
import {
  CYCLE_LEN,
  stageIndex,
  stageStart,
  BIOMES,
  biomeMix,
  lerpRgb,
  rgbCss,
  type PlaceId,
  type RGB,
} from "@/game/content";

export type Phase = "loading" | "splash" | "menu" | "play" | "pause" | "fish-intro" | "bonus" | "dialogue" | "erb-quiz" | "over";

export type Hud = {
  phase: Phase;
  score: number;
  best: number;
  bestGossips: number;
  gossips: number;
  combo: number;
  lives: number;
  bonusLife: boolean;
  biome: string;
  fact: { title: string; text: string } | null;
  factLabel: string;
  factComplete: boolean;
  chronicleNew: number;
  scrolls: number;
  scrollsTotal: number;
  newBest: boolean;
  muted: boolean;
  coach: boolean;
  line: string;
  showTale: boolean;
  taleTag: string;
  taleTitle: string;
  ready: boolean;
  progress: number;
  bonus: BonusHud | null;
  stagDialogue: {
    speaker: "Drběna" | "Bílý jelen";
    text: string;
    title: string;
    step: number;
    total: number;
    chapter: number | null;
    chapters: number;
  } | null;
  fishDialogue: string | null;
  erbQuiz: ErbQuizRound | null;
};

type Kind =
  | "fence"
  | "pot"
  | "dog"
  | "gardener"
  | "car"
  | "branch"
  | "cyclist"
  | "laundry"
  | "forest-oak"
  | "forest-birch"
  | "forest-pine"
  | "forest-spruce"
  | "forest-linden"
  | "forest-maple"
  | "forest-rowan"
  | "forest-willow"
  | "gossip"
  | "heart"
  | "scroll"
  | "bush"
  | "lamp"
  | "tree"
  | "bench"
  | "pigeon"
  | "bin"
  | "houses"
  | "castle"
  | "greenhouse"
  | "pond"
  | "mlynec-cross"
  | "mlynec-house"
  | "mlynec-bell"
  | "mlynec-pond"
  | "mlynec-school"
  | "ledkov-a"
  | "ledkov-b"
  | "drahoraz-church"
  | "drahoraz-tower"
  | "apple-0"
  | "apple-1"
  | "apple-2"
  | "linden"
  | "pseves-house"
  | "radnice"
  | "pseves-heart"
  | "obora"
  | "stag"
  | "firefly"
  | "column"
  | "church"
  | "school"
  | "info"
  | "sign-mlynec"
  | "sign-ledkov"
  | "sign-drahoraz"
  | "sign-pseves"
  | "sign-kopidlno";

type Ent = {
  kind: Kind;
  x: number;
  lift: number;
  anim: number;
  alive: boolean;
  fly?: number;
  sway?: number;
  face?: number;
  wait?: number;
  /** Násobek velikosti (stromy v lese). */
  size?: number;
  /** Zadní řada lesa: kreslí se dřív a ztmavená. */
  far?: boolean;
  /** Druhá podoba postavy: babička místo mladé sousedky / cyklisty (střídají se). */
  alt?: boolean;
};

type Bit = {
  on: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  star: boolean;
};

type Pop = { x: number; y: number; text: string; life: number };

type Art = Record<string, HTMLImageElement | HTMLImageElement[] | null>;

const SAVE_KEY = "drbena-kopidlno-v1";

/** Výška pruhu navigace gesty pod hrou v CSS px (env(safe-area-inset-bottom), jinde 0). */
function safeBottom(): number {
  if (typeof document === "undefined" || !document.body) return 0;
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:0;bottom:0;width:1px;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return Number.isFinite(h) ? h : 0;
}

const HAZARDS = new Set<Kind>(["fence", "pot", "dog", "gardener", "car", "branch", "cyclist", "laundry"]);
const PICKUPS = new Set<Kind>(["gossip", "heart", "scroll", "firefly"]);
const LANDMARKS = new Set<Kind>(["radnice", "houses", "castle", "greenhouse", "pond", "mlynec-cross", "mlynec-house", "mlynec-bell", "mlynec-school", "mlynec-pond", "ledkov-a", "ledkov-b", "drahoraz-church", "drahoraz-tower", "apple-0", "apple-1", "apple-2", "linden", "pseves-house", "pseves-heart", "obora", "stag"]);
// Cedule na začátku obcí: jen kulisa, nikdy překážka (src/game/runner.ts, approachAfter).
const SIGNS = ["sign-mlynec", "sign-ledkov", "sign-drahoraz", "sign-pseves", "sign-kopidlno"] as const;
const PLACES = new Set<Kind>([...SIGNS, "houses", "castle", "greenhouse", "pond", "mlynec-cross", "mlynec-house", "mlynec-bell", "mlynec-school", "mlynec-pond", "ledkov-a", "ledkov-b", "drahoraz-church", "drahoraz-tower", "apple-0", "apple-1", "apple-2", "linden", "pseves-house", "pseves-heart", "radnice", "column", "church", "school", "info"]);
const MLYNEC = new Set<Kind>(["mlynec-cross", "mlynec-house", "mlynec-bell", "mlynec-school", "mlynec-pond"]);
const LEDKOV = new Set<Kind>(["ledkov-a", "ledkov-b"]);
const DRAHORAZ = new Set<Kind>(["drahoraz-church", "drahoraz-tower", "apple-0", "apple-1", "apple-2"]);
const PSEVES = new Set<Kind>(["pseves-house", "linden", "pseves-heart"]);
const VILLAGES = new Set<Kind>([...MLYNEC, ...LEDKOV, ...DRAHORAZ, ...PSEVES]);
/**
 * Větev a prádlo nesmí zakrýt budovy ani cedule (coversScenery), jinak se vymění za malou překážku.
 * Sousedka (gardener), kráva (car), husa (dog) a cyklista před stavbou stát smějí.
 */
const BIG_HAZARDS = new Set<Kind>(["branch", "laundry"]);
/** Stromy lesa mezi vesnicemi (dub, bříza, borovice, smrk, lípa, javor, jeřáb, vrba). */
const FOREST: readonly Kind[] = ["forest-oak", "forest-birch", "forest-pine", "forest-spruce", "forest-linden", "forest-maple", "forest-rowan", "forest-willow"];
/** Krajina na cestě mezi vesnicemi: les, hájky mezi loukami, stromy podél cesty, nebo pole. */
type Scene = "les" | "haj" | "stromy" | "pole";
/** Stromy v zámeckém parku a kolem rybníka. */
const PARK_TREES: readonly Kind[] = ["forest-oak", "forest-linden", "forest-maple", "forest-birch", "forest-willow", "forest-spruce"];
/**
 * Skupinka přes konec kulisy: [obrázek, výška v u, posun od kraje ven (+) či dovnitř (-) v u, zrcadlit,
 * zadní řada (ztmavená)]. Kreslí se v tomhle pořadí, zadní řada první.
 */
type EndPiece = readonly [string, number, number, boolean, boolean];
const POND_END: readonly EndPiece[] = [
  ["forest-oak", 1.55, 0.35, false, true],
  ["forest-birch", 1.6, -0.55, true, true],
  ["forest-willow", 1.75, -0.05, false, false],
  ["forest-linden", 1.5, 0.95, true, false],
  ["bush", 0.5, -0.75, false, false],
  ["bush", 0.48, 0.45, true, false],
];
// Obora je les za plotem: jehličnany a dub; dovnitř jen kousek, ať strom nezakryje ceduli obory.
// Před oborou je jen kousek trávy ke skleníku (asi 1 u), skupinka proto nesahá ven dál než to.
const OBORA_END: readonly EndPiece[] = [
  ["forest-pine", 1.7, 0.4, false, true],
  ["forest-birch", 1.55, -0.2, true, true],
  ["forest-spruce", 1.85, 0.08, false, false],
  ["forest-oak", 1.25, 0.45, true, false],
  ["bush", 0.5, 0.05, false, false],
  ["bush", 0.4, 0.75, true, false],
];
/**
 * Jak dlouho Drběna u radnice kouká na erb (sekundy): 0,9 s zvedá hlavu, pak asi 1,6 s jen kouká
 * (hráč si všimne, kam se dívá), teprve potom hádanka; posledních LOOK_DOWN sklání hlavu.
 */
const RADNICE_GAZE = 2.98;
const LOOK_DOWN = 0.48;
/** Krátký pohled na erb v kolech bez hádanky: hlavu nahoru, chvilku, dolů a dál. */
const RADNICE_GLANCE = 1.45;
/** Snímky zvednutí hlavy (`public/game/look`). */
const LOOK_FRAMES = 8;
/** Snímky mávání křídel (`public/game/pigeon-fly`). */
const PIGEON_FLY_FRAMES = 4;
/** Snímky mávání husy (`public/game/goose-flap`). */
const GOOSE_FLAP_FRAMES = 4;
/** Snímky šlapání babičky na kole (`public/game/cyclist-pedal`). */
const CYCLIST_PEDAL_FRAMES = 4;
/** Snímky zalévání sousedky (`public/game/gardener-water`). */
const GARDENER_WATER_FRAMES = 4;
/**
 * Vrstvy původního cyklisty (připravené z cyclist.webp): obrázky mají kolem okraj `pad` px,
 * kola mají střed a poloměr v pixelech té vrstvy. Kola se kreslí otočená, nad ně rám, nohy a řetěz.
 */
const CYCLIST_LAYER = {
  pad: 8,
  srcH: 720,
  wheels: [
    { key: "cyclistFront", x: 151, y: 586, half: 148 },
    { key: "cyclistRear", x: 616, y: 587, half: 146 },
  ],
} as const;
const PROPS = new Set<Kind>([...FOREST, "bush", "lamp", "tree", "bench", "pigeon", "bin"]);
const DECOR = new Set<Kind>([...FOREST, "bush", "lamp", "tree", "bench", "pigeon", "bin", "column", "church", "school", "info", ...SIGNS]);

// Nejdřív se ryba celá vynoří; až pak otevřít dialog či nabídku minihry.
const FISH_RISE_SECONDS = 0.85;

/** Náběh s malým přešvihnutím: 0 → kousek přes 1 → 1. */
function easeOutBack(k: number): number {
  const p = Math.min(1, Math.max(0, k));
  const c = 1.6;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
}

function easeIn(k: number): number {
  const p = Math.min(1, Math.max(0, k));
  return p * p;
}

const SCROLL_COMPLETE_MESSAGES = [
  {
    title: "Méé, všechno už víš!",
    text: "Drběna už všechny dostupné příběhy odhalila. Tenhle pergamen ale nepřišel nazmar!",
  },
  {
    title: "Kronika má všechno zapsané!",
    text: "Nová stránka tentokrát nepřibyla. I známý pergamen ale stojí za malou odměnu!",
  },
  {
    title: "To už Drběna četla!",
    text: "Žádný nový příběh se zatím neschovává. Aspoň něco přibyde na konto!",
  },
  {
    title: "Tajemství zatím došla!",
    text: "Všechny příběhy jsou odemčené. Drběna přece nenechá pergamen jen tak ležet!",
  },
  {
    title: "Méé, známá historie!",
    text: "Drběna už v kronice všechno objevila. Kdo hledá dál, nepřijde zkrátka!",
  },
] as const;

const FISH = [
  "Tady dole se toho děje víc než na kopidlenském náměstí!",
  "Něco jsem zaslechla… ale mám bobříka mlčení!",
  "Drběno, víš, proč ryby nemluví? Protože by se to hned rozneslo po Kopidlně!",
  "Já nic neříkám, ale kapři už o tom vědí!",
  "Na hladině klid, ale pod vodou se pěkně drbe!",
  "Drběno, slyšela jsem něco šťavnatého… ale mám to ještě za žábrami!",
  "Víš, co se povídá na druhém břehu? Já taky ne, tam neplavu!",
  "V Kopidlně se říká, že ryby mlčí. To nás ještě neznají!",
  "Zrovna jsem měla velký drb na jazyku. Jenže jsem spolkla háček!",
  "Drběno, tenhle drb je tak hluboký, že na něj nestačí ani náš rybník!",
];

const TALE_TITLES: Partial<Record<Kind, string>> = {
  fence: "Drběna a plot",
  pot: "Jablečná nehoda",
  dog: "Husí poplach",
  gardener: "Sousedka má novinky",
  car: "Kravské přežvykování",
  branch: "Rohy ve větvích",
  cyclist: "Cyklista s novinkami",
  laundry: "Prádlo na šňůře",
};

const LINES: Record<string, string[]> = {
  fence: [
    "Drběna chtěla zjistit, co se povídá za plotem. Teď má plot obtisknutý na čele!",
    "Za kopidlenským plotem se něco šuškalo. Drběna nastražila uši, ale zapomněla zabrzdit!",
    "V Kopidlně se drby šíří přes plot. Drběna vyzkoušela expresní doručení. Čelem!",
  ],
  pot: [
    "Drběna zakopla o jablka z Drahorazi. Než se zvedla, všechna je snědla!",
    "V Drahorazi se rozsypala jablka. Drběna snědla všechny důkazy dřív, než se z toho stal drb!",
    "Drběna šla po stopě šťavnatého drbu. Zbyl po ní jen prázdný košík a hromada ohryzků!",
  ],
  dog: [
    "Drběna se chtěla zeptat, co je nového. Husa spustila takový povyk, že už to ví celé Kopidlno!",
    "Husa měla žhavý drb z Kopidlna. Drběna ale zjistila jen to, že husa neumí šeptat!",
    "Drběna chtěla nenápadně zjistit, co je nového. Husa to vykejhakala tak hlasitě, že už to ví i v Pševsi!",
  ],
  gardener: [
    "Drběna potkala sousedku a zeptala se, co je nového. O tři hodiny později se konečně dostala ke slovu!",
    "Drběna se zeptala sousedky, co je nového v Kopidlně. Sousedka začala rokem 1998!",
    "Sousedka slíbila jeden krátký drb. Než ho dopověděla, mohl z něj být nový díl kopidlenské kroniky!",
  ],
  car: [
    "Drběna se chtěla podělit o drby. Kráva jen přežvykovala. Tak si rozuměly!",
    "Drběna se krávy zeptala, co je nového v Kopidlně. Ta jen zabučela. Zpráva se prý ještě ověřuje!",
    "Drběna chtěla od krávy tajný drb. Ta ho třikrát přežvýkala a nakonec spolkla!",
  ],
  branch: [
    "Drběna zahlédla na jabloni krásné listí. Jenže než se stihla zakousnout, zamotaly se jí do větví rohy!",
    "Drběna zaslechla v sadu šustění. Myslela, že někdo drbe. Byly to jen její rohy zamotané ve větvích!",
    "Drběna chtěla přinést do Kopidlna šťavnatou novinku. Z jabloně si ale odnesla jen listí mezi rohy!",
  ],
  cyclist: [
    "Drběna chtěla od cyklisty vyzvědět, co je nového v Mlýnci. Než se nadechla, byl i s drbem v Ledkově!",
    "Cyklista zazvonil a Drběna myslela, že nese novinku. Novinka zněla: uhni!",
    "Drběna a cyklista se srazili čely. On jel pro rohlíky, ona pro drby. Domů si oba odnesli bouli!",
  ],
  laundry: [
    "Drběna chtěla vědět, co se suší u sousedů. Teď to ví přesně: má to na rozích!",
    "Drběna proběhla pod šňůrou s hlavou nahoře. Ves si teď povídá o koze ve svatebním závoji!",
    "Prostěradlo vlálo jako vlajka s novinkou. Drběna k němu běžela, a novinka byla jen čerstvě vypraná!",
  ],
};

const SPEC: Record<Kind, { h: number; hitW: number; hitH: number; lift: number }> = {
  fence: { h: 0.62, hitW: 0.62, hitH: 0.78, lift: 0 },
  pot: { h: 0.5, hitW: 0.72, hitH: 0.62, lift: 0 },
  dog: { h: 0.66, hitW: 0.48, hitH: 0.7, lift: 0 },
  gardener: { h: 1.08, hitW: 0.36, hitH: 0.76, lift: 0 },
  car: { h: 0.78, hitW: 0.62, hitH: 0.55, lift: 0 },
  branch: { h: 1.02, hitW: 0.84, hitH: 0.52, lift: 0 },
  // Jezdec na kole: naráží se jen do středu (rám a nohy), kola a hlava jsou mimo, ať je přeskok přívětivý.
  cyclist: { h: 1.12, hitW: 0.42, hitH: 0.66, lift: 0 },
  // Prádlo na šňůře ve vsi: prostěradlo visí tak, že se pod ním dá jen podlézt (box v entBox).
  laundry: { h: 1.27, hitW: 0, hitH: 0, lift: 0 },
  gossip: { h: 0.42, hitW: 0.62, hitH: 0.62, lift: 0.14 },
  heart: { h: 0.32, hitW: 0.7, hitH: 0.7, lift: 0.72 },
  scroll: { h: 0.5, hitW: 0.55, hitH: 0.62, lift: 0.48 },
  bush: { h: 0.46, hitW: 0, hitH: 0, lift: 0 },
  lamp: { h: 1.42, hitW: 0, hitH: 0, lift: 0 },
  tree: { h: 1.85, hitW: 0, hitH: 0, lift: 0 },
  "forest-oak": { h: 1.75, hitW: 0, hitH: 0, lift: 0 },
  "forest-birch": { h: 1.85, hitW: 0, hitH: 0, lift: 0 },
  "forest-pine": { h: 2.0, hitW: 0, hitH: 0, lift: 0 },
  "forest-spruce": { h: 2.0, hitW: 0, hitH: 0, lift: 0 },
  "forest-linden": { h: 1.7, hitW: 0, hitH: 0, lift: 0 },
  "forest-maple": { h: 1.65, hitW: 0, hitH: 0, lift: 0 },
  "forest-rowan": { h: 1.4, hitW: 0, hitH: 0, lift: 0 },
  "forest-willow": { h: 1.6, hitW: 0, hitH: 0, lift: 0 },
  bench: { h: 0.5, hitW: 0, hitH: 0, lift: 0 },
  pigeon: { h: 0.36, hitW: 0, hitH: 0, lift: 0 },
  bin: { h: 0.56, hitW: 0, hitH: 0, lift: 0 },
  houses: { h: 1.55, hitW: 0, hitH: 0, lift: 0 },
  castle: { h: 2.35, hitW: 0, hitH: 0, lift: 0 },
  greenhouse: { h: 2.15, hitW: 0, hitH: 0, lift: 0 },
  pond: { h: 1.85, hitW: 0, hitH: 0, lift: 0.02 },
  // Krucifix a zvonička jsou stejně vysoké a nižší než škola.
  "mlynec-cross": { h: 1.15, hitW: 0, hitH: 0, lift: 0 },
  "mlynec-bell": { h: 1.15, hitW: 0, hitH: 0, lift: 0 },
  "mlynec-house": { h: 1.47, hitW: 0, hitH: 0, lift: 0 },
  "mlynec-school": { h: 1.55, hitW: 0, hitH: 0, lift: 0 },
  // Rybník Zrcadlo v Mlýnci: jen kulisa (ryba vyskakuje jen ze Zámeckého rybníka v Kopidlně, kind "pond").
  "mlynec-pond": { h: 1.45, hitW: 0, hitH: 0, lift: 0 },
  "ledkov-a": { h: 1.32, hitW: 0, hitH: 0, lift: 0 },
  "ledkov-b": { h: 1.32, hitW: 0, hitH: 0, lift: 0 },
  "drahoraz-church": { h: 2.05, hitW: 0, hitH: 0, lift: 0 },
  "drahoraz-tower": { h: 1.38, hitW: 0, hitH: 0, lift: 0 },
  "apple-0": { h: 1.48, hitW: 0, hitH: 0, lift: 0 },
  "apple-1": { h: 1.42, hitW: 0, hitH: 0, lift: 0 },
  "apple-2": { h: 1.28, hitW: 0, hitH: 0, lift: 0 },
  linden: { h: 1.72, hitW: 0, hitH: 0, lift: 0 },
  "pseves-heart": { h: 1.02, hitW: 0, hitH: 0, lift: 0 },
  "pseves-house": { h: 1.5, hitW: 0, hitH: 0, lift: 0 },
  // Radnice na kraji Kopidlna (jen při návratu z vesnic): vysoká trojpatrová budova s erbem ve štítu.
  radnice: { h: 1.85, hitW: 0, hitH: 0, lift: 0 },
  obora: { h: 2.2, hitW: 0, hitH: 0, lift: 0 },
  stag: { h: 1.5, hitW: 0, hitH: 0, lift: 0 },
  firefly: { h: 0.22, hitW: 1, hitH: 1, lift: 0.9 },
  column: { h: 1.7, hitW: 0, hitH: 0, lift: 0 },
  church: { h: 2.2, hitW: 0, hitH: 0, lift: 0 },
  school: { h: 1.45, hitW: 0, hitH: 0, lift: 0 },
  info: { h: 0.78, hitW: 0, hitH: 0, lift: 0 },
  "sign-mlynec": { h: 1.05, hitW: 0, hitH: 0, lift: 0 },
  "sign-ledkov": { h: 1.05, hitW: 0, hitH: 0, lift: 0 },
  "sign-drahoraz": { h: 1.05, hitW: 0, hitH: 0, lift: 0 },
  "sign-pseves": { h: 1.05, hitW: 0, hitH: 0, lift: 0 },
  "sign-kopidlno": { h: 1.05, hitW: 0, hitH: 0, lift: 0 },
};

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const ART_REV = "41";

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.src = `${src}?v=${ART_REV}`;
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

export function emptyHud(): Hud {
  return {
    phase: "loading",
    score: 0,
    best: 0,
    bestGossips: 0,
    gossips: 0,
    combo: 0,
    lives: 3,
    bonusLife: false,
    biome: "Náměstí",
    fact: null,
    factLabel: "",
    factComplete: false,
    chronicleNew: 0,
    scrolls: 0,
    scrollsTotal: 0,
    newBest: false,
    muted: false,
    coach: true,
    line: "",
    showTale: false,
    taleTag: "Příhoda",
    taleTitle: "",
    ready: false,
    progress: 0,
    bonus: null,
    stagDialogue: null,
    fishDialogue: null,
    erbQuiz: null,
  };
}

export class Runner {
  private ctx: CanvasRenderingContext2D | null;
  private sfx = new Sfx();
  private art: Art = {};
  private farBakes = new WeakMap<HTMLImageElement, Map<number, HTMLCanvasElement>>();
  /** Předkreslené obrázky podle výšky; víc výšek na obrázek (stromy v lese mají několik velikostí). */
  private bakes = new WeakMap<HTMLImageElement, Map<number, HTMLCanvasElement>>();
  private raf = 0;
  private alive = true;
  private last = 0;
  private acc = 0;
  private emitAcc = 0;
  private viewW = 800;
  private viewH = 450;
  private scale = 1;
  private cssW = 800;
  private sized = false;
  private groundY = 400;
  private u = 120;
  private jumpSpeed = 500;
  private gravity = 2000;
  private camera = 0;
  private run = 0;
  private speed = 220;
  private ro: ResizeObserver | null = null;
  private phase: Phase = "loading";
  private feet = 400;
  private vy = 0;
  private onGround = true;
  private keyJump = false;
  private keyDuck = false;
  private touchJump = false;
  private touchDuck = false;
  private jumpEdge = false;
  private duckLock = 0;
  private coyote = 0;
  private jumpBuffer = 0;
  private suppress = 0;
  private lock = 0;
  private anim = 0;
  private time = 0;
  private invuln = 0;
  private shake = 0;
  private flash = 0;
  private lives = 3;
  /** Chvilka oddechu po dvou nárazech krátce za sebou (src/game/difficulty.ts). */
  private lastHit = -100;
  private mercy = 0;
  private mercyUntil = 0;
  /** Rychlejší rozjezd pro hráče s rekordem aspoň za první kolo. */
  private warm = false;
  private bonusLife = false;
  private gossips = 0;
  private gossipScore = 0;
  /** Seconds of actual running in this game (pauses, dialogues and bonus games excluded), sent with the score. */
  private playSeconds = 0;
  private combo = 0;
  private lastCollect = -10;
  private fact: { title: string; text: string } | null = null;
  private factLabel = "";
  private factComplete = false;
  private lastCompleteMessage = -1;
  private factLife = 0;
  private chronicleNew = 0;
  private scrollsKnown = 0;
  private readonly scrollsTotal = pageIds().length;
  private ents: Ent[] = [];
  private pops: Pop[] = [];
  /** Drběna stojí u radnice a kouká nahoru na erb (zbývající sekundy); u každé radnice jednou. */
  private gaze = 0;
  private gazeAt: Ent | null = null;
  private gazed = new WeakSet<Ent>();
  private gazeAsked = false;
  private gazeTotal = RADNICE_GAZE;
  /** Zavolá se, když Drběna u radnice dokouká na erb (sem se napojí budoucí minihra u radnice). */
  onRadnice: (() => void) | null = null;
  private erbQuiz: ErbQuizRound | null = null;
  private lastErbQuestionId: string | null = null;
  private bits: Bit[] = Array.from({ length: 80 }, () => ({
    on: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    max: 1,
    color: "#fff",
    size: 3,
    star: false,
  }));
  private hazardCursor = 400;
  private nextScroll = 0;
  private scrolls = 0;
  private scrollsRun = 0;
  private decorCursor = 0;
  private nextChunk = 0;
  private oboraSpans: { from: number; to: number }[] = [];
  private approaches: { from: number; to: number; village: number; label: string; place: PlaceId }[] = [];
  private villageZones: { from: number; to: number; name: string; id: PlaceId }[] = [];
  private lastHazard: Kind | null = null;
  private hitKind: Kind | null = null;
  private loaded = 0;
  private loadTotal = 1;
  private ready = false;
  private fish = 0;
  private fishDialogue: string | null = null;
  private fishAge = 0;
  private fishX = 0;
  private lastFish = -1;
  private fishTold = -1;
  private bonus: AnyBonus | null = null;
  private taleTag = "Příhoda";
  private taleTitle = "";
  private tale = "";
  private taleLife = 0;
  private lastTale: Partial<Record<Kind, number>> = {};
  private talk = 0;
  private newBest = false;
  private best = 0;
  private bestGossips = 0;
  private muted = false;
  private coachJump = false;
  private coachDuck = false;
  private dust = 0;
  private prevPadJump = false;
  private prevStart = false;
  private padJump = false;
  private padDuck = false;
  private padHunt = 0;
  private padLive = false;
  private pondsDirty = true;
  private forceMeet = false;
  private stagDialogueIndex = 0;
  private stagDialogueDeer: Ent | null = null;
  private stagDialogueStory: StagStory | null = null;
  private stagMeetings = 0;
  private cullMargin = 900;
  private skyGrad: CanvasGradient | null = null;
  private skyTop = "";
  private skyBot = "";
  private skyGround = -1;
  private flowerX: [number[], number[], number[]] = [[], [], []];
  private playerX = 160;

  constructor(
    private canvas: HTMLCanvasElement,
    private onHud: (hud: Hud) => void,
  ) {
    this.ctx = canvas.getContext("2d");
    this.loadSave();
    // Migrates the old one-record-per-device save into the first player on first run.
    this.useRecordOf(currentProfile());
    this.stagMeetings = loadProgress().stagMeetings;
  }

  start() {
    this.resize();
    this.bind();
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    void this.bootstrap();
  }

  destroy() {
    this.alive = false;
    this.sfx.stopMusic();
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVis);
    this.ro?.disconnect();
  }

  pressJump(down: boolean) {
    this.unlock();
    this.touchJump = down;
    if (down) this.jumpEdge = true;
  }

  pressDuck(down: boolean) {
    this.unlock();
    this.touchDuck = down;
    if (down) this.coachDuck = true;
  }

  toggleMute() {
    this.unlock();
    this.muted = !this.muted;
    this.sfx.setMuted(this.muted);
    this.save();
    this.pushHud(true);
  }

  togglePause() {
    if (this.phase === "bonus" || this.phase === "dialogue" || this.phase === "fish-intro" || this.phase === "erb-quiz") return;
    if (this.phase === "play") this.phase = "pause";
    else if (this.phase === "pause") this.phase = "play";
    this.pushHud(true);
  }

  continueFishDialogue() {
    if (this.phase !== "dialogue" || this.fishDialogue === null) return;
    this.fishDialogue = null;
    this.phase = "play";
    // Po potvrzení nečekat na odpočet. Ryba se na pozadí ještě krátce ponoří.
    this.fish = 1.05;
    this.talk = 0;
    this.suppress = Math.max(this.suppress, 0.5);
    this.releaseInputs();
    this.pushHud(true);
  }

  advanceStagDialogue(skip = false) {
    if (this.phase !== "dialogue") return;
    const lines = this.stagDialogueStory?.lines;
    if (!skip && lines && this.stagDialogueIndex + 1 < lines.length) {
      this.stagDialogueIndex += 1;
      this.pushHud(true);
      return;
    }
    // Postup zachovat i po přeskočení: další setkání má přinést nové povídání.
    if (this.stagDialogueStory) {
      this.stagMeetings += 1;
      saveProgress({ ...loadProgress(), stagMeetings: this.stagMeetings });
    }
    const deer = this.stagDialogueDeer;
    if (deer?.alive) {
      deer.sway = 3; // Jelen se rozloučí skokem a odběhne.
      deer.wait = 0;
    }
    this.stagDialogueDeer = null;
    this.stagDialogueStory = null;
    this.stagDialogueIndex = 0;
    this.phase = "play";
    this.suppress = Math.max(this.suppress, 0.5);
    this.pushHud(true);
  }

  bonusAct(action: BonusAction) {
    if (this.phase !== "bonus" || !this.bonus) return;
    const next = actBonus(this.bonus, action);
    if (next.events?.length) this.playAlarm(next.events);
    if (next.grant > 0) this.grantBonus(next.grant);
    if (next.resume || !next.state) this.resumeRun();
    else {
      this.bonus = next.state;
      this.pushHud(true);
    }
  }

  /** Volá onRadnice po animaci pohledu na erb. Běh zůstane zastavený do odpovědi. */
  openErbQuiz() {
    if (this.phase !== "play" || this.erbQuiz) return;
    // Hádanky se neopakují, dokud hráč neprojde všechny (pamatuje se u hráče, progress.ts).
    const progress = loadProgress();
    this.erbQuiz = createErbQuiz(this.lastErbQuestionId, Math.random, progress.erbSeen);
    this.lastErbQuestionId = this.erbQuiz.id;
    const all = erbQuestionIds();
    const seen = all.every((id) => progress.erbSeen.includes(id) || id === this.erbQuiz!.id) ? [this.erbQuiz.id] : [...progress.erbSeen, this.erbQuiz.id];
    saveProgress({ ...loadProgress(), erbSeen: seen });
    this.phase = "erb-quiz";
    this.releaseInputs();
    this.sfx.fact();
    this.pushHud(true);
  }

  answerErb(index: number) {
    if (this.phase !== "erb-quiz" || !this.erbQuiz) return;
    const result = answerErbQuiz(this.erbQuiz, index);
    if (result === this.erbQuiz) return;
    if (index === result.correct) {
      // Stejné odpuštění jedné příhody jako u ryby: nejvýše čtyři životy.
      const healed = healFromBonus(this.lives);
      this.lives = healed.lives;
      this.erbQuiz = { ...result, lifeGranted: healed.gained };
    } else {
      this.erbQuiz = result;
    }
    if (result.earned > 0) {
      this.gossipScore += result.earned;
      this.pops.push({ x: this.playerX, y: this.feet - this.u * 0.8, text: "+" + result.earned, life: 0.9 });
      this.sfx.collect(4);
      if (this.erbQuiz.lifeGranted) this.sfx.collect(2);
    }
    this.pushHud(true);
  }

  finishErbQuiz() {
    if (this.phase !== "erb-quiz") return;
    this.erbQuiz = null;
    this.phase = "play";
    this.suppress = Math.max(this.suppress, 0.65);
    this.releaseInputs();
    this.pushHud(true);
  }

  /** Lets the UI hold the first start from the menu (e.g. to ask for a name). Return false to stay in the menu. */
  startGate: (() => boolean) | null = null;

  begin() {
    if (this.phase === "menu" && this.startGate && !this.startGate()) return;
    this.unlock();
    this.sfx.restartMusic();
    this.phase = "play";
    this.camera = 0;
    this.run = 0;
    this.feet = this.groundY;
    this.vy = 0;
    this.onGround = true;
    this.duckLock = 0;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumpEdge = false;
    this.suppress = 0.2;
    this.lock = 0;
    this.invuln = 0;
    this.shake = 0;
    this.flash = 0;
    this.lives = 3;
    this.lastHit = -100;
    this.gaze = 0;
    this.gazeAt = null;
    this.erbQuiz = null;
    this.mercy = 0;
    this.mercyUntil = 0;
    this.warm = this.best >= WARM_BEST;
    this.stagMeetings = loadProgress().stagMeetings;
    this.bonusLife = false;
    this.gossips = 0;
    this.gossipScore = 0;
    this.playSeconds = 0;
    this.combo = 0;
    this.lastCollect = -10;
    this.fact = null;
    this.factLabel = "";
    this.factComplete = false;
    this.factLife = 0;
    this.chronicleNew = 0;
    this.scrollsKnown = knownIds().length;
    this.ents = [];
    this.oboraSpans = [];
    this.approaches = [];
    this.villageZones = [];
    this.pops = [];
    this.hazardCursor = this.viewW * 0.92;
    this.nextScroll = this.viewW * (0.35 + Math.random() * 0.7);
    this.scrollsRun = 0;
    this.decorCursor = -20;
    this.nextChunk = 0;
    this.lastHazard = null;
    this.altFlip = {};
    this.hitKind = null;
    this.tale = "";
    this.taleTitle = "";
    this.taleLife = 0;
    this.talk = 0;
    this.newBest = false;
    this.coachJump = false;
    this.coachDuck = false;
    this.lastFish = -1;
    this.fishTold = -1;
    this.fish = 0;
    this.fishDialogue = null;
    this.fishAge = 0;
    this.bonus = null;
    this.forceMeet = false;
    this.stagDialogueDeer = null;
    this.stagDialogueStory = null;
    this.stagDialogueIndex = 0;
    this.fillWorld();
    this.pushHud(true);
    reportPlayer();
  }

  beginAtStag() {
    this.begin();
    this.forceMeet = true;
    const gate = this.oboraLayout(7).start;
    this.camera = Math.max(0, gate - this.playerX - this.viewW * 1.15);
    this.run = this.camera;
    this.ents = [];
    this.oboraSpans = [];
    this.approaches = [];
    this.villageZones = [];
    this.pops = [];
    this.decorCursor = this.camera - 20;
    this.hazardCursor = this.camera + this.viewW * 0.45;
    this.nextScroll = this.camera + this.viewW;
    this.nextChunk = Math.max(0, stageIndex(this.camera - this.viewW));
    this.fillWorld();
    this.pushHud(true);
  }

  private async bootstrap() {
    const names = [
      "fence",
      "pot",
      "gardener",
      "branch",
      "car",
      "bush",
      "lamp",
      "tree",
      "bench",
      "pigeon",
      "bin",
      "houses",
      "castle",
      "greenhouse",
      "pond",
      "mlynec-cross",
      "mlynec-bell",
      "mlynec-pond",
      "mlynec-school",
      "ledkov-a",
      "ledkov-b",
      "drahoraz-church",
      "drahoraz-tower",
      "apple-0",
      "apple-1",
      "apple-2",
      "linden",
      "pseves-house",
      "radnice",
      "pseves-heart",
      "column",
      "church",
      "school",
      "info",
      "dog",
      "cyclist",
      "laundry",
      "forest-oak",
      "forest-birch",
      "forest-pine",
      "forest-spruce",
      "forest-linden",
      "forest-maple",
      "forest-rowan",
      "forest-willow",
      ...SIGNS,
      "gossip",
      "scroll",
      "fish",
    ] as const;
    const frames = ["jump", "duck", "run", "idle"] as const;
    this.loaded = 0;
    this.loadTotal = names.length + frames.length * 4 + 13 + LOOK_FRAMES + PIGEON_FLY_FRAMES + GOOSE_FLAP_FRAMES + GARDENER_WATER_FRAMES + CYCLIST_PEDAL_FRAMES + 4;
    this.ready = false;
    const rest = Promise.all([
      this.loadFramesCounted("jump"),
      this.loadFramesCounted("duck"),
      ...names.map((name) =>
        this.loadCounted(publicUrl(name === "scroll" ? "/game/scroll-prize.webp" : `/game/${name}.webp`)),
      ),
    ]).then((loaded) => {
      if (!this.alive) return;
      const [jump, duck, ...singles] = loaded;
      this.art.jump = jump;
      this.art.duck = duck;
      names.forEach((name, i) => {
        this.art[name] = singles[i] ?? null;
      });
    });
    const scenery = Promise.all([
      this.loadCounted(publicUrl("/game/obora-start.webp")),
      this.loadCounted(publicUrl("/game/obora-mid.webp")),
      this.loadCounted(publicUrl("/game/obora-end.webp")),
      this.loadCounted(publicUrl("/game/stag.webp")),
      this.loadCounted(publicUrl("/game/oak.webp")),
    ]).then((loaded) => {
      if (!this.alive) return;
      this.art.oboraStart = loaded[0];
      this.art.oboraMid = loaded[1];
      this.art.oboraEnd = loaded[2];
      this.art.stag = loaded[3];
      this.art.oak = loaded[4];
    });
    const hero = Promise.all([
      this.loadFramesCounted("run"),
      this.loadFramesCounted("idle"),
      this.loadFramesCounted("stag-run"),
      this.loadFramesCounted("stag-idle"),
      this.loadFramesCounted("look", LOOK_FRAMES),
      this.loadFramesCounted("pigeon-fly", PIGEON_FLY_FRAMES),
      this.loadFramesCounted("goose-flap", GOOSE_FLAP_FRAMES),
      this.loadFramesCounted("gardener-water", GARDENER_WATER_FRAMES),
      this.loadFramesCounted("cyclist-pedal", CYCLIST_PEDAL_FRAMES),
      // Původní cyklista po vrstvách: kola se točí zvlášť (cyclist-base, -wheel-front/-rear, -over).
      Promise.all(["base", "wheel-front", "wheel-rear", "over"].map((part) => this.loadCounted(publicUrl(`/game/cyclist-${part}.webp`)))),
    ]).then(([run, idle, stagRun, stagIdle, look, pigeonFly, gooseFlap, gardenerWater, cyclistPedal, cyclistParts]) => {
      if (!this.alive) return;
      this.art.run = run;
      this.art.idle = idle;
      this.art.stagRun = stagRun;
      this.art.stagIdle = stagIdle;
      this.art.look = look;
      this.art.pigeonFly = pigeonFly;
      this.art.gooseFlap = gooseFlap;
      this.art.gardenerWater = gardenerWater;
      this.art.cyclistPedal = cyclistPedal;
      const [base, front, rear, over] = cyclistParts;
      this.art.cyclistBase = base ?? null;
      this.art.cyclistFront = front ?? null;
      this.art.cyclistRear = rear ?? null;
      this.art.cyclistOver = over ?? null;
    });
    if (!this.alive) return;
    this.openMenu();
    await Promise.all([hero, rest, scenery]);
  }

  private loadCounted(src: string) {
    return loadImage(src).finally(() => {
      this.loaded += 1;
      if (this.loaded >= this.loadTotal) this.ready = true;
      this.pushHud(true);
    });
  }

  private loadFramesCounted(name: string, count = 4) {
    return Promise.all(
      Array.from({ length: count }, (_, i) => this.loadCounted(publicUrl(`/game/${name}/${i}.webp`))),
    ).then((frames) => frames.filter((frame): frame is HTMLImageElement => frame !== null));
  }

  private openMenu() {
    this.phase = "splash";
    this.camera = 0;
    this.run = 0;
    this.feet = this.groundY;
    this.vy = 0;
    this.onGround = true;
    this.ents = [];
    this.oboraSpans = [];
    this.approaches = [];
    this.villageZones = [];
    this.stagDialogueDeer = null;
    this.stagDialogueStory = null;
    this.stagDialogueIndex = 0;
    this.fishDialogue = null;
    this.fish = 0;
    this.fishAge = 0;
    this.decorCursor = -30;
    this.nextChunk = 0;
    this.hazardCursor = 999999;
    this.fillWorld();
    this.pushHud(true);
  }

  continueSplash() {
    if (this.phase !== "splash" || !this.ready) return;
    this.unlock();
    this.phase = "menu";
    this.pushHud(true);
  }

  private bind() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVis);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.canvas);
  }

  private onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    // Typing a name must not jump, start the game or toggle pause/mute.
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
    const code = event.code;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) event.preventDefault();
    this.unlock();
    if (this.phase === "dialogue") {
      // Nenechat Enter/mezeru zároveň aktivovat tlačítko a posunout dialog podruhé.
      if (["Enter", "Space", "ArrowRight", "Escape"].includes(code)) event.preventDefault();
      if (!event.repeat && (code === "Enter" || code === "Space" || code === "ArrowRight")) {
        if (this.fishDialogue !== null) this.continueFishDialogue();
        else this.advanceStagDialogue();
      } else if (!event.repeat && code === "Escape") {
        if (this.fishDialogue !== null) this.continueFishDialogue();
        else this.advanceStagDialogue(true);
      }
      return;
    }
    if (this.phase === "erb-quiz") {
      if (["Space", "Enter", "Escape", "Digit1", "Digit2", "Digit3", "Numpad1", "Numpad2", "Numpad3"].includes(code)) event.preventDefault();
      // Tlačítka v dialogu mají vlastní nativní klávesové ovládání.
      if (target?.closest("button, a")) return;
      if (!event.repeat && /^((Digit|Numpad)[1-3])$/.test(code)) this.answerErb(Number(code.slice(-1)) - 1);
      else if (!event.repeat && code === "Escape") this.finishErbQuiz();
      else if (!event.repeat && (code === "Space" || code === "Enter") && this.erbQuiz?.selected !== null) this.finishErbQuiz();
      return;
    }
    if (this.phase === "bonus" || this.phase === "fish-intro") return;
    if (this.phase === "splash") {
      if (!event.repeat && (code === "Space" || code === "Enter" || code === "ArrowUp" || code === "KeyW")) this.continueSplash();
      return;
    }
    if (code === "Space" || code === "ArrowUp" || code === "KeyW") {
      if (!event.repeat) {
        if (this.phase === "menu" || (this.phase === "over" && this.lock <= 0)) this.begin();
        else this.jumpEdge = true;
      }
      this.keyJump = true;
    } else if (code === "ArrowDown" || code === "KeyS") {
      this.keyDuck = true;
      this.coachDuck = true;
    } else if (code === "KeyP" || code === "Escape") {
      this.togglePause();
    } else if (code === "Enter") {
      if (this.phase === "menu" || (this.phase === "over" && this.lock <= 0)) this.begin();
    } else if (code === "KeyJ") {
      if (this.phase === "menu" || this.phase === "play" || (this.phase === "over" && this.lock <= 0)) this.beginAtStag();
    } else if (code === "KeyM") {
      this.toggleMute();
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") this.keyJump = false;
    if (event.code === "ArrowDown" || event.code === "KeyS") this.keyDuck = false;
  };

  private onBlur = () => {
    this.keyJump = false;
    this.keyDuck = false;
    this.touchJump = false;
    this.touchDuck = false;
  };

  private onVis = () => {
    if (document.hidden && this.phase === "play") {
      this.phase = "pause";
      this.pushHud(true);
    } else {
      this.sfx.resume();
    }
  };

  private swipe: { x: number; y: number } | null = null;

  private onPointerDown = (event: PointerEvent) => {
    this.unlock();
    this.swipe = { x: event.clientX, y: event.clientY };
  };

  private onPointerUp = (event: PointerEvent) => {
    if (!this.swipe) return;
    const dx = event.clientX - this.swipe.x;
    const dy = event.clientY - this.swipe.y;
    this.swipe = null;
    if (this.phase === "menu" || (this.phase === "over" && this.lock <= 0)) {
      this.begin();
      return;
    }
    if (this.phase !== "play") return;
    if (dy > 36 && Math.abs(dy) > Math.abs(dx)) {
      this.duckLock = Math.max(this.duckLock, 0.38);
      this.coachDuck = true;
      return;
    }
    if (Math.abs(dx) < 48 && dy < 30) this.jumpEdge = true;
  };

  private unlock() {
    this.sfx.unlock();
    this.sfx.setMuted(this.muted);
  }

  private resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = this.canvas.clientWidth || window.innerWidth;
    const cssH = this.canvas.clientHeight || window.innerHeight;
    const width = Math.max(1, Math.round(cssW * dpr));
    const height = Math.max(1, Math.round(cssH * dpr));
    if (this.sized && this.canvas.width === width && this.canvas.height === height) return;
    this.sized = true;
    this.cssW = cssW;
    this.canvas.width = width;
    this.canvas.height = height;
    this.viewW = cssW < 560 ? 530 : cssW < 980 ? 760 : 1000;
    this.scale = (cssW * dpr) / this.viewW;
    this.viewH = (cssH * dpr) / this.scale;
    // Pod tlačítky Skok a Pokrčit je na Androidu ještě pruh navigace gesty (safe-area-inset-bottom).
    const barCss = (cssW < 860 ? 118 : 36) + safeBottom();
    const bar = barCss * (this.viewW / Math.max(1, cssW));
    this.groundY = this.viewH - bar - 8;
    this.u = Math.min(156, Math.max(112, this.viewW * 0.25));
    this.cullMargin = this.visualHalf("pond") + this.u * 3;
    this.playerX = this.viewW * 0.24;
    const jumpH = this.u * 1.35;
    const air = 0.92;
    this.jumpSpeed = (4 * jumpH) / air;
    this.gravity = (8 * jumpH) / (air * air);
    if (this.onGround) this.feet = this.groundY;
    const pace = this.viewW < 600 ? 1.18 : 1;
    this.speed0 = 255 * (this.viewW / 740) * pace;
    this.speedMax = 500 * (this.viewW / 740) * pace;
    this.skyGrad = null;
    this.bakes = new WeakMap();
    this.farBakes = new WeakMap();
    this.pondsDirty = true;
  }

  private speed0 = 250;
  private speedMax = 480;

  private loop(now: number) {
    if (!this.alive) return;
    try {
      const dt = Math.min(0.05, (now - this.last) / 1000 || 0);
      this.last = now;
      this.acc += dt;
      let steps = 0;
      while (this.acc >= 1 / 60 && steps < 5) {
        this.step(1 / 60);
        this.acc -= 1 / 60;
        steps += 1;
      }
      this.draw();
      // Minihry (ryba i erbovní hádanka u radnice) a rozhovor s jelenem mají vlastní hudbu, potom hlavní smyčka pokračuje.
      const mode = this.phase === "menu"
        ? "intro"
        : this.phase === "bonus" || this.phase === "erb-quiz"
          ? "mini"
          : this.phase === "dialogue" && this.stagDialogueStory
            ? "stag"
            : this.phase === "play" || this.phase === "dialogue" || this.phase === "fish-intro"
            ? "loop"
            : "off";
      let tempo = 1;
      if (this.phase === "play") {
        const pace = this.speed0 > 0 ? this.speed / this.speed0 : 1;
        const running = this.talk <= 0 && this.fish <= 0;
        tempo = running ? 1 + Math.min(0.1, Math.max(0, (pace - 1) * 0.06)) : 0.98;
      }
      this.sfx.tick(mode, tempo);
      this.emitAcc += dt;
      if (this.emitAcc > 0.12) {
        this.emitAcc = 0;
        this.pushHud(false);
      }
    } catch {
      const lost = !this.ctx || this.ctx.isContextLost();
      if (lost) {
        this.skyGrad = null;
        this.bakes = new WeakMap();
    this.farBakes = new WeakMap();
        this.ctx = this.canvas.getContext("2d");
      }
    } finally {
      if (this.alive) this.raf = requestAnimationFrame(this.loop);
    }
  }

  private currentSpeed(): number {
    if (this.phase === "menu") return this.speed0 * 0.62;
    // Pomalý a dlouhý rozjezd: plná rychlost až ve třetím kole, pak ještě kousek navíc (difficulty.ts).
    const { fraction, extra } = speedShape(this.run / CYCLE_LEN, this.warm);
    const base = this.speed0 + (this.speedMax - this.speed0) * fraction;
    return base * (1 + extra) * mercySlow(this.mercy) * this.oboraPace() * this.stagWonder() * this.radnicePace();
  }

  private stagWonder(): number {
    const x = this.camera + this.playerX;
    let hold = 0;
    for (const ent of this.ents) {
      if (ent.kind !== "stag") continue;
      const ahead = ent.x - x;
      let t = 0;
      const phase = ent.sway ?? 0;
      const meet = (ent.face ?? 0) === 1;
      if (phase < 1) {
        t = 1 - Math.min(1, Math.max(0, ahead) / (this.viewW * 2.15));
      } else if (meet ? phase < 4 : phase === 1) {
        t = 1;
      } else {
        t = Math.max(0, 1 - Math.max(0, x - ent.x) / (this.viewW * 0.45));
      }
      if (t > hold) hold = t;
    }
    const smooth = hold * hold * (3 - 2 * hold);
    return 1 - 0.55 * smooth;
  }

  private oboraPace(): number {
    const x = this.camera + this.playerX;
    const ease = this.viewW * 0.55;
    let hold = 0;
    for (const span of this.oboraSpans) {
      const into = (x - span.from) / ease + 0.15;
      const out = (span.to - x) / ease + 0.15;
      const t = Math.max(0, Math.min(1, into, out));
      if (t > hold) hold = t;
    }
    const smooth = hold * hold * (3 - 2 * hold);
    return 1 - 0.18 * smooth;
  }

  private step(dt: number) {
    this.time += dt;
    this.pollPad();
    if (this.phase === "loading" || this.phase === "splash") return;
    if (this.phase === "fish-intro") {
      // Animace běží bez panelu: Drběna stojí a ryba se pomalu vynoří.
      this.anim += dt * 2;
      this.fishAge += dt;
      if (this.fishAge >= FISH_RISE_SECONDS) {
        this.phase = this.bonus ? "bonus" : "dialogue";
        this.pushHud(true);
      }
      this.decayJuice(dt);
      return;
    }
    if (this.phase === "pause" || this.phase === "bonus" || this.phase === "dialogue" || this.phase === "erb-quiz") {
      if (this.phase === "dialogue") {
        this.anim += dt * 2;
        // Hláška ryby už nemá časový limit; ryba zůstane nad vodou do potvrzení.
        if (this.fishDialogue !== null) this.fishAge += dt;
      }
      if (this.phase === "bonus") {
        this.anim += dt * 3;
        this.fishAge += dt;
        if (this.bonus?.id === "alarm" && this.bonus.stage === "play") {
          const next = tickAlarm(this.bonus, dt);
          this.bonus = next.state;
          if (next.events.length) this.playAlarm(next.events);
          if (next.grant > 0) this.grantBonus(next.grant);
          this.pushHud(true);
        }
      }
      this.decayJuice(dt);
      return;
    }
    if (this.phase === "over") {
      this.lock = Math.max(0, this.lock - dt);
      if (!this.onGround) {
        this.vy = Math.min(this.vy + this.gravity * dt, this.jumpSpeed);
        this.feet += this.vy * dt;
        if (this.feet >= this.groundY) {
          this.feet = this.groundY;
          this.vy = 0;
          this.onGround = true;
        }
      }
      this.decayJuice(dt);
      return;
    }

    // Oznámení z kroniky má přednost. Příhoda počká a neztratí se,
    // dokud se zobrazuje nově objevená stránka nebo dokončená kronika.
    if (this.taleLife > 0 && this.fish <= 0 && this.factLife <= 0) {
      this.taleLife = Math.max(0, this.taleLife - dt);
      if (this.taleLife === 0) this.pushHud(true);
    }
    if (this.talk > 0) {
      this.talk = Math.max(0, this.talk - dt);
      if (this.fish > 0) {
        this.fish = Math.max(0, this.fish - dt);
        this.anim += dt * 3;
        if (this.fish === 0) {
          this.tale = "";
          this.taleLife = 0;
          this.taleTag = "Příhoda";
          this.pushHud(true);
        }
      }
      this.decayJuice(dt);
      return;
    }
    // Krátká animace ponoření po stisku „Pokračovat“, ale běh už nezdržuje.
    if (this.fish > 0) {
      this.fish = Math.max(0, this.fish - dt);
      this.fishAge += dt;
    }

    if (this.phase === "play") this.watchRadnice(dt);
    const speed = this.phase === "play" && this.holds() ? 0 : this.currentSpeed();
    this.speed = speed;
    this.camera += speed * dt;
    if (this.phase === "play") {
      this.run += speed * dt;
      this.playSeconds += dt;
    }
    this.herdStags(dt);
    this.spookPigeons(dt);
    this.rideCyclists(dt);

    if (this.phase === "play") this.simPlayer(dt);
    else {
      this.feet = this.groundY;
      this.onGround = true;
      this.anim += dt * 10;
    }

    this.fillWorld();
    if (this.phase === "play") this.collisions();
    this.sweep();
    if (this.phase === "play") this.maybeFish();
    this.decayJuice(dt);
    if (this.factLife > 0) {
      this.factLife -= dt;
      if (this.factLife <= 0) {
        this.fact = null;
        this.factLabel = "";
        this.factComplete = false;
      }
    }
  }

  /** Místo pod štítem radnice, kde Drběna zastaví a kouká na erb. */
  private radniceSpot(ent: Ent): number {
    return ent.x - this.u * 0.55;
  }

  /** Klidný úsek před radnicí (před místem zastavení): bez překážek, bez skoku a přikrčení, zpomaluje se. */
  private radniceCalm(): number {
    return Math.max(this.viewW * 0.9, this.u * 5);
  }

  /** Kolik zbývá k místu zastavení u radnice, když je Drběna v klidném úseku před ní; jinak null. */
  private radniceAhead(): number | null {
    const here = this.camera + this.playerX;
    const calm = this.radniceCalm();
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "radnice" || this.gazed.has(ent)) continue;
      const left = this.radniceSpot(ent) - here;
      if (left >= 0 && left <= calm) return left;
    }
    return null;
  }

  /** Před radnicí Drběna plynule zpomalí (posledních ~3 u na 55 %), ať zastavení nepůsobí jako náraz. */
  private radnicePace(): number {
    if (this.phase !== "play") return 1;
    const left = this.radniceAhead();
    if (left === null) return 1;
    const k = Math.min(1, left / (this.u * 3));
    return 0.55 + 0.45 * k * k * (3 - 2 * k);
  }

  /** Drběna stojí na místě: u jelena, nebo u radnice. */
  private holds(): boolean {
    return this.gaze > 0 || this.stagHolds();
  }

  /**
   * U radnice Drběna zastaví pod štítem a zvedne hlavu k kopidlenskému erbu s kozlí hlavou.
   * Zastaví až na zemi; překážky těsně před ní se uklidí, ať do ní nic nevjede.
   */
  private watchRadnice(dt: number) {
    if (this.gaze > 0) {
      this.gaze = Math.max(0, this.gaze - dt);
      // S hlavou nahoře se otevře minihra (onRadnice); hlavu skloní až po ní (finishErbQuiz vrátí běh).
      if (!this.gazeAsked && this.gaze <= LOOK_DOWN) {
        this.gazeAsked = true;
        this.gaze = LOOK_DOWN;
        this.onRadnice?.();
        return;
      }
      if (this.gaze === 0) this.gazeAt = null;
      return;
    }
    const here = this.camera + this.playerX;
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "radnice" || this.gazed.has(ent)) continue;
      // Koza se zastaví kousek vlevo od štítu, ať erb vidí šikmo nad sebou.
      const spot = this.radniceSpot(ent);
      if (here < spot || !this.onGround) continue;
      this.gazed.add(ent);
      if (here > ent.x + this.visualHalf("radnice")) continue;
      // V kole s rybníkem (1., 3., 5. …) hádanka, v kole s oborou jen krátký pohled na erb.
      const quiz = ent.anim % 2 === 0 && this.onRadnice !== null;
      this.gazeTotal = quiz ? RADNICE_GAZE : RADNICE_GLANCE;
      this.gaze = this.gazeTotal;
      this.gazeAsked = !quiz;
      this.gazeAt = ent;
      this.releaseInputs();
      const to = here + this.viewW * 1.2;
      for (const other of this.ents) {
        if (other.alive && HAZARDS.has(other.kind) && other.x > here - this.u * 0.3 && other.x < to) other.alive = false;
      }
      this.hazardCursor = Math.max(this.hazardCursor, to);
      return;
    }
  }

  /** Zlaté zablesknutí kolem erbu a bublina „?!“ nad Drběnou, dokud kouká nahoru. */
  private drawRadniceGaze(ctx: CanvasRenderingContext2D) {
    const ent = this.gazeAt;
    if (!ent || this.gaze <= 0) return;
    const img = this.art.radnice;
    if (!(img instanceof HTMLImageElement) || !img.height) return;
    const t = 1 - this.gaze / this.gazeTotal;
    const h = SPEC.radnice.h * this.u;
    const w = h * (img.width / img.height);
    const ex = ent.x - this.camera + w * (0.496 - 0.5);
    const ey = this.groundY - h + h * 0.105;
    const show = Math.min(1, t * 5, (1 - t) * 4);
    const pulse = 1 + Math.sin(this.time * 6) * 0.12;
    ctx.save();
    ctx.globalAlpha = show;
    ctx.strokeStyle = "rgba(255, 214, 92, 0.95)";
    ctx.lineWidth = Math.max(2, this.u * 0.02);
    ctx.beginPath();
    ctx.arc(ex, ey, h * 0.04 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, this.u * 0.012);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + this.time * 0.8;
      const r0 = h * 0.055 * pulse;
      const r1 = r0 + h * 0.03;
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(a) * r0, ey + Math.sin(a) * r0);
      ctx.lineTo(ex + Math.cos(a) * r1, ey + Math.sin(a) * r1);
      ctx.stroke();
    }
    // Bublina nad hlavou Drběny.
    const bx = this.playerX + this.u * 0.28;
    const by = this.feet - this.u * 1.18 - Math.sin(this.time * 3) * this.u * 0.03;
    const bw = this.u * 0.42;
    const bh = this.u * 0.3;
    ctx.fillStyle = "#fff6e8";
    ctx.strokeStyle = "#241c16";
    ctx.lineWidth = Math.max(1.5, this.u * 0.014);
    ctx.beginPath();
    ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, bh * 0.45);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx - bw * 0.32, by + bh * 0.72, bh * 0.12, 0, Math.PI * 2);
    ctx.arc(bx - bw * 0.46, by + bh * 1.02, bh * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e4577a";
    ctx.font = `900 ${Math.round(bh * 0.72)}px Nunito, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?!", bx, by + bh * 0.04);
    ctx.restore();
  }

  private stagHolds(): boolean {
    for (const ent of this.ents) {
      if (ent.alive && ent.kind === "stag" && (ent.face ?? 0) === 1 && (ent.sway ?? 0) === 2) return true;
    }
    return false;
  }

  private simPlayer(dt: number) {
    if (this.holds()) {
      this.jumpBuffer = 0;
      this.jumpEdge = false;
      if (this.feet < this.groundY) {
        this.vy = Math.min(this.vy + this.gravity * dt, this.jumpSpeed * 1.25);
        this.feet = Math.min(this.groundY, this.feet + this.vy * dt);
        this.onGround = this.feet >= this.groundY;
        if (this.onGround) this.vy = 0;
        return;
      }
      this.feet = this.groundY;
      this.vy = 0;
      this.onGround = true;
      return;
    }
    this.suppress = Math.max(0, this.suppress - dt);
    const ducking = this.isDucking();
    if (this.keyDuck || this.touchDuck) this.duckLock = Math.max(this.duckLock, 0.28);
    else this.duckLock = Math.max(0, this.duckLock - dt);

    if (this.jumpEdge && this.suppress <= 0) {
      this.jumpBuffer = 0.18;
      this.coachJump = true;
    }
    this.jumpEdge = false;
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    // Před radnicí se neskáče: Drběna dojde pod erb po zemi.
    const calm = this.radniceAhead() !== null;
    if (calm) this.jumpBuffer = 0;
    const wantJump = !calm && this.jumpBuffer > 0 && !ducking && (this.onGround || this.coyote > 0);
    if (wantJump) {
      this.vy = -this.jumpSpeed;
      this.onGround = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.duckLock = 0;
      this.sfx.jump();
    }

    const wasGround = this.onGround;
    this.vy = Math.min(this.vy + this.gravity * dt, this.jumpSpeed * 1.25);
    this.feet += this.vy * dt;
    if (this.feet >= this.groundY) {
      if (!wasGround && this.vy > 80) {
        this.sfx.land();
        this.burst(this.playerX, this.groundY, "#f3e3c6", 6);
      }
      this.feet = this.groundY;
      this.vy = 0;
      this.onGround = true;
      this.coyote = 0.1;
    } else {
      this.onGround = false;
      this.coyote = Math.max(0, this.coyote - dt);
    }

    if (this.onGround && !ducking) {
      this.dust -= dt;
      if (this.dust <= 0) {
        this.dust = 0.12;
        this.burst(this.playerX - this.u * 0.2, this.groundY, "#e7d3a4", 1);
      }
      this.anim += dt * (9 + this.speed / this.u);
    }
  }

  private collisions() {
    const player = this.playerBox();
    const near = this.u * 4;
    for (const ent of this.ents) {
      if (!ent.alive) continue;
      const sx = ent.x - this.camera;
      if (sx < this.playerX - near || sx > this.playerX + near) continue;
      const box = this.entBox(ent);
      if (!box) continue;
      if (!overlap(player, box)) continue;
      if (PICKUPS.has(ent.kind)) {
        ent.alive = false;
        if (ent.kind === "gossip") this.grabGossip(ent);
        else if (ent.kind === "firefly") this.grabFirefly(ent);
        else if (ent.kind === "scroll") this.takeScroll(ent);
        else if (ent.kind === "heart" && this.lives < 3) {
          this.lives += 1;
          this.sfx.collect(2);
          this.burst(box.l, box.t, "#e4577a", 8);
        }
      } else if (HAZARDS.has(ent.kind) && this.invuln <= 0) {
        this.hurt(ent);
      }
    }
  }

  private grabGossip(ent: Ent) {
    const now = this.time;
    this.combo = now - this.lastCollect < 1.15 ? this.combo + 1 : 1;
    this.lastCollect = now;
    const pts = 12 * this.combo;
    this.gossipScore += pts;
    this.gossips += 1;
    this.sfx.collect(this.combo);
    this.pops.push({ x: ent.x - this.camera, y: this.groundY - ent.lift * this.u, text: `+${pts}`, life: 0.7 });
    this.burst(ent.x - this.camera, this.groundY - ent.lift * this.u, "#e8a317", 7);
  }

  private grabFirefly(ent: Ent) {
    const now = this.time;
    this.combo = now - this.lastCollect < 1.15 ? this.combo + 1 : 1;
    this.lastCollect = now;
    const pts = 24 * this.combo;
    this.gossipScore += pts;
    this.gossips += 1;
    this.sfx.collect(this.combo);
    const at = this.fireflyPos(ent);
    this.pops.push({ x: at.x, y: at.y, text: `+${pts}`, life: 0.7 });
    this.burst(at.x, at.y, "#f4ffd2", 6);
    this.burst(at.x, at.y, "#b6e060", 5);
  }

  private takeScroll(ent: Ent) {
    const fact = rememberFact(this.placeAt(ent.x).id);
    const pts = fact ? 40 : 16;
    this.gossipScore += pts;
    this.pops.push({
      x: ent.x - this.camera,
      y: this.groundY - ent.lift * this.u,
      text: `+${pts}`,
      life: 0.9,
    });
    this.stars(ent.x - this.camera, this.groundY - ent.lift * this.u, 14);
    if (fact) {
      this.chronicleNew += 1;
      this.scrollsKnown = knownIds().length;
      this.fact = { title: fact.title, text: "" };
      this.factLabel = "Nové tajemství odhaleno!";
      this.factComplete = false;
      this.factLife = 3.1;
    } else {
      // Když jsou všechny dostupné stránky odemčené, pergamen stále dává body.
      // Krátké hlášky obměňovat, ale neopakovat stejnou dvakrát za sebou.
      let index = Math.floor(Math.random() * SCROLL_COMPLETE_MESSAGES.length);
      if (SCROLL_COMPLETE_MESSAGES.length > 1 && index === this.lastCompleteMessage) {
        index = (index + 1) % SCROLL_COMPLETE_MESSAGES.length;
      }
      this.lastCompleteMessage = index;
      const message = SCROLL_COMPLETE_MESSAGES[index]!;
      this.fact = { title: message.title, text: message.text };
      this.factLabel = "Kronika prozatím kompletní";
      this.factComplete = true;
      this.factLife = 4.1;
    }
    this.sfx.prize();
    this.pushHud(true);
  }

  private hurt(ent: Ent) {
    ent.alive = false;
    this.lives -= 1;
    const now = this.playSeconds;
    const rest = this.lives > 0 && mercyDue(now, this.lastHit, this.mercyUntil);
    if (rest) this.breather();
    this.lastHit = now;
    this.invuln = 1.35;
    this.shake = 0.35;
    this.flash = 0;
    this.vy = -this.jumpSpeed * 0.22;
    this.onGround = false;
    this.hitKind = ent.kind;
    this.tale = this.pickTale(ent.kind);
    this.taleTag = rest ? "Příhoda Drběny · chvilka oddechu" : "Příhoda Drběny";
    this.taleTitle = TALE_TITLES[ent.kind] ?? "Drběnina příhoda";
    this.taleLife = rest ? 4.0 : 3.0;
    this.talk = 0.9;
    this.sfx.hurt();
    this.burst(this.playerX, this.feet - this.u * 0.4, "#e8a317", 8);
    if (this.lives <= 0) {
      this.phase = "over";
      this.talk = 0;
      this.lock = 0.45;
      const score = this.score();
      // The record belongs to whoever plays on this device (src/game/profiles.ts).
      ensureProfile();
      this.newBest = recordGame(score, this.gossips);
      this.useRecordOf(currentProfile());
      this.save();
      submitScore(score, this.gossips, this.playSeconds);
    }
    this.pushHud(true);
  }

  /**
   * Dva nárazy krátce za sebou: hra na chvíli zpomalí, uklidí překážky těsně před kozou
   * a pošle srdíčko. Stejně pro všechny, další oddech až po MERCY_COOLDOWN.
   */
  private breather() {
    this.mercy = MERCY_SECONDS;
    this.mercyUntil = this.playSeconds + MERCY_COOLDOWN;
    const from = this.camera + this.playerX;
    const to = from + this.viewW * 0.9;
    for (const ent of this.ents) {
      if (ent.alive && HAZARDS.has(ent.kind) && ent.x > from && ent.x < to) ent.alive = false;
    }
    if (this.lives < 3) this.ents.push({ kind: "heart", x: from + this.viewW * 0.55, lift: 0.72, anim: 0, alive: true });
    this.hazardCursor = Math.max(this.hazardCursor, to);
  }

  /** Cyklista jede koze naproti, jakmile vjede na obrazovku (a jen během běhu). */
  private rideCyclists(dt: number) {
    if (this.phase !== "play") return;
    // Pomalu (šestina rychlosti kozy): hráč má na reakci skoro stejně času jako u stojící překážky.
    // Muž na horském kole jede o něco rychleji, babička s košíky pomaleji (průměr zůstává 0,16).
    const pace = Math.max(this.speed, this.speed0);
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "cyclist") continue;
      if (ent.x - this.camera < this.viewW * 0.98) ent.x -= pace * (ent.alt ? 0.12 : 0.2) * dt;
    }
  }

  private spookPigeons(dt: number) {
    const pace = Math.max(this.speed, this.speed0);
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "pigeon") continue;
      const ahead = ent.x - this.camera - this.playerX;
      if (!ent.fly) {
        if (ahead < this.u * 1.2 && ahead > -this.u * 0.2) {
          ent.fly = 0.001;
          ent.anim = Math.random() * Math.PI * 2;
          ent.sway = Math.random() * 2.2 - 1.1;
        }
        continue;
      }
      ent.fly += dt;
      const t = ent.fly;
      const bend = ent.anim;
      const sway = ent.sway ?? 0.4;
      const vx = pace * (sway * (0.5 + t * 0.12) + Math.sin(t * 2.5 + bend) * 0.9);
      ent.x += vx * dt;
      ent.face = vx < 0 ? -1 : 1;
      ent.lift += (0.62 + Math.sin(t * 1.8 + bend) * 0.8) * dt;
      const sx = ent.x - this.camera;
      if (ent.lift > 3.2 || t > 3.4 || sx < -this.u * 2.2 || sx > this.viewW + this.u * 1.6) ent.alive = false;
    }
  }

  private isOboraChunk(chunk: number): boolean {
    if (chunk === 7) return true;
    // Rytmus kol: lichá kola (1., 3., 5. …) rybník s rybou, sudá (2., 4. …) obora s bílým jelenem.
    if (chunk < 7 || chunk % 4 !== 3) return false;
    return Math.floor(chunk / 4) % 2 === 1;
  }

  private oboraLayout(chunk: number) {
    const u = this.u;
    const aspects = [2146 / 632, 2172 / 632, 2140 / 632];
    const glassRight = stageStart(chunk - 1) + this.anchor() + this.visualHalf("greenhouse") + u * 1.05;
    const infoLeft = stageStart(chunk + 1) + this.anchor() - this.infoOffset() - this.visualHalf("info") - u * 0.55;
    const mids = 3;
    const spanAspect = aspects[0]! + aspects[1]! * mids + aspects[2]!;
    const lane = u * 14.5;
    let gap = Math.max(this.viewW * 1.05, lane);
    let room = infoLeft - glassRight - gap;
    if (room < u * 14) {
      gap = Math.max(u * 12.5, infoLeft - glassRight - u * 14);
      room = infoLeft - glassRight - gap;
    }
    const h = Math.min(u * 1.45, Math.max(u * 8, room) / spanAspect);
    return {
      start: glassRight,
      h,
      mids,
      widths: [h * aspects[0]!, h * aspects[1]!, h * aspects[2]!],
    };
  }

  private spawnObora(chunk: number) {
    const u = this.u;
    const layout = this.oboraLayout(chunk);
    const { h, mids, widths } = layout;
    let left = layout.start;
    const pieces: { part: number; x: number; w: number }[] = [];
    const push = (part: number, w: number) => {
      pieces.push({ part, x: left + w / 2, w });
      left += w;
    };
    push(0, widths[0]!);
    const midLeft = left;
    for (let i = 0; i < mids; i += 1) push(1, widths[1]!);
    push(2, widths[2]!);
    this.oboraSpans.push({ from: layout.start, to: left });
    this.ents.push({
      kind: "stag",
      x: midLeft + widths[1]! * 0.432,
      lift: h,
      anim: chunk,
      alive: true,
      fly: 0,
      sway: 0,
      // Jelen se zastaví vždy: napřed kapitoly příběhu, pak krátká povídání (stag-stories.ts).
      face: 1,
    });
    for (const piece of pieces) {
      this.ents.push({ kind: "obora", x: piece.x, lift: h, anim: piece.part, alive: true });
    }
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind === "obora" || ent.kind === "stag") continue;
      if (!PROPS.has(ent.kind) && !HAZARDS.has(ent.kind) && ent.kind !== "gossip") continue;
      if (ent.x > layout.start - u * 0.2 && ent.x < left + u * 0.2) ent.alive = false;
    }
    for (let x = layout.start + h * 0.95; x < left - h * 0.7; x += u * 1.15) {
      this.ents.push({ kind: "gossip", x, lift: 0.4, anim: x, alive: true });
    }
    const flyFrom = midLeft + widths[1]! * 0.16;
    const flyTo = midLeft + widths[1]! * mids - u * 0.35;
    for (let x = flyFrom; x < flyTo; x += u * (0.82 + hash(x) * 0.55)) {
      const n = hash(x + 9);
      this.ents.push({
        kind: "firefly",
        x: x + (hash(x + 6) - 0.5) * u * 0.35,
        lift: n > 0.55 ? 0.88 + hash(x + 1) * 0.32 : 0.38 + hash(x + 1) * 0.42,
        anim: hash(x + 2) * Math.PI * 2,
        alive: true,
        sway: u * (0.16 + hash(x + 4) * 0.34),
      });
    }
    this.approachAfter(left);
  }

  private fillWorld() {
    let guard = 0;
    while (this.decorCursor < this.camera + this.viewW + this.visualHalf("tree") + 80 && guard++ < 16) {
      const skip = this.oboraSpans.find((span) => this.decorCursor > span.from - this.u && this.decorCursor < span.to + this.u * 0.4);
      if (skip) {
        this.decorCursor = skip.to + this.u * 0.45;
        continue;
      }
      const lane = this.approaches.find((row) => this.decorCursor > row.from && this.decorCursor < row.to);
      if (lane) {
        this.decorCursor = lane.to + this.u * 0.3;
        continue;
      }
      // Dekorace se vykreslují nad památkami. Ani okraj koruny stromu proto
      // nesmí zasáhnout domy, a hlavně štíhlý krucifix v Mlýnci.
      const clearance = this.visualHalf("tree") + this.u * 0.35;
      const village = this.villageZones.find(
        (zone) => this.decorCursor >= zone.from - clearance && this.decorCursor < zone.to + clearance,
      );
      if (village) {
        this.decorCursor = village.to + clearance;
        continue;
      }
      const mix = biomeMix(this.decorCursor);
      const town = mix.biome.id === "namesti";
      // Zámek, skleník a rybník jsou v zámeckém parku: víc stromů než na náměstí.
      const bag: Kind[] = town
        ? ["lamp", "bush", "bench", "bin", "tree", "bush", "pigeon"]
        : mix.biome.id === "park"
          ? ["tree", "tree", "bush", "bench", "tree", "bush", "pigeon"]
          : mix.biome.id === "zamek"
            ? ["tree", "tree", "bush", "lamp", "bench", "tree", "pigeon"]
            : ["tree", "bush", "tree", "lamp", "bench", "bin", "tree", "pigeon"];
      let kind = bag[Math.floor(Math.random() * bag.length)]!;
      // V zámeckém parku, u skleníku a u rybníka rostou stromy jako kolem Kopidlna (jeřáb a borovice
      // k parku nepatří); na náměstí zůstává lípa z náměstí.
      let size: number | undefined;
      if (kind === "tree" && !town) {
        kind = PARK_TREES[Math.floor(Math.random() * PARK_TREES.length)]!;
        size = Math.round((0.85 + Math.random() * 0.15) * 20) / 20;
      }
      if (kind !== "bin" && PROPS.has(kind) && this.onPlaceFace(this.decorCursor, kind)) {
        this.decorCursor += this.u * (1.5 + Math.random() * 1.2);
        continue;
      }
      if (kind === "bin" && this.approaches.some((row) => this.decorCursor >= row.from && this.decorCursor < row.village)) {
        this.decorCursor += this.u * (1.5 + Math.random() * 1.2);
        continue;
      }
      if (this.ents.some((ent) => ent.alive && (VILLAGES.has(ent.kind) || ent.kind === "radnice") && Math.abs(ent.x - this.decorCursor) < this.visualHalf(ent.kind) + this.visualHalf(kind) + this.u * 0.35)) {
        this.decorCursor += this.u * (1.5 + Math.random() * 1.2);
        continue;
      }
      this.ents.push({ kind, x: this.decorCursor, lift: 0, anim: 0, alive: true, size, face: Math.random() < 0.5 ? -1 : 1 });
      this.decorCursor += this.u * (1.35 + Math.random() * 1.8);
    }
    const horizon = this.camera + this.visualHalf("pond") + this.viewW * 0.22 + this.u;
    while (stageStart(this.nextChunk) <= horizon || (this.isOboraChunk(this.nextChunk) && this.oboraLayout(this.nextChunk).start <= this.camera + this.viewW + this.u * 1.6)) {
      const biome = BIOMES[((this.nextChunk % 4) + 4) % 4]!;
      if (biome.id === "park" && this.isOboraChunk(this.nextChunk)) {
        this.spawnObora(this.nextChunk);
      } else {
        const origin = stageStart(this.nextChunk) + this.anchor();
        this.ents.push({
          kind: biome.landmark,
          x: biome.landmark === "pond" ? this.pondX(stageStart(this.nextChunk)) : origin,
          lift: 0,
          anim: 0,
          alive: true,
        });
        if (biome.landmark === "pond") {
          this.pondsDirty = true;
          this.approachAfter(this.pondX(stageStart(this.nextChunk)) + this.pondHalf());
        }
      }
      if (biome.id === "namesti") {
        this.ents.push({
          kind: "info",
          x: stageStart(this.nextChunk) + this.anchor() - this.infoOffset(),
          lift: 0,
          anim: 0,
          alive: true,
        });
        this.ents.push({
          kind: "column",
          x: stageStart(this.nextChunk) + this.anchor() + this.u * 3.3,
          lift: 0,
          anim: 0,
          alive: true,
        });
        this.ents.push({
          kind: "church",
          x: stageStart(this.nextChunk) + this.anchor() + this.u * 7.6,
          lift: 0,
          anim: 0,
          alive: true,
        });
        this.ents.push({
          kind: "school",
          x: stageStart(this.nextChunk) + this.anchor() + this.u * 12.2,
          lift: 0,
          anim: 0,
          alive: true,
        });
      }
      this.nextChunk += 1;
    }
    if (this.phase !== "play") {
      if (this.pondsDirty) this.quietPond();
      return;
    }
    guard = 0;
    while (this.hazardCursor < this.camera + this.viewW + this.visualHalf("branch") + 48 && guard++ < 12) this.spawnWave();
    if (this.pondsDirty) this.quietPond();
  }

  private quietPond() {
    this.pondsDirty = false;
    const u = this.u;
    for (const pond of this.ents) {
      if (pond.kind !== "pond" || !pond.alive) continue;
      const from = pond.x - u * 8;
      const to = pond.x + u * 8;
      for (const ent of this.ents) {
        if (!ent.alive || !HAZARDS.has(ent.kind)) continue;
        if (ent.x > from && ent.x < to) ent.alive = false;
      }
    }
  }

  private visualHalf(kind: Kind): number {
    const h = SPEC[kind].h * this.u;
    const img = this.art[kind];
    const fallback =
      (SIGNS as readonly string[]).includes(kind)
        ? 560 / 690
        : kind === "pond"
        ? 1669 / 477
        : kind === "mlynec-cross"
          ? 599 / 1647
          : kind === "mlynec-bell"
            ? 121 / 900
            : kind === "mlynec-pond"
            ? 1800 / 409
          : kind === "mlynec-house"
            ? 737 / 545
            : kind === "mlynec-school"
              ? 820 / 574
              : kind === "ledkov-a"
                ? 845 / 487
                : kind === "ledkov-b"
                  ? 722 / 489
                  : kind === "drahoraz-church"
                    ? 1142 / 931
                    : kind === "drahoraz-tower"
                      ? 415 / 625
                      : kind === "apple-0"
                        ? 967 / 1188
                        : kind === "apple-1"
                          ? 967 / 1114
                          : kind === "apple-2"
                            ? 863 / 1000
                            : kind === "linden"
                              ? 1334 / 440
                              : kind === "radnice"
                                ? 1187 / 760
                                : kind === "pseves-house"
                                ? 1400 / 516
                              : kind === "pseves-heart"
                                ? 1028 / 1309
                                : kind === "greenhouse"
          ? 1280 / 579
          : kind === "castle" || kind === "school"
            ? 1.29
            : kind === "houses"
              ? 960 / 841
              : kind === "church"
                ? 522 / 900
                : kind === "column"
                  ? 587 / 820
                  : kind === "info"
                    ? 1100 / 568
                    : kind === "tree"
                      ? 402 / 440
                      : kind === "branch"
                        ? 805 / 416
                        : kind === "laundry"
                        ? 900 / 501
                        : kind === "bench"
                        ? 1344 / 679
                        : kind === "lamp"
                          ? 402 / 1407
                          : kind === "pigeon"
                            ? 1072 / 1099
                            : kind === "bin"
                              ? 594 / 1212
                              : 1;
    const aspect = img instanceof HTMLImageElement && img.height ? img.width / img.height : fallback;
    return (h * aspect) / 2;
  }

  private pondHalf(): number {
    return this.visualHalf("pond");
  }

  /**
   * Konce Zámeckého rybníka v Kopidlně: obrázek se na krajích ztrácí do průhledna (pond.webp) a přes oba konce
   * stojí skupinka stromů a keřů, ať rybník plynule přechází do krajiny a nikde nevisí ve vzduchu.
   */
  private drawPondEndTrees(ctx: CanvasRenderingContext2D) {
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "pond") continue;
      const half = this.pondHalf();
      const center = ent.x - this.camera;
      if (center + half < -this.cullMargin || center - half > this.viewW + this.cullMargin) continue;
      this.drawEndGroup(ctx, center - half, -1, POND_END);
      this.drawEndGroup(ctx, center + half, 1, POND_END);
    }
  }

  /**
   * Skupinka stromů a keřů přes konec kulisy (rybník, obora). `side` je směr ven z kulisy: -1 levý konec,
   * 1 pravý; na pravém konci je skupinka zrcadlově, ať oba konce nejsou stejné.
   */
  private drawEndGroup(ctx: CanvasRenderingContext2D, edge: number, side: -1 | 1, group: readonly EndPiece[]) {
    const feet = this.groundY + 2;
    for (const [kind, size, out, mirror, far] of group) {
      const img = this.art[kind];
      if (!(img instanceof HTMLImageElement) || !img.height) continue;
      const h = size * this.u;
      const w = h * (img.width / img.height);
      const x = edge + side * out * this.u;
      if (x + w < -40 || x - w > this.viewW + 40) continue;
      const baked = far ? this.bakedFar(img, h * this.scale) : this.baked(img, h * this.scale);
      if ((side === 1) !== mirror) {
        ctx.save();
        ctx.translate(this.snap(x), 0);
        ctx.scale(-1, 1);
        ctx.drawImage(baked, -w / 2, this.snap(feet - h), w, h);
        ctx.restore();
      } else {
        ctx.drawImage(baked, this.snap(x - w / 2), this.snap(feet - h), w, h);
      }
    }
  }

  /**
   * Rybník Zrcadlo v Mlýnci je nakreslený jako ostrůvek: na koncích se břeh zvedá a spodní rohy jsou průhledné,
   * takže by břeh visel ve vzduchu. Keře v popředí na obou koncích ty rohy zakryjí a napojí rybník na trávu u cesty.
   */
  private drawMirrorPondEnds(ctx: CanvasRenderingContext2D) {
    const img = this.art.bush;
    if (!(img instanceof HTMLImageElement) || !img.height) return;
    const aspect = img.width / img.height;
    const feet = this.groundY + 2;
    const bushes = [
      // [výška v u, posun od okraje rybníka dovnitř v u]: velký keř přes zvednutý roh, menší ven na trávu.
      [0.66, 0.24],
      [0.44, -0.2],
    ] as const;
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "mlynec-pond") continue;
      const half = this.visualHalf("mlynec-pond");
      const left = ent.x - this.camera - half;
      const right = ent.x - this.camera + half;
      if (right < -this.cullMargin || left > this.viewW + this.cullMargin) continue;
      for (const [size, inset] of bushes) {
        const h = size * this.u;
        const w = h * aspect;
        const baked = this.baked(img, h * this.scale);
        for (const x of [left + inset * this.u, right - inset * this.u]) {
          ctx.drawImage(baked, this.snap(x - w / 2), this.snap(feet - h), w, h);
        }
      }
    }
  }

  /** Začátek a konec obory: obrázek se ven ztrácí do průhledna a přes kraj stojí jehličnany a keře. */
  private drawOboraEndTrees(ctx: CanvasRenderingContext2D) {
    for (const span of this.oboraSpans) {
      const from = span.from - this.camera;
      const to = span.to - this.camera;
      if (to < -this.cullMargin || from > this.viewW + this.cullMargin) continue;
      this.drawEndGroup(ctx, from, -1, OBORA_END);
      this.drawEndGroup(ctx, to, 1, OBORA_END);
    }
  }


  private pondGapEnd(x: number): number | null {
    // Před radnicí a pod ní žádná překážka: Drběna musí doběhnout pod erb po zemi.
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "radnice") continue;
      const from = Math.min(ent.x - this.visualHalf("radnice") - this.u * 2.4, this.radniceSpot(ent) - this.radniceCalm() - this.u);
      const to = ent.x + this.u * 0.6;
      if (x >= from && x < to) return to;
    }
    const cycle = CYCLE_LEN;
    const base = Math.floor(x / cycle);
    for (let i = base - 1; i <= base + 1; i += 1) {
      const pondX = this.pondX(stageStart(i * 4 + 3));
      const from = pondX - this.u * 8;
      const to = pondX + this.u * 8;
      if (x >= from && x < to) return to;
    }
    for (const span of this.oboraSpans) {
      const pad = this.u * 0.4;
      if (x >= span.from - pad && x < span.to + pad) return span.to + pad;
    }
    // Jen zastavěná část konkrétní vsi; mezi vesnicemi musí zůstat hratelná krajina.
    // Rezerva odpovídá šířce překážky, aby větev či kráva nevjela do domů.
    const pad = this.visualHalf("branch") + this.u * 0.15;
    for (const zone of this.villageZones) {
      if (x >= zone.from - pad && x < zone.to + pad) return zone.to + pad;
    }
    return null;
  }

  /**
   * Zakryla by překážka na tomto místě budovu nebo ceduli? Kopidlenské stavby podle rozvržení
   * (onPlaceFace v celé šířce), stavby vsí a cedule podle toho, co už ve světě stojí.
   */
  private coversScenery(x: number, kind: Kind): boolean {
    const at = x;
    const pad = this.u * 0.12;
    const half = this.visualHalf(kind) + pad;
    if (this.onPlaceFace(at, kind, 1, pad)) return true;
    return this.ents.some((ent) => ent.alive && PLACES.has(ent.kind) && Math.abs(ent.x - at) < this.visualHalf(ent.kind) + half);
  }

  /**
   * Kde od začátku každého úseku stojí jeho hlavní stavba (radnice, zámek, skleník). Běžně 82 % šířky
   * obrazovky; na úzké obrazovce dál, ať je na startu celé infocentrum vidět až před kozou.
   */
  private anchor(): number {
    return Math.max(this.viewW * 0.82, this.playerX + this.u * 0.7 + this.infoOffset() + this.visualHalf("info"));
  }

  /** Infocentrum stojí hned vlevo vedle radnice (houses), jen s úzkou mezerou. */
  private infoOffset(): number {
    return this.visualHalf("houses") + this.visualHalf("info") + this.u * 0.12;
  }

  private onPlaceFace(x: number, kind: Kind, cover = 0.78, pad = 0): boolean {
    const reach = this.visualHalf(kind) + pad;
    const u = this.u;
    const cycle = CYCLE_LEN;
    const n0 = Math.floor(x / cycle) - 1;
    for (let n = n0; n <= n0 + 2; n += 1) {
      const square = n * cycle + this.anchor();
      const spots: [number, Kind][] = [
        [square - this.infoOffset(), "info"],
        [square, "houses"],
        [square + u * 3.3, "column"],
        [square + u * 7.6, "church"],
        [square + u * 12.2, "school"],
        [stageStart(n * 4 + 1) + this.anchor(), "castle"],
        [stageStart(n * 4 + 2) + this.anchor(), "greenhouse"],
        [this.pondX(stageStart(n * 4 + 3)), "pond"],
      ];
      for (const [center, place] of spots) {
        const inner = this.visualHalf(place) * cover;
        if (x + reach > center - inner && x - reach < center + inner) return true;
      }
    }
    return false;
  }

  private spawnWave() {
    const gap = this.pondGapEnd(this.hazardCursor);
    if (gap != null) {
      this.hazardCursor = gap;
      return;
    }
    const u = this.u;
    const speed = Math.max(this.speed, this.speed0);
    const x = this.hazardCursor;
    const run = Math.max(0, this.run + (x - this.viewW - 20 - this.camera));
    if (run < 260) {
      for (let i = 0; i < 4; i += 1) {
        this.ents.push({ kind: "gossip", x: x + i * u * 0.4, lift: 0.16, anim: i, alive: true });
      }
      this.hazardCursor += 4 * u * 0.4 + speed * 0.62;
      return;
    }
    const loop = Math.floor(Math.max(0, x) / CYCLE_LEN);
    if (run > 280 && x >= this.nextScroll && !this.scrollAhead()) {
      const low = this.scrolls < 2;
      const early = this.scrollsRun < 2;
      const lift = low ? 0.1 + Math.random() * 0.12 : 0.78 + Math.random() * 0.28;
      this.ents.push({ kind: "scroll", x: x + Math.random() * u * 1.15, lift, anim: Math.random() * 6, alive: true });
      this.scrolls += 1;
      this.scrollsRun += 1;
      this.save();
      const gap = early ? 1.7 + Math.random() * 1.8 : 4.5 + Math.random() * 7;
      const [near, far] = scrollGap(loop);
      this.hazardCursor += speed * (near + Math.random() * (far - near));
      this.nextScroll = this.hazardCursor + speed * gap;
      return;
    }
    const roll = Math.random();
    const stage = stageIndex(Math.max(0, x));
    const gossipP = gossipChance(loop, stage % 4);
    if (roll < gossipP) {
      const n = 3 + (Math.random() < 0.45 ? 2 : 0);
      const lift = stage >= 2 ? (Math.random() < 0.5 ? 0.92 : 0.14) : Math.random() < 0.7 ? 0.14 : 0.92;
      for (let i = 0; i < n; i += 1) {
        this.ents.push({ kind: "gossip", x: x + i * u * 0.4, lift, anim: i, alive: true });
      }
      this.hazardCursor += n * u * 0.4 + speed * gossipGap(loop, stage % 4);
      return;
    }
    if (roll < gossipP + 0.06 && this.lives < 3 && run > 500) {
      this.ents.push({ kind: "heart", x, lift: 0.72, anim: 0, alive: true });
      this.hazardCursor += speed * 0.8;
      return;
    }
    let kind = this.rollHazard(x);
    if (BIG_HAZARDS.has(kind) && this.coversScenery(x, kind)) {
      // Před budovou či cedulí místo větve plot, jablka nebo husa, ať je pozadí vidět.
      const small = (["fence", "pot", "dog"] as Kind[]).filter((one) => one !== this.lastHazard);
      kind = small[Math.floor(Math.random() * small.length)]!;
    }
    if (kind === "cyclist") {
      // Cyklista jede koze naproti, až když je vidět, a proto startuje o kus dál: z mezery
      // před ním si cestou ujede asi desetinu obrazovky, takže předchozí překážku nedožene.
      const lead = this.viewW * 0.16;
      this.ents.push({ kind, x: x + lead, lift: 0, anim: Math.random() * 6, alive: true, alt: this.nextAlt(kind) });
      this.hazardCursor += lead + u * 1.1 + speed * cyclistGap(loop);
      this.lastHazard = kind;
      return;
    }
    this.ents.push({ kind, x, lift: 0, anim: Math.random() * 6, alive: true, alt: this.nextAlt(kind) });
    this.pondsDirty = true;
    if (kind === "fence") {
      [0.48, 0.95, 0.48].forEach((lift, i) => {
        this.ents.push({ kind: "gossip", x: x + (i - 1) * u * 0.36, lift, anim: i, alive: true });
      });
    } else if (kind === "branch") {
      for (let i = 0; i < 3; i += 1) {
        this.ents.push({ kind: "gossip", x: x + (i - 1) * u * 0.34, lift: 0.08, anim: i, alive: true });
      }
    }
    const bulk = kind === "car" ? u * 1.7 : kind === "branch" ? u * 1.2 : kind === "pot" ? u * 0.85 : kind === "gardener" ? u * 0.85 : u * 0.55;
    const zone = this.zoneAt(x);
    const second = Math.random() < pairChance(loop, zone) ? (kind === "fence" ? "branch" : kind === "pot" ? "fence" : null) : null;
    if (second) {
      const at = x + bulk + speed * pairGap(loop);
      if (this.pondGapEnd(at) == null && !(BIG_HAZARDS.has(second) && this.coversScenery(at, second))) {
        this.ents.push({ kind: second, x: at, lift: 0, anim: Math.random() * 6, alive: true });
        if (second === "branch") {
          for (let i = 0; i < 3; i += 1) {
            this.ents.push({ kind: "gossip", x: at + (i - 1) * u * 0.34, lift: 0.08, anim: i, alive: true });
          }
        }
        const bulk2 = second === "branch" ? u * 1.2 : u * 0.55;
        this.hazardCursor = at + bulk2 + speed * 0.98;
        this.lastHazard = second;
        return;
      }
    }
    // Rytmus: klid ve městě a v obcích, rušno uprostřed cest mezi obcemi (difficulty.ts).
    this.hazardCursor += bulk + speed * hazardGap(loop, stage % 4, zone);
    this.lastHazard = kind;
  }

  private zoneAt(x: number): Zone {
    if (this.villageZones.some((zone) => x >= zone.from && x < zone.to)) return "obec";
    const road = this.approaches.find((gap) => x >= gap.from && x < gap.to);
    return road ? roadZone(x, road.from, road.to) : "mesto";
  }

  private scrollAhead() {
    return this.ents.some((ent) => ent.alive && ent.kind === "scroll" && ent.x > this.camera - this.u);
  }

  private rollHazard(x: number): Kind {
    const stage = stageIndex(Math.max(0, x));
    const bag: Kind[] = ["fence", "pot", "dog", "fence", "pot"];
    if (stage >= 1) bag.push("gardener");
    if (stage >= 2) bag.push("branch", "fence");
    if (stage >= 3) bag.push("car", "gardener");
    // Od třetího kola jsou těžší překážky (auto, větev, zahradník) častější.
    if (stage >= 8) bag.push("car", "branch", "gardener");
    // Na cestách mezi vesnicemi občas přijede naproti cyklista.
    const road = this.approaches.some((gap) => x >= gap.from && x < gap.to);
    // Cyklista jede naproti: nesmí dojet až k radnici, kde Drběna zastavuje pod erbem.
    const nearRadnice = this.ents.some((ent) => ent.alive && ent.kind === "radnice" && x > ent.x - this.viewW * 0.2 && x - ent.x < this.viewW * 1.6);
    if (road && !nearRadnice && this.lastHazard !== "cyclist" && Math.random() < 0.3) return "cyclist";
    let kind = bag[Math.floor(Math.random() * bag.length)]!;
    if (kind === this.lastHazard) kind = "pot";
    if (kind === "branch" && this.lastHazard === "gardener") kind = "fence";
    if (kind === "car" && (this.lastHazard === "branch" || this.lastHazard === "gardener")) kind = "dog";
    return kind;
  }

  private sweep() {
    const min = this.camera - this.viewW * 1.35;
    for (let i = this.ents.length - 1; i >= 0; i -= 1) {
      const ent = this.ents[i]!;
      if (!ent.alive || ent.x < min) {
        this.ents[i] = this.ents[this.ents.length - 1]!;
        this.ents.pop();
      }
    }
    this.approaches = this.approaches.filter((gap) => gap.to >= min);
    this.villageZones = this.villageZones.filter((zone) => zone.to >= min);
    this.oboraSpans = this.oboraSpans.filter((span) => span.to >= min);
  }

  private decayJuice(dt: number) {
    this.shake = Math.max(0, this.shake - dt * 2.4);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.phase === "play") this.mercy = Math.max(0, this.mercy - dt);
    for (const pop of this.pops) pop.life -= dt;
    this.pops = this.pops.filter((pop) => pop.life > 0);
    for (const bit of this.bits) {
      if (!bit.on) continue;
      bit.life -= dt;
      bit.x += bit.vx * dt;
      bit.y += bit.vy * dt;
      bit.vy += (bit.star ? 70 : 500) * dt;
      if (bit.life <= 0) bit.on = false;
    }
  }

  private burst(x: number, y: number, color: string, n: number) {
    let left = n;
    for (const bit of this.bits) {
      if (left <= 0) break;
      if (bit.on) continue;
      bit.on = true;
      bit.x = x;
      bit.y = y;
      bit.vx = (Math.random() - 0.5) * 180;
      bit.vy = -80 - Math.random() * 180;
      bit.life = 0.35 + Math.random() * 0.3;
      bit.max = bit.life;
      bit.color = color;
      bit.size = 2 + Math.random() * 3;
      bit.star = false;
      left -= 1;
    }
  }

  private stars(x: number, y: number, n: number) {
    const colors = ["#fff6e8", "#ffe38a", "#e8a317", "#fff"];
    let left = n;
    for (const bit of this.bits) {
      if (left <= 0) break;
      if (bit.on) continue;
      bit.on = true;
      bit.star = true;
      bit.x = x;
      bit.y = y;
      bit.vx = (Math.random() - 0.5) * 170;
      bit.vy = -240 - Math.random() * 280;
      bit.life = 0.8 + Math.random() * 0.45;
      bit.max = bit.life;
      bit.color = colors[left % colors.length]!;
      bit.size = 4 + Math.random() * 3.5;
      left -= 1;
    }
  }

  private pollPad() {
    if (!this.padLive) {
      this.padHunt += 1;
      if (this.padHunt < 10) return;
      this.padHunt = 0;
    }
    let pad: Gamepad | null = null;
    try {
      pad = navigator.getGamepads?.()?.[0] ?? null;
    } catch {
      pad = null;
    }
    if (!pad) {
      if (this.padLive) {
        this.padLive = false;
        this.padJump = false;
        this.padDuck = false;
      }
      return;
    }
    this.padLive = true;
    const jump = Boolean(pad.buttons[0]?.pressed || pad.buttons[12]?.pressed || (pad.axes[1] ?? 0) < -0.65);
    const duck = Boolean(pad.buttons[1]?.pressed || pad.buttons[13]?.pressed || (pad.axes[1] ?? 0) > 0.65);
    if (jump && !this.prevPadJump) {
      if (this.phase === "dialogue") {
        if (this.fishDialogue !== null) this.continueFishDialogue();
        else this.advanceStagDialogue();
      } else if (this.phase !== "fish-intro") this.jumpEdge = true;
    }
    this.prevPadJump = jump;
    this.padJump = jump;
    this.padDuck = duck;
    if (duck) this.coachDuck = true;
    const start = Boolean(pad.buttons[9]?.pressed);
    if (start && !this.prevStart && (this.phase === "play" || this.phase === "pause")) this.togglePause();
    this.prevStart = start;
  }

  private score(): number {
    return Math.floor(this.run * 0.05) + this.gossipScore;
  }

  private isDucking() {
    return (
      this.phase === "play" &&
      this.onGround &&
      this.radniceAhead() === null &&
      (this.keyDuck || this.touchDuck || this.padDuck || this.duckLock > 0)
    );
  }

  private playerBox() {
    const ducking = this.isDucking();
    const h = (ducking ? 0.34 : 0.62) * this.u;
    const w = (ducking ? 0.58 : 0.36) * this.u;
    return box(this.playerX, this.feet, w, h);
  }

  private entBox(ent: Ent) {
    if (!HAZARDS.has(ent.kind) && !PICKUPS.has(ent.kind)) return null;
    if (ent.kind === "firefly") {
      if (this.nightAt(ent.x) < 0.42) return null;
      const at = this.fireflyPos(ent);
      const r = this.u * 0.32;
      return { l: at.x - r, r: at.x + r, t: at.y - r, b: at.y + r };
    }
    if (ent.kind !== "heart" && !this.spriteFor(ent)) return null;
    const spec = SPEC[ent.kind];
    const h = spec.h * this.u;
    const img = this.spriteFor(ent);
    const aspect = img && img.width ? img.width / img.height : ent.kind === "car" ? 2 : 1;
    const w = h * aspect;
    const cx = ent.x - this.camera;
    const feet = this.groundY - ent.lift * this.u;
    if (ent.kind === "branch") {
      const H = spec.h * this.u;
      const W = H * aspect;
      const gap = 0.4 * this.u;
      return { l: cx - W * 0.4, r: cx + W * 0.4, t: feet - H * 0.98, b: feet - gap };
    }
    if (ent.kind === "laundry") {
      // Jen prostěradlo a utěrka mezi kůly, kůly se nepočítají. Spodní okraj je 0,33 výšky nad zemí.
      const W = h * aspect;
      return { l: cx - W * 0.35, r: cx + W * 0.39, t: feet - h * 0.86, b: feet - h * 0.34 };
    }
    return box(cx, feet, w * spec.hitW, h * spec.hitH);
  }

  /** Sousedka i cyklista se střídají: mladá paní / babička s konví, muž na kole / babička na kole. */
  private altFlip: Partial<Record<Kind, boolean>> = {};
  private nextAlt(kind: Kind): boolean | undefined {
    if (kind !== "gardener" && kind !== "cyclist") return undefined;
    const alt = !this.altFlip[kind];
    this.altFlip[kind] = alt;
    return alt;
  }

  private spriteFor(ent: Ent): HTMLImageElement | null {
    const img = this.art[ent.kind];
    return img instanceof HTMLImageElement ? img : null;
  }

  private draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    const mix = biomeMix(this.camera);
    const col = (key: ColorKey) => rgbCss(lerpRgb(mix.biome[key], mix.tint[key], mix.t));
    const mag = this.shake * this.u * 0.1;
    const ox = Math.sin(this.time * 46) * mag;
    const oy = Math.cos(this.time * 33) * mag * 0.45;
    const top = col("skyTop");
    const bot = col("skyBot");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, ox * this.scale, oy * this.scale);
    ctx.imageSmoothingEnabled = true;

    if (!this.skyGrad || top !== this.skyTop || bot !== this.skyBot || this.skyGround !== this.groundY) {
      const sky = ctx.createLinearGradient(0, 0, 0, Math.max(this.groundY, 10));
      sky.addColorStop(0, top);
      sky.addColorStop(1, bot);
      this.skyGrad = sky;
      this.skyTop = top;
      this.skyBot = bot;
      this.skyGround = this.groundY;
    }
    ctx.fillStyle = this.skyGrad;
    ctx.fillRect(-20, -20, this.viewW + 40, this.viewH + 40);

    ctx.fillStyle = "rgba(255, 236, 180, 0.95)";
    ctx.beginPath();
    ctx.arc(this.viewW * 0.8, this.u * 0.42, this.u * 0.22, 0, Math.PI * 2);
    ctx.fill();

    this.clouds(ctx);
    this.hills(ctx, 0.22, this.groundY - this.u * 0.85, this.u * 0.38, col("hillFar"));
    this.hills(ctx, 0.4, this.groundY - this.u * 0.28, this.u * 0.22, col("hill"));

    ctx.fillStyle = col("grass");
    ctx.fillRect(-20, this.groundY - 4, this.viewW + 40, this.viewH - this.groundY + 30);

    const margin = this.cullMargin;
    const cam = this.camera;
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "obora") continue;
      const sx = ent.x - cam;
      const reach = ent.lift * 1.85 + 40;
      if (sx < -reach || sx > this.viewW + reach) continue;
      this.drawObora(ctx, ent);
    }
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "stag") continue;
      if ((ent.sway ?? 0) < 1) this.drawStag(ctx, ent);
      else if ((ent.face ?? 0) !== 1 && (ent.sway ?? 0) === 1) this.drawStagRun(ctx, ent);
    }
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "stag") continue;
      this.drawOak(ctx, ent);
    }
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "stag" || (ent.face ?? 0) !== 1 || (ent.sway ?? 0) !== 1) continue;
      this.drawStagMeet(ctx, ent);
    }
    // Zadní řada lesa za vším ostatním (i za cedulemi).
    for (const ent of this.ents) {
      if (!ent.alive || !ent.far) continue;
      const sx = ent.x - cam;
      if (sx < -margin || sx > this.viewW + margin) continue;
      this.drawEnt(ctx, ent);
    }
    for (const ent of this.ents) {
      if (!ent.alive || !PLACES.has(ent.kind)) continue;
      const sx = ent.x - cam;
      if (sx < -margin || sx > this.viewW + margin) continue;
      this.drawEnt(ctx, ent);
    }
    for (const ent of this.ents) {
      if (!ent.alive || !PROPS.has(ent.kind) || ent.fly || ent.far) continue;
      const sx = ent.x - cam;
      if (sx < -margin || sx > this.viewW + margin) continue;
      this.drawEnt(ctx, ent);
    }
    this.drawPondEndTrees(ctx);
    this.drawMirrorPondEnds(ctx);
    this.drawOboraEndTrees(ctx);

    ctx.fillStyle = col("path");
    const pathH = Math.max(22, this.u * 0.2);
    ctx.fillRect(-20, this.groundY + 1, this.viewW + 40, pathH);
    ctx.fillStyle = col("pathDark");
    const stride = 26;
    for (let x = -(this.camera % stride); x < this.viewW; x += stride) {
      ctx.fillRect(x, this.groundY + pathH * 0.35, 12, 3);
    }
    ctx.fillStyle = col("grassDark");
    ctx.fillRect(-20, this.groundY - 7, this.viewW + 40, 8);
    this.flowers(ctx);

    for (const ent of this.ents) {
      if (!ent.alive || LANDMARKS.has(ent.kind) || DECOR.has(ent.kind) || ent.kind === "firefly") continue;
      const sx = ent.x - cam;
      if (sx < -margin || sx > this.viewW + margin) continue;
      this.drawEnt(ctx, ent);
    }

    this.drawFish(ctx);
    this.drawPlayer(ctx);
    this.drawRadniceGaze(ctx);
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "stag" || (ent.face ?? 0) !== 1) continue;
      const phase = ent.sway ?? 0;
      if (phase < 2 || phase >= 4) continue;
      this.drawStagMeet(ctx, ent);
    }
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "pigeon" || !ent.fly) continue;
      this.drawEnt(ctx, ent);
    }
    this.drawDusk(ctx);
    this.drawFireflies(ctx);
    for (const bit of this.bits) {
      if (!bit.on) continue;
      ctx.globalAlpha = Math.max(0, bit.life / bit.max);
      ctx.fillStyle = bit.color;
      if (bit.star) drawStar(ctx, bit.x, bit.y, bit.size, bit.life);
      else {
        ctx.beginPath();
        ctx.arc(bit.x, bit.y, bit.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (this.pops.length) {
      ctx.font = `800 ${Math.round(this.u * 0.16)}px Nunito, sans-serif`;
      ctx.textAlign = "center";
      for (const pop of this.pops) {
        ctx.globalAlpha = Math.max(0, pop.life / 0.7);
        ctx.fillStyle = "#241c16";
        ctx.fillText(pop.text, pop.x, pop.y - (0.7 - pop.life) * 28);
      }
      ctx.globalAlpha = 1;
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,246,232,${this.flash * 0.28})`;
      ctx.fillRect(-20, -20, this.viewW + 40, this.viewH + 40);
    }
  }

  private clouds(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    for (let i = 0; i < 5; i += 1) {
      const base = i * 220 + 30;
      const x = ((base - this.camera * 0.12) % (this.viewW + 180) + this.viewW + 180) % (this.viewW + 180) - 60;
      const y = this.u * (0.25 + (i % 3) * 0.18);
      const r = this.u * (0.12 + (i % 2) * 0.04);
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.5, r, 0, 0, Math.PI * 2);
      ctx.ellipse(x + r, y + 4, r * 1.1, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private hills(ctx: CanvasRenderingContext2D, parallax: number, base: number, amp: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-10, this.viewH + 10);
    for (let x = -10; x <= this.viewW + 10; x += 12) {
      const wx = this.camera * parallax + x;
      const y = base + Math.sin(wx * 0.01) * amp + Math.sin(wx * 0.004 + 1.4) * amp * 0.55;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.viewW + 10, this.viewH + 10);
    ctx.closePath();
    ctx.fill();
  }

  private flowers(ctx: CanvasRenderingContext2D) {
    const step = Math.max(18, this.u * 0.22);
    const start = Math.floor(this.camera / step) * step;
    const buckets = this.flowerX;
    buckets[0].length = 0;
    buckets[1].length = 0;
    buckets[2].length = 0;
    for (let wx = start; wx < this.camera + this.viewW; wx += step) {
      const n = hash(wx);
      if (n < 0.55) continue;
      const bucket = n > 0.82 ? 2 : n > 0.7 ? 1 : 0;
      buckets[bucket].push(wx - this.camera);
    }
    const colors = ["#fff6e8", "#e8a317", "#e4577a"];
    const y = this.groundY - 4;
    for (let c = 0; c < 3; c += 1) {
      const row = buckets[c]!;
      if (!row.length) continue;
      ctx.fillStyle = colors[c]!;
      ctx.beginPath();
      for (const x of row) {
        ctx.moveTo(x + 3.2, y);
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  private drawEnt(ctx: CanvasRenderingContext2D, ent: Ent) {
    const spec = SPEC[ent.kind];
    const pulse = ent.kind === "gossip" || ent.kind === "scroll" ? 1 + Math.sin(this.time * 5 + ent.anim) * 0.06 : 1;
    const baseH = spec.h * this.u * (ent.size ?? 1);
    const h = baseH * pulse;
    let bob = ent.kind === "gossip" || ent.kind === "scroll" ? Math.sin(this.time * 4 + ent.anim) * this.u * 0.04 : 0;
    let rot = 0;
    let flip = 1;
    if (ent.kind === "pigeon") {
      if (ent.fly) {
        flip = ent.face ?? 1;
        // Naklonění podle stoupání trasy, ne místo mávání.
        const climb = Math.sin(ent.fly * 1.8 + ent.anim);
        rot = climb * 0.22;
      } else {
        bob = Math.abs(Math.sin(this.time * 5 + ent.anim)) * this.u * 0.012;
      }
    } else if (ent.kind === "cyclist" && !ent.alt) {
      // Původní cyklista: pohupuje se a kola se točí (drawCyclist). Babička na kole šlape (cyclist-pedal).
      bob = Math.abs(Math.sin(this.time * 9 + ent.anim)) * this.u * 0.018;
      rot = Math.sin(this.time * 4.5 + ent.anim) * 0.025;
    } else if (ent.kind === "car") {
      bob = Math.abs(Math.sin(this.time * 8 + ent.anim)) * this.u * 0.035;
      rot = Math.sin(this.time * 8 + ent.anim) * 0.045;
    }
    const lift = ent.lift * this.u;
    const cx = ent.x - this.camera;
    const feet = this.groundY - lift - bob;
    if (ent.kind === "heart") {
      drawHeart(ctx, cx, feet - h * 0.55, h * 0.42);
      return;
    }
    if (ent.kind === "cyclist" && !ent.alt && this.drawCyclist(ctx, ent, cx, feet, h, rot)) return;
    const img =
      ent.kind === "pigeon" && ent.fly
        ? (this.pigeonFlap(ent) ?? this.spriteFor(ent))
        : ent.kind === "dog"
          ? (this.gooseFlap(ent) ?? this.spriteFor(ent))
          : ent.kind === "gardener" && ent.alt
            ? (this.gardenerWater(ent) ?? this.spriteFor(ent))
            : ent.kind === "cyclist" && ent.alt
              ? (this.cyclistPedal(ent) ?? this.spriteFor(ent))
              : this.spriteFor(ent);
    if (!img) return;
    const flyScale = ent.kind === "pigeon" && ent.fly ? 1.65 : 1;
    const drawH = h * flyScale;
    const w = drawH * (img.width / img.height);
    const baked = ent.far ? this.bakedFar(img, baseH * flyScale * this.scale) : this.baked(img, baseH * flyScale * this.scale);
    if (ent.face === -1 && FOREST.includes(ent.kind)) flip = -1;
    if (rot || flip < 0) {
      ctx.save();
      ctx.translate(this.snap(cx), this.snap(feet - drawH * 0.55));
      ctx.scale(flip, 1);
      ctx.rotate(rot);
      ctx.drawImage(baked, -w / 2, -drawH * 0.45, w, drawH);
      ctx.restore();
      return;
    }
    ctx.drawImage(baked, this.snap(cx - w / 2), this.snap(feet - drawH), w, drawH);
  }

  /** Čtyři snímky mávání, rychle dokola, jen když holub letí. */
  private pigeonFlap(ent: Ent): HTMLImageElement | null {
    const sheet = this.art.pigeonFly;
    if (!Array.isArray(sheet) || sheet.length === 0) return null;
    const index = Math.floor(this.time * 12 + ent.anim * 3) % sheet.length;
    return sheet[index] ?? null;
  }


  /** Babička na kole šlape; kolo stojí na místě. */
  private cyclistPedal(ent: Ent): HTMLImageElement | null {
    const sheet = this.art.cyclistPedal;
    if (!Array.isArray(sheet) || sheet.length === 0) return null;
    const index = Math.floor(this.time * 4 + ent.anim) % sheet.length;
    return sheet[index] ?? null;
  }

  /** Sousedka stojí a občas nakloní konev. Tělo zůstává. */
  private gardenerWater(ent: Ent): HTMLImageElement | null {
    const sheet = this.art.gardenerWater;
    if (!Array.isArray(sheet) || sheet.length === 0) return null;
    const index = Math.floor(this.time * 3 + ent.anim) % sheet.length;
    return sheet[index] ?? null;
  }

  /**
   * Původní cyklista s točícími se koly: spodní vrstva (tělo bez kol), otočená kola, nahoře rám,
   * vidlice, řetěz a nohy, které přes kola vedou. Vrací false, dokud vrstvy nejsou načtené.
   */
  private drawCyclist(ctx: CanvasRenderingContext2D, ent: Ent, cx: number, feet: number, h: number, rot: number): boolean {
    const base = this.art.cyclistBase;
    const over = this.art.cyclistOver;
    if (!(base instanceof HTMLImageElement) || !(over instanceof HTMLImageElement) || !base.height) return false;
    const k = h / CYCLIST_LAYER.srcH;
    const pad = CYCLIST_LAYER.pad;
    const left = -(base.width - 2 * pad) * k / 2 - pad * k;
    const top = -h - pad * k;
    ctx.save();
    ctx.translate(this.snap(cx), this.snap(feet));
    if (rot) ctx.rotate(rot);
    ctx.drawImage(this.baked(base, base.height * k * this.scale), left, top, base.width * k, base.height * k);
    // Jede doleva, kola se točí proti směru hodinových ručiček.
    const spin = -(this.time * 4.2 + ent.anim);
    for (const wheel of CYCLIST_LAYER.wheels) {
      const img = this.art[wheel.key];
      if (!(img instanceof HTMLImageElement) || !img.height) continue;
      const size = img.width * k;
      ctx.save();
      ctx.translate(left + wheel.x * k, top + wheel.y * k);
      ctx.rotate(spin);
      ctx.drawImage(this.baked(img, img.height * k * this.scale), -size / 2, -size / 2, size, size);
      ctx.restore();
    }
    ctx.drawImage(this.baked(over, over.height * k * this.scale), left, top, over.width * k, over.height * k);
    ctx.restore();
    return true;
  }

  /** Husa stojí a mává křídly. Tělo, krk a nohy zůstávají na místě. */
  private gooseFlap(ent: Ent): HTMLImageElement | null {
    const sheet = this.art.gooseFlap;
    if (!Array.isArray(sheet) || sheet.length === 0) return null;
    const index = Math.floor(this.time * 5 + ent.anim * 2) % sheet.length;
    return sheet[index] ?? null;
  }


  private drawPlayer(ctx: CanvasRenderingContext2D) {
    if (this.invuln > 0 && Math.floor(this.time * 18) % 2 === 0) return;
    const ducking = this.isDucking();
    const air = this.u * (1 - Math.min(1, (this.groundY - this.feet) / (this.u * 1.35)));
    ctx.fillStyle = "rgba(36, 28, 22, 0.18)";
    ctx.beginPath();
    ctx.ellipse(this.playerX, this.groundY + 3, this.u * 0.22 * (0.7 + air * 0.3), this.u * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();

    let sheet = this.art.run;
    let index = Math.floor(this.anim) % 4;
    if (this.phase === "over") {
      sheet = this.art.idle;
      index = Math.floor(this.time * 3) % 4;
    } else if (ducking) {
      sheet = this.art.duck;
      index = this.duckLock > 0.2 ? 1 + (Math.floor(this.time * 8) % 2) : 0;
    } else if (this.fish > 0 && (this.phase !== "play" || this.talk > 0)) {
      // U ryby Drběna stojí; jakmile se po rozhovoru zase rozběhne (ryba se teprve potápí), běží.
      sheet = this.art.idle;
      index = Math.floor(this.time * 3) % 4;
    } else if (!this.onGround && this.phase === "play") {
      sheet = this.art.jump;
      if (this.vy < -this.jumpSpeed * 0.25) index = 1;
      else if (this.vy > this.jumpSpeed * 0.12) index = 3;
      else index = 2;
    } else if (this.gaze > 0 && Array.isArray(this.art.look) && this.art.look.length > 0) {
      sheet = this.art.look;
      index = this.lookIndex();
    } else if (this.holds()) {
      sheet = this.art.idle;
      index = Math.floor(this.time * 2) % 4;
    } else if (this.phase === "menu") {
      sheet = this.art.run;
      index = Math.floor(this.time * 8) % 4;
    }
    const img = frameOf(sheet, index) ?? frameOf(this.art.idle, 0);
    const h = this.u;
    if (!img) {
      ctx.fillStyle = "#241c16";
      ctx.fillRect(this.playerX - 16, this.feet - h * 0.7, 32, h * 0.7);
      return;
    }
    const w = h * (img.width / img.height);
    ctx.drawImage(this.baked(img, h * this.scale), this.snap(this.playerX - w / 2), this.snap(this.feet - h), w, h);
  }

  /** Zvednutí hlavy u radnice: nahoru, chvíli držet pohled, před rozběhem zase dolů. */
  private lookIndex(): number {
    const n = Array.isArray(this.art.look) ? this.art.look.length : 1;
    const glance = this.gazeTotal < RADNICE_GAZE;
    const up = glance ? 0.45 : 0.9;
    const down = LOOK_DOWN;
    const elapsed = this.gazeTotal - this.gaze;
    const k = elapsed < up ? elapsed / up : this.gaze < down ? this.gaze / down : 1;
    return Math.min(n - 1, Math.max(0, Math.floor(k * n - 1e-6)));
  }

  private drawObora(ctx: CanvasRenderingContext2D, ent: Ent) {
    const key = ent.anim === 0 ? "oboraStart" : ent.anim === 2 ? "oboraEnd" : "oboraMid";
    const img = this.art[key];
    if (!(img instanceof HTMLImageElement) || !img.height) return;
    const h = ent.lift;
    const w = h * (img.width / img.height);
    const cx = ent.x - this.camera;
    const feet = this.groundY + 6;
    ctx.drawImage(this.baked(img, h * this.scale), this.snap(cx - w / 2), this.snap(feet - h), w, h);
  }

  private drawOak(ctx: CanvasRenderingContext2D, ent: Ent) {
    const img = this.art.oak;
    if (!(img instanceof HTMLImageElement) || !img.height) return;
    const h = Math.max(ent.lift * 1.22, this.u * 1.85);
    const w = h * (img.width / img.height);
    const cx = ent.x - this.camera;
    if (cx < -w || cx > this.viewW + w) return;
    const feet = this.groundY + 2;
    ctx.drawImage(this.baked(img, h * this.scale), this.snap(cx - w / 2), this.snap(feet - h), w, h);
  }

  private stagFrame(running: boolean, flown = 0): HTMLImageElement | null {
    const sheet = running ? this.art.stagRun : this.art.stagIdle;
    const index = running
      ? Math.floor(flown / Math.max(18, this.u * 0.22))
      : Math.floor(this.time * 1.6);
    const frame = frameOf(sheet, index);
    if (frame) return frame;
    const still = this.art.stag;
    return still instanceof HTMLImageElement ? still : null;
  }

  private drawStag(ctx: CanvasRenderingContext2D, ent: Ent) {
    const img = this.stagFrame(false);
    if (!img || !img.height) return;
    const oakH = Math.max(ent.lift * 1.22, this.u * 1.85);
    const deerH = this.u * 1.25;
    const near = Math.abs(ent.x - this.camera - this.playerX);
    const curiosity = Math.max(0, 1 - near / (this.viewW * 0.6));
    const w = deerH * (img.width / img.height);
    const cx = ent.x - this.camera - oakH * (0.1 + curiosity * 0.045);
    const top = this.groundY - deerH;
    ctx.save();
    ctx.translate(this.snap(cx), this.snap(top + deerH));
    ctx.scale(-1, 1);
    ctx.drawImage(this.baked(img, deerH * this.scale), -w / 2, -deerH, w, deerH);
    ctx.restore();
  }

  private herdStags(dt: number) {
    const px = this.camera + this.playerX;
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "stag") continue;
      if ((ent.face ?? 0) === 1) {
        this.herdMeet(ent, dt, px);
        continue;
      }
      if ((ent.sway ?? 0) >= 2) continue;
      if ((ent.sway ?? 0) < 1) {
        if (px > ent.x - this.viewW * 0.22) ent.sway = 1;
        continue;
      }
      const bolt = Math.max(this.speed * 2.4, this.speed0 * 1.7);
      ent.fly = (ent.fly ?? 0) + bolt * dt;
      const sx = ent.x + (ent.fly ?? 0) - this.camera;
      if (sx > this.viewW + this.u * 1.6) ent.sway = 2;
    }
  }

  private herdMeet(ent: Ent, dt: number, px: number) {
    const phase = ent.sway ?? 0;
    if (phase >= 4) return;
    if (phase < 1) {
      if (px > ent.x - this.viewW * 1.55) ent.sway = 1;
      return;
    }
    if (phase === 1) {
      const bolt = Math.max(this.speed * 0.85, this.speed0 * 0.32);
      ent.fly = (ent.fly ?? 0) - bolt * dt;
      const sx = ent.x + (ent.fly ?? 0) - this.camera;
      const stand = this.playerX + this.u * 0.96;
      if (sx <= stand) {
        ent.fly = (ent.fly ?? 0) + (stand - sx);
        ent.sway = 2;
        ent.wait = 0;
        this.stagDialogueDeer = ent;
        this.stagDialogueStory = stagStoryFor(this.stagMeetings);
        this.stagDialogueIndex = 0;
        this.phase = "dialogue";
        this.releaseInputs();
        this.feet = this.groundY;
        this.vy = 0;
        this.onGround = true;
        this.pushHud(true);
      }
      return;
    }
    if (phase === 2) return; // Čeká na ukončení rozhovoru hráčem.
    const jumpFor = 0.92;
    const wait = (ent.wait ?? 0) + dt;
    ent.wait = wait;
    const start = this.playerX + this.u * 0.96;
    const end = this.playerX - this.u * 1.15;
    if (wait <= jumpFor) {
      ent.fly = (ent.fly ?? 0) + (this.speed + (end - start) / jumpFor) * dt;
      if (wait > jumpFor * 0.86 && wait - dt <= jumpFor * 0.86) {
        const sx = ent.x + (ent.fly ?? 0) - this.camera;
        this.burst(sx, this.groundY, "#e7d3a4", 5);
      }
      return;
    }
    ent.fly = (ent.fly ?? 0) - Math.max(this.speed * 0.7, this.speed0 * 0.45) * dt;
    const sx = ent.x + (ent.fly ?? 0) - this.camera;
    if (sx < -this.u * 1.8) ent.sway = 4;
  }

  private drawStagRun(ctx: CanvasRenderingContext2D, ent: Ent) {
    const img = this.stagFrame(true, ent.fly ?? 0);
    if (!img || !img.height) return;
    const deerH = this.u * 1.25;
    const w = deerH * (img.width / img.height);
    const flown = ent.fly ?? 0;
    const cx = ent.x + flown - this.camera;
    if (cx < -w || cx > this.viewW + w) return;
    ctx.drawImage(this.baked(img, deerH * this.scale), this.snap(cx - w / 2), this.snap(this.groundY - deerH), w, deerH);
  }

  private drawStagMeet(ctx: CanvasRenderingContext2D, ent: Ent) {
    const phase = ent.sway ?? 0;
    const wait = ent.wait ?? 0;
    const jumping = phase >= 3 && wait <= 0.92;
    const p = jumping ? wait / 0.92 : 0;
    const img = jumping
      ? this.stagJumpFrame(p)
      : this.stagFrame(phase !== 2, phase === 1 ? this.time * this.u * 1.8 : wait * this.speed0);
    if (!img || !img.height) return;
    const deerH = this.u * 1.25;
    const w = deerH * (img.width / img.height);
    const cx = ent.x + (ent.fly ?? 0) - this.camera;
    if (cx < -w || cx > this.viewW + w) return;
    const hop = jumping ? Math.sin(p * Math.PI) * this.u * 1.2 : 0;
    const tilt = jumping ? -0.32 * Math.sin(p * Math.PI) : 0;
    ctx.save();
    ctx.translate(this.snap(cx), this.snap(this.groundY - hop));
    ctx.scale(-1, 1);
    ctx.rotate(tilt);
    ctx.drawImage(this.baked(img, deerH * this.scale), -w / 2, -deerH, w, deerH);
    ctx.restore();
  }

  private stagJumpFrame(p: number): HTMLImageElement | null {
    const index = p < 0.2 ? 3 : p < 0.68 ? 2 : p < 0.9 ? 0 : 1;
    return frameOf(this.art.stagRun, index) ?? this.stagFrame(false);
  }

  private fireflyPos(ent: Ent, ago = 0): { x: number; y: number } {
    const phase = ent.anim;
    const radius = Math.abs(ent.sway ?? this.u * 0.22);
    const t = this.time - ago;
    const loop = Math.sin(t * 0.85 + phase);
    return {
      x: ent.x - this.camera + loop * radius + Math.sin(t * 0.37 + phase * 2) * this.u * 0.06,
      y:
        this.groundY -
        ent.lift * this.u +
        Math.sin(t * 1.45 + phase * 1.7) * this.u * 0.1 +
        loop * this.u * 0.045,
    };
  }

  private drawFireflies(ctx: CanvasRenderingContext2D) {
    const u = this.u;
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "firefly") continue;
      const glow = this.nightAt(ent.x);
      if (glow < 0.05) continue;
      const at = this.fireflyPos(ent);
      if (at.x < -30 || at.x > this.viewW + 30) continue;
      const blink = 0.58 + 0.42 * (0.5 + 0.5 * Math.sin(this.time * 2.2 + ent.anim));
      const wing = 0.3 + 0.7 * Math.abs(Math.sin(this.time * 16 + ent.anim));
      const a = glow * blink;
      for (let i = 2; i >= 1; i -= 1) {
        const p = this.fireflyPos(ent, i * 0.08);
        ctx.fillStyle = `rgba(168, 214, 88, ${a * 0.1 * (3 - i)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, u * (0.04 + i * 0.012), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(174, 214, 92, ${0.2 * a})`;
      ctx.beginPath();
      ctx.arc(at.x, at.y, u * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(214, 240, 150, ${0.38 * a})`;
      ctx.beginPath();
      ctx.arc(at.x, at.y, u * 0.085, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(236, 255, 206, ${0.5 * a * wing})`;
      ctx.beginPath();
      ctx.ellipse(at.x - u * 0.05, at.y, u * 0.055, u * 0.018, -0.7, 0, Math.PI * 2);
      ctx.ellipse(at.x + u * 0.05, at.y, u * 0.055, u * 0.018, 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 252, 224, ${a})`;
      ctx.beginPath();
      ctx.ellipse(at.x, at.y, u * 0.026, u * 0.014, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private nightAt(x: number): number {
    let dusk = 0;
    const fadeIn = this.viewW * 1.15;
    const fadeOut = this.viewW * 1.2;
    for (const span of this.oboraSpans) {
      const into = (x - (span.from - fadeIn)) / fadeIn;
      const out = (span.to - x) / fadeOut;
      const t = Math.max(0, Math.min(1, into, out));
      if (t > dusk) dusk = t;
    }
    return dusk * dusk * (3 - 2 * dusk);
  }

  private drawDusk(ctx: CanvasRenderingContext2D) {
    const smooth = this.nightAt(this.camera + this.playerX);
    if (smooth <= 0.01) return;
    const skyH = Math.max(this.groundY, 10);
    const sky = ctx.createLinearGradient(0, 0, 0, skyH);
    sky.addColorStop(0, `rgba(4, 8, 22, ${0.9 * smooth})`);
    sky.addColorStop(0.62, `rgba(14, 26, 58, ${0.74 * smooth})`);
    sky.addColorStop(1, `rgba(32, 42, 68, ${0.22 * smooth})`);
    ctx.fillStyle = sky;
    ctx.fillRect(-30, -30, this.viewW + 60, skyH + 8);
    ctx.fillStyle = `rgba(10, 16, 36, ${0.16 * smooth})`;
    ctx.fillRect(-30, skyH, this.viewW + 60, this.viewH);
    ctx.save();
    ctx.globalAlpha = smooth;
    ctx.fillStyle = "#f3efd8";
    ctx.beginPath();
    ctx.arc(this.viewW * 0.16, this.u * 0.36, this.u * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(4, 8, 22, 0.55)";
    ctx.beginPath();
    ctx.arc(this.viewW * 0.16 + this.u * 0.035, this.u * 0.34, this.u * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    for (let i = 0; i < 42; i += 1) {
      const n = hash(i * 19.17);
      const n2 = hash(i * 7.31 + 4);
      const sx = ((n * this.viewW * 2.4 - this.camera * 0.03) % this.viewW + this.viewW) % this.viewW;
      const sy = 8 + n2 * (skyH * 0.7);
      const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this.time * (1.1 + n) + i));
      ctx.globalAlpha = smooth * tw;
      ctx.fillStyle = n > 0.9 ? "#fff4c8" : "#f7f3ea";
      const s = n > 0.88 ? 2.2 : 1.25;
      ctx.fillRect(sx, sy, s, s);
    }
    ctx.globalAlpha = 1;
  }

  private placeAt(x: number): { id: PlaceId; name: string } {
    if (this.oboraSpans.some((span) => x >= span.from && x <= span.to)) {
      return { id: "park", name: "Kopidlenská obora" };
    }
    const village = this.villageZones.find((zone) => x >= zone.from - this.u * 0.08 && x < zone.to + this.u * 0.08);
    if (village) return { id: village.id, name: village.name };
    // Pergameny leží často na cestě před vsí: patří k místu, kam Drběna běží.
    const between = this.approaches.find((gap) => x >= gap.from && x < gap.to);
    if (between) return { id: between.place, name: between.label };
    const u = this.u;
    const cycle = CYCLE_LEN;
    const n = Math.floor(x / cycle);
    const origin = n * cycle;
    const square = origin + this.anchor();
    const church = square + u * 7.6;
    const school = square + u * 12.2;
    const castle = stageStart(n * 4 + 1) + this.anchor();
    const glass = stageStart(n * 4 + 2) + this.anchor();
    const pond = this.pondX(stageStart(n * 4 + 3));
    const nextSquare = origin + cycle + this.anchor();
    if (x < (church + school) / 2) return { id: "namesti", name: "Náměstí" };
    if (x < (school + castle) / 2) return { id: "skola", name: "Stará škola" };
    if (x < (castle + glass) / 2) return { id: "zamek", name: "Zámek" };
    if (x < (glass + pond) / 2) return { id: "sklenik", name: "Palmový skleník" };
    if (x < (pond + nextSquare) / 2) return { id: "park", name: "Zámecký park" };
    return { id: "namesti", name: "Náměstí" };
  }

  private pondX(chunkStart: number): number {
    return chunkStart + this.anchor();
  }

  private nextTown(x: number): number {
    const cycle = CYCLE_LEN;
    const n = Math.floor(x / cycle);
    const here = n * cycle + this.anchor();
    const houses = here > x ? here : (n + 1) * cycle + this.anchor();
    return houses - this.u * 2.2;
  }

  private rowWidth(parts: { kind: Kind; gap: number }[]): number {
    // Skutečné rozměry načtených spriteů; nepoužívat druhé, ručně opisované poměry stran.
    return parts.reduce((sum, part) => sum + this.visualHalf(part.kind) * 2 + part.gap, 0);
  }

  private plantRow(x: number, parts: { kind: Kind; gap: number }[]) {
    for (const part of parts) {
      const w = this.visualHalf(part.kind) * 2;
      // Rybník Zrcadlo trochu zapustit do trávy: dole má tenký průhledný proužek.
      this.ents.push({ kind: part.kind, x: x + w / 2, lift: part.kind === "mlynec-pond" ? -0.035 : 0, anim: 0, alive: true });
      if (part.kind === "laundry") {
        // Pod prádlem leží drby, kdo se přikrčí, posbírá je.
        for (let i = 0; i < 3; i += 1) {
          this.ents.push({ kind: "gossip", x: x + w / 2 + (i - 1) * this.u * 0.36, lift: 0.08, anim: i, alive: true });
        }
      }
      x += w + part.gap;
    }
  }

  private plantPause(from: number, to: number, scene: Scene, byPseves = false) {
    // Kraje mezer necháváme volné, aby ani široká koruna stromu nezakryla
    // sousední vesnici. Krucifix a srdce musí být vidět celé.
    const setback = this.visualHalf("tree") + this.u * 0.55;
    const left = from + setback;
    const right = to - setback;
    const room = right - left;
    if (room < this.u * 0.95) return;
    if (room < this.u * 3) {
      this.ents.push({ kind: "bush", x: (left + right) / 2, lift: 0, anim: 0, alive: true });
      return;
    }
    // Celé koruny mezi `a` a `b`: les nezakryje ceduli vsi (stojí kousek před první stavbou).
    const a = from + this.u * 0.6;
    const b = to - this.u * 1.7;
    const u = this.u;
    // U Pševsi bez lip, ať je lipová alej jen jedna.
    const kinds = byPseves ? FOREST.filter((kind) => kind !== "forest-linden") : FOREST;
    if (scene === "les") {
      this.plantForest(a, b);
      return;
    }
    if (scene === "haj") {
      // Dva až tři hájky mezi loukami.
      const count = b - a > u * 26 ? 3 : 2;
      const slot = (b - a) / count;
      for (let i = 0; i < count; i += 1) {
        const width = Math.min(slot * 0.7, u * (3.5 + Math.random() * 2.5));
        const start = a + slot * i + Math.random() * (slot - width);
        this.plantForest(start, start + width, kinds);
        if (i < count - 1) this.plantBush(a + slot * (i + 1) - u * 0.2);
      }
      return;
    }
    // Stromy podél cesty (po jednom, s keři mezi nimi), nebo pole jen s pár stromy a keři.
    const gap = scene === "stromy" ? [2.4, 3.6] : [5.5, 8];
    let x = a + u * (0.4 + Math.random());
    let last: Kind | null = null;
    for (let guard = 0; guard < 60 && x < b; guard += 1) {
      let kind = kinds[Math.floor(Math.random() * kinds.length)]!;
      if (kind === last) kind = kinds[(kinds.indexOf(kind) + 1) % kinds.length]!;
      const size = Math.round((0.85 + Math.random() * 0.2) * 20) / 20;
      const half = this.visualHalf(kind) * size;
      if (x + half * 2 > b) break;
      this.ents.push({ kind, x: x + half, lift: 0, anim: 0, alive: true, size, face: Math.random() < 0.5 ? -1 : 1 });
      last = kind;
      const step = u * (gap[0]! + Math.random() * (gap[1]! - gap[0]!));
      if (Math.random() < 0.6 && x + half * 2 + step * 0.5 < b) this.plantBush(x + half * 2 + step * 0.5);
      x += half * 2 + step;
    }
  }

  private plantBush(x: number) {
    this.ents.push({ kind: "bush", x, lift: 0, anim: 0, alive: true, face: Math.random() < 0.5 ? -1 : 1 });
  }

  /**
   * Les mezi vesnicemi: dvě řady stromů z FOREST, přední plná a přes sebe, zadní menší a ztmavená.
   * Druhy se střídají, velikost a zrcadlení jsou náhodné, ať se les neopakuje. Celé koruny zůstanou
   * mezi `left` a `right`, takže les nezakryje ceduli ani první stavbu vsi.
   */
  private plantForest(left: number, right: number, kinds: readonly Kind[] = FOREST) {
    const rows: { far: boolean; min: number; max: number; overlap: number; lift: number; start: number }[] = [
      { far: true, min: 0.7, max: 0.85, overlap: 0.62, lift: 0.04, start: this.u * 0.35 },
      { far: false, min: 0.85, max: 1.05, overlap: 0.82, lift: 0, start: 0 },
    ];
    for (const row of rows) {
      let x = left + row.start;
      let last: Kind | null = null;
      for (let guard = 0; guard < 200; guard += 1) {
        let kind = kinds[Math.floor(Math.random() * kinds.length)]!;
        if (kind === last) kind = kinds[(kinds.indexOf(kind) + 1 + Math.floor(Math.random() * (kinds.length - 1))) % kinds.length]!;
        // Velikosti po 0,05, ať se předkreslených obrázků nenadělá moc.
        const size = Math.round((row.min + Math.random() * (row.max - row.min)) * 20) / 20;
        const w = this.visualHalf(kind) * 2 * size;
        if (x + w > right) break;
        this.ents.push({ kind, x: x + w / 2, lift: row.lift, anim: 0, alive: true, size, far: row.far, face: Math.random() < 0.5 ? -1 : 1 });
        last = kind;
        x += w * row.overlap;
      }
    }
  }

  private approachAfter(end: number) {
    if (this.approaches.some((row) => Math.abs(row.from - end) < 12)) return;
    const u = this.u;
    const houses = this.nextTown(end + 1) + u * 2.2;
    // Při návratu do Kopidlna: cedule, chvíle volna, radnice, krátká pauza a pak infocentrum a náměstí.
    const infoLeft = houses - this.infoOffset() - this.visualHalf("info");
    const radnice = infoLeft - u * 0.9 - this.visualHalf("radnice");
    const limit = radnice - this.visualHalf("radnice") - u * 1.6;
    const room = limit - end;

    // Po rybníku / oboře následují čtyři samostatné vsi, poté návrat do Kopidlna.
    // Stavby uvnitř každé vsi drží pohromadě, volný prostor patří POUZE mezi obce.
    const groups: { id: PlaceId; name: string; parts: { kind: Kind; gap: number }[] }[] = [
      // Mlýnec: krucifix, zvonička, škola a rybník Zrcadlo (dům ze vsi už ve hře není).
      { id: "mlynec", name: "Mlýnec", parts: [
        { kind: "mlynec-cross", gap: u * 0.3 },
        { kind: "mlynec-bell", gap: u * 0.3 },
        { kind: "mlynec-school", gap: u * 0.25 },
        { kind: "mlynec-pond", gap: 0 },
      ] },
      { id: "ledkov", name: "Ledkov", parts: [
        { kind: "ledkov-a", gap: u * 0.22 },
        { kind: "ledkov-b", gap: 0 },
      ] },
      { id: "drahoraz", name: "Drahoraz", parts: [
        { kind: "drahoraz-church", gap: u * 0.04 },
        { kind: "drahoraz-tower", gap: u * 0.27 },
        { kind: "apple-0", gap: u * 0.18 },
        { kind: "apple-1", gap: u * 0.16 },
        { kind: "apple-2", gap: 0 },
      ] },
      { id: "pseves", name: "Pševes", parts: [
        { kind: "pseves-house", gap: u * 0.3 },
        { kind: "linden", gap: u * 0.15 },
        { kind: "pseves-heart", gap: 0 },
      ] },
    ];
    // Prádlo na šňůře: překážka na podlézání jen ve vsích, mezi stavbami. Každá ves ho má
    // s poloviční šancí, v kole aspoň jedna. Místo ve vsi je za `after`-tou stavbou.
    const laundryAfter = [1, 0, 1, 1];
    const withLaundry = groups.map(() => Math.random() < 0.5);
    if (!withLaundry.some(Boolean)) withLaundry[Math.floor(Math.random() * groups.length)] = true;
    groups.forEach((group, i) => {
      if (!withLaundry[i]) return;
      const at = laundryAfter[i]!;
      const before = group.parts[at]!;
      group.parts.splice(at + 1, 0, { kind: "laundry", gap: Math.max(before.gap, u * 0.3) });
      before.gap = Math.max(before.gap, u * 0.3);
    });
    const widths = groups.map((group) => this.rowWidth(group.parts));
    const buildings = widths.reduce((sum, w) => sum + w, 0);
    const slack = room - buildings;
    if (slack < u * 1.7) return;

    // Pět intervalů: po rybníku, mezi čtyřmi vesnicemi a před Kopidlnem.
    // Rozdělit CELÝ zbývající prostor, jinak vznikne nechtěná pustina za Pševsí.
    const weights = [1.4, 1.8, 1.8, 1.8, 1.4];
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    const pauses = weights.map((weight) => (slack * weight) / weightSum);
    const starts: number[] = [];
    let cursor = end;
    for (let i = 0; i < groups.length; i += 1) {
      cursor += pauses[i]!;
      starts.push(cursor);
      cursor += widths[i]!;
    }
    const ends = starts.map((at, i) => at + widths[i]!);

    const labels = ["Cesta do Mlýnce", "Cesta do Ledkova", "Cesta do Drahorazi", "Cesta do Pševsi"];
    for (let i = 0; i < groups.length; i += 1) {
      const from = i === 0 ? end : ends[i - 1]!;
      this.approaches.push({ from, to: starts[i]!, village: ends[i]! + u * 0.15, label: labels[i]!, place: groups[i]!.id });
      this.villageZones.push({ from: starts[i]!, to: ends[i]!, name: groups[i]!.name, id: groups[i]!.id });
    }
    this.approaches.push({ from: ends[ends.length - 1]!, to: limit, village: houses, label: "Cesta do Kopidlna", place: "namesti" });
    // Cedule obcí stojí kousek před první stavbou vsi.
    // Kopidlno má ceduli jen při návratu na konci „Cesty do Kopidlna“ (na úplném začátku hry ne).
    // Mezi cedulí a infocentrem stojí radnice (`radnice`, `limit` končí před ní).
    const signs: (Kind | null)[] = ["sign-mlynec", "sign-ledkov", "sign-drahoraz", "sign-pseves"];
    const signGap = u * 0.35;
    signs.forEach((kind, i) => {
      if (!kind) return;
      this.ents.push({ kind, x: starts[i]! - signGap - this.visualHalf(kind), lift: 0, anim: 0, alive: true });
    });
    this.ents.push({ kind: "sign-kopidlno", x: limit - signGap - this.visualHalf("sign-kopidlno"), lift: 0, anim: 0, alive: true });
    // anim = kolo, ve kterém radnice stojí (podle vesnic před ní): hádanka jen v kolech s rybníkem.
    this.ents.push({ kind: "radnice", x: radnice, lift: 0, anim: Math.floor(end / CYCLE_LEN), alive: true });
    // Před radnicí nic velkého a žádná dekorace přes ni.
    const keep = this.visualHalf("radnice") + u * 0.6;
    for (const ent of this.ents) {
      if (!ent.alive) continue;
      // Žádná překážka těsně před radnicí (koza by ji přeskakovala a nezastavila pod erbem).
      const calmFrom = Math.min(radnice - this.visualHalf("radnice") - u * 2.4, radnice - u * 0.55 - this.radniceCalm() - u);
      if ((HAZARDS.has(ent.kind) || ent.kind === "gossip" || ent.kind === "scroll" || ent.kind === "heart") && ent.x > calmFrom && ent.x < radnice + u * 0.6) {
        ent.alive = false;
        continue;
      }
      if (Math.abs(ent.x - radnice) > keep + this.visualHalf(ent.kind)) continue;
      if (PROPS.has(ent.kind) || BIG_HAZARDS.has(ent.kind)) ent.alive = false;
    }

    // Odstranit předem náhodně vygenerované dekorace; vrátit jen venkovskou zeleň
    // v mezerách. V obcích se nesmí objevit ani překážka překrývající budovu.
    const hazardPad = this.visualHalf("branch") + u * 0.15;
    for (const ent of this.ents) {
      if (!ent.alive || ent.x <= end || ent.x >= limit) continue;
      if (PROPS.has(ent.kind)) ent.alive = false;
      else if (HAZARDS.has(ent.kind) && starts.some((at, i) => ent.x >= at - hazardPad && ent.x <= ends[i]! + hazardPad)) ent.alive = false;
      // Cedule stojí před vsí: větev, která už tu byla, by ji zakryla.
      else if (BIG_HAZARDS.has(ent.kind) && this.coversScenery(ent.x, ent.kind)) ent.alive = false;
    }
    // Krajina na cestách: kolem Kopidlna hlavně pole, stromy podél cest a hájky, souvislý les
    // jen na jedné cestě za kolo. Pořadí se každé kolo zamíchá, ale u Pševsi les ani hájek není:
    // mezi Pševsí a Kopidlnem les doopravdy není a lipová alej nesmí splynout s lesem.
    const nearPseves: Scene = Math.random() < 0.5 ? "stromy" : "pole";
    const rest: Scene[] = ["haj", "haj", nearPseves === "stromy" ? "pole" : "stromy"];
    for (let i = rest.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j]!, rest[i]!];
    }
    // Les na jedné z prvních tří cest (po rybníku, do Ledkova, do Drahorazi); cesta do Pševsi
    // dostane, co zbude, jen ne les.
    rest.splice(Math.floor(Math.random() * 3), 0, "les");
    const scenes: Scene[] = [...rest, nearPseves];
    for (let i = 0; i < groups.length; i += 1) {
      const from = i === 0 ? end : ends[i - 1]!;
      this.plantPause(from, starts[i]!, scenes[i]!, i === groups.length - 1);
      this.plantRow(starts[i]!, groups[i]!.parts);
    }
    this.plantPause(ends[ends.length - 1]!, limit, scenes[4]!, true);
  }

  private pushHud(force: boolean) {
    if (!force && this.phase === "loading") return;
    const combo = this.time - this.lastCollect < 1.15 ? this.combo : 0;
    this.onHud({
      phase: this.phase,
      score: this.score(),
      best: this.best,
      bestGossips: this.bestGossips,
      gossips: this.gossips,
      combo,
      lives: this.lives,
      bonusLife: this.bonusLife,
      biome: this.placeAt(this.camera + this.playerX).name,
      fact: this.fact,
      factLabel: this.factLabel,
      factComplete: this.factComplete,
      chronicleNew: this.chronicleNew,
      scrolls: this.scrollsKnown,
      scrollsTotal: this.scrollsTotal,
      newBest: this.newBest,
      muted: this.muted,
      coach: this.phase === "play" && !this.taleLife && (!this.coachJump || !this.coachDuck) && this.run < 1400,
      line: this.tale,
      // Příhoda se ukáže i během oznámení kroniky (karty jsou pod sebou), jinak by do té doby vypršela.
      showTale: this.taleLife > 0 && this.phase === "play",
      taleTag: this.taleTag,
      taleTitle: this.taleTitle,
      ready: this.ready,
      progress: Math.min(1, this.loaded / this.loadTotal),
      bonus: this.bonus ? bonusHud(this.bonus) : null,
      stagDialogue: this.phase === "dialogue" && this.stagDialogueStory
        ? {
            ...this.stagDialogueStory.lines[this.stagDialogueIndex]!,
            title: this.stagDialogueStory.title,
            step: this.stagDialogueIndex + 1,
            total: this.stagDialogueStory.lines.length,
            chapter: this.stagMeetings < STAG_STORIES.length ? this.stagMeetings + 1 : null,
            chapters: STAG_STORIES.length,
          }
        : null,
      fishDialogue: this.phase === "dialogue" ? this.fishDialogue : null,
      erbQuiz: this.phase === "erb-quiz" ? this.erbQuiz : null,
    });
  }

  private maybeFish() {
    if (this.talk > 0 || this.fish > 0) return;
    const here = this.camera + this.playerX;
    for (const ent of this.ents) {
      if (ent.kind !== "pond" || !ent.alive) continue;
      const id = stageIndex(ent.x);
      if (id === this.lastFish) continue;
      const fishAt = ent.x + this.u * 1.15;
      // Když ryba jen volá (Drběna nezastavuje), vykoukne dřív, ať je chvíli vidět před kozou.
      const talking = Math.floor(Math.floor(fishAt / CYCLE_LEN) / 2) % 2 === 1;
      const from = talking ? fishAt - this.viewW * 0.55 : fishAt - this.u * 1.7;
      if (here > from && here < fishAt - this.u * 0.55) {
        this.lastFish = id;
        this.startFish(fishAt);
        return;
      }
    }
  }

  private startFish(x: number) {
    this.fishX = x;
    this.fishAge = 0;
    for (const ent of this.ents) {
      if ((ent.kind === "tree" || FOREST.includes(ent.kind)) && Math.abs(ent.x - (x - this.u * 1.15)) < this.u * 2.6) ent.alive = false;
      if (!HAZARDS.has(ent.kind) || !ent.alive) continue;
      if (ent.x > x - this.u * 9.2 && ent.x < x + this.u * 8) ent.alive = false;
    }
    // Rybník je v lichých kolech (0, 2, 4 … od nuly): v 1., 5., 9. kole ryba nabídne minihru,
    // ve 3., 7. … jen zavolá z vody vtipnou hlášku a Drběna běží dál.
    const pondLoop = Math.floor(x / CYCLE_LEN);
    if (Math.floor(pondLoop / 2) % 2 === 0) {
      // Drběna u ryby zastaví (i ze skoku rovnou na zem).
      this.vy = 0;
      this.onGround = true;
      this.feet = this.groundY;
      this.releaseInputs();
      this.bonus = createOfferedMini();
      this.fishDialogue = null;
      this.phase = "fish-intro";
      this.fish = 2.6;
      this.talk = 0;
      this.tale = "";
      this.taleLife = 0;
      this.taleTag = "Ryba z rybníka";
      this.sfx.fact();
      this.pushHud(true);
      return;
    }
    let index = Math.floor(Math.random() * FISH.length);
    if (FISH.length > 1 && index === this.fishTold) index = (index + 1) % FISH.length;
    this.fishTold = index;
    this.bonus = null;
    this.fishDialogue = null;
    // Hláška ryby hru nezastavuje: ryba vykoukne z vody a její vtip je na kartičce příhody.
    this.fish = 5.2;
    this.fishAge = 0;
    this.talk = 0;
    this.tale = FISH[index] ?? FISH[0]!;
    this.taleTag = "Ryba z rybníka";
    this.taleTitle = "Ryba volá z vody";
    this.taleLife = 2.6;
    this.sfx.fact();
    this.pushHud(true);
  }

  private grantBonus(points: number) {
    this.gossipScore += points;
    const healed = healFromBonus(this.lives);
    this.lives = healed.lives;
    this.bonusLife = healed.gained;
    const text = healed.gained ? "nepočítá se" : `+${points}`;
    this.pops.push({ x: this.playerX, y: this.feet - this.u * 0.8, text, life: 0.9 });
    this.burst(this.playerX, this.feet - this.u * 0.7, "#e4577a", 10);
    this.sfx.collect(4);
    if (healed.gained) this.sfx.collect(2);
  }

  private playAlarm(events: AlarmEvent[]) {
    for (const event of events) {
      if (event === "thud") this.sfx.alarmThud();
      else if (event === "bleat") this.sfx.alarmBleat();
      else if (event === "honk") this.sfx.alarmHonk();
      else if (event === "keeper") this.sfx.alarmKeeper();
      else if (event === "fanfare") this.sfx.alarmFanfare();
      else if (event === "stumble") this.sfx.alarmStumble();
      else this.sfx.alarmCricket();
    }
  }

  private resumeRun() {
    const gained = this.bonusLife;
    this.bonusLife = false;
    this.bonus = null;
    this.phase = "play";
    this.releaseInputs();
    this.fish = 1.05;
    this.talk = gained ? 2.2 : 1.05;
    this.tale = gained ? BONUS_PARDON_TALE : "";
    this.taleLife = gained ? 2.2 : 0;
    this.taleTag = gained ? "Ryba z rybníka" : "Příhoda";
    this.taleTitle = gained ? "Dobrý skutek se vyplatí!" : "";
    this.pushHud(true);
  }

  private releaseInputs() {
    this.keyJump = false;
    this.keyDuck = false;
    this.touchJump = false;
    this.touchDuck = false;
    this.jumpEdge = false;
    this.padJump = false;
    this.padDuck = false;
  }

  private drawFish(ctx: CanvasRenderingContext2D) {
    if (this.fish <= 0) return;
    const img = this.art.fish;
    if (!(img instanceof HTMLImageElement)) return;
    const duration = 5.2;
    const t = 1 - this.fish / duration;
    const age = this.fishAge;
    const rise = Math.min(1, age / FISH_RISE_SECONDS);
    const heldAboveWater = this.phase === "fish-intro" || this.phase === "bonus" || (this.phase === "dialogue" && this.fishDialogue !== null);
    // Vynoření s přešvihnutím (ryba vyskočí kousek nad a usadí se), ponoření plynule zrychluje.
    const peek = heldAboveWater ? easeOutBack(rise) : t < 0.16 ? easeOutBack(t / 0.16) : t > 0.84 ? 1 - easeIn(1 - (1 - t) / 0.16) : 1;
    const sinking = !heldAboveWater && t > 0.84;
    const water = this.groundY - this.u * 0.58;
    const x = this.fishX - this.camera;
    const fh = this.u * 1.05;
    const fw = fh * (img.width / img.height);
    const settled = Math.min(1, Math.max(0, (age - FISH_RISE_SECONDS) / 0.6));
    const bob = Math.sin(this.time * 3.2) * this.u * 0.025 * settled;
    const top = water - peek * fh * 0.76 + bob;
    // Při vynořování se ryba trochu natáhne a nakloní, nahoře se pohupuje.
    const speedUp = heldAboveWater ? Math.max(0, 1 - rise) : sinking ? 0.6 : 0;
    const stretch = 1 + 0.1 * speedUp;
    // Ryba kouká doleva: kladný úhel zvedá hlavu (vynořování), záporný ji sklání (potápění).
    const tilt = (heldAboveWater ? 0.22 * (1 - Math.min(1, rise * 1.3)) : sinking ? -0.2 * (1 - peek) : 0) + Math.sin(this.time * 2.1) * 0.035 * settled;
    const baked = this.baked(img, fh * this.scale);

    this.drawFishRipples(ctx, x, water, fw, age, sinking ? 1 - peek : 0);

    ctx.save();
    ctx.beginPath();
    // Obdélník začíná nad obrazovkou (-30), proto výška + 30: ryba je oříznutá přesně na hladině.
    ctx.rect(-30, -30, this.viewW + 60, water + 30 + 2);
    ctx.clip();
    ctx.translate(x, top + fh * 0.62);
    ctx.rotate(tilt);
    ctx.scale(1 / Math.sqrt(stretch), stretch);
    ctx.drawImage(baked, -fw / 2, -fh * 0.62, fw, fh);
    ctx.restore();

    // Hladina přes spodek ryby: průsvitný pruh vody a pěna, ať ryba z vody opravdu vylézá.
    const half = fw * (0.34 + 0.06 * peek);
    ctx.save();
    const band = ctx.createLinearGradient(0, water - this.u * 0.07, 0, water + 6);
    band.addColorStop(0, "rgba(120, 170, 205, 0)");
    band.addColorStop(1, "rgba(110, 165, 205, 0.55)");
    ctx.fillStyle = band;
    ctx.beginPath();
    ctx.ellipse(x, water + 2, half, this.u * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    const foam = 11;
    for (let i = 0; i < foam; i += 1) {
      const k = (i + 0.5 + Math.sin(i * 7.3) * 0.35) / foam;
      const fx = x + (k * 2 - 1) * half * 0.95;
      const wave = Math.sin(this.time * 6 + i * 1.7) * this.u * 0.012;
      const r = this.u * (0.018 + 0.02 * Math.abs(Math.sin(i * 2.3 + this.time * 2.4))) * (0.5 + 0.5 * peek);
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.45 + 0.35 * Math.abs(Math.sin(i * 3.1))).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(fx, water + wave, r * 1.6, r, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    this.drawFishSplash(ctx, x, water, fw, fh, top, age, heldAboveWater);
  }

  /** Kapka vody: průsvitná modrobílá s malým odleskem. */
  private drop(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number) {
    ctx.fillStyle = `rgba(190, 225, 248, ${(0.75 * alpha).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.9 * alpha).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.4, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Kruhy na hladině: tři při vynoření, pak jemně dokola, při ponoření další. */
  private drawFishRipples(ctx: CanvasRenderingContext2D, x: number, water: number, fw: number, age: number, sink: number) {
    const starts = [0, 0.22, 0.48];
    const life = 1.5;
    const rings: number[] = [];
    for (const at of starts) rings.push(age - at);
    for (let at = 1.6; at < age; at += 1.7) rings.push(age - at);
    if (sink > 0) rings.push(sink * 0.9, sink * 0.9 - 0.25);
    ctx.save();
    ctx.lineWidth = 2;
    for (const since of rings) {
      if (since < 0 || since > life) continue;
      const k = since / life;
      const ease = 1 - (1 - k) * (1 - k);
      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.75 * (1 - k)).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(x, water + 1, fw * (0.36 + 0.55 * ease), this.u * (0.05 + 0.06 * ease), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Šplouchnutí při vynoření (kapky po parabole) a občasné kapky stékající z ryby, dokud je nahoře. */
  private drawFishSplash(ctx: CanvasRenderingContext2D, x: number, water: number, fw: number, fh: number, top: number, age: number, held: boolean) {
    const u = this.u;
    const g = u * 5.5;
    ctx.save();
    for (let i = 0; i < 12; i += 1) {
      const born = 0.12 + (i % 5) * 0.035;
      const since = age - born;
      if (since < 0) continue;
      const side = i % 2 === 0 ? -1 : 1;
      const spread = 0.25 + ((i * 37) % 11) / 11 * 0.75;
      const vx = side * spread * u * 1.6;
      const vy = -(1.6 + ((i * 53) % 7) / 7 * 1.6) * u;
      // Kapky odlétají od hlavy a ocasu ven, ne přes rybu.
      const px = x + side * fw * (0.34 + 0.12 * spread) + vx * since;
      const py = water + vy * since + 0.5 * g * since * since;
      if (py > water + 4 || since > 1.6) continue;
      const r = u * (0.013 + ((i * 29) % 5) * 0.003);
      this.drop(ctx, px, py, r, 1 - since / 1.6);
    }
    if (held && age > FISH_RISE_SECONDS) {
      // Kapka steče z ryby zhruba každých 0,9 s a dopadne do vody.
      const period = 0.9;
      for (let n = 0; n < 2; n += 1) {
        const cycle = Math.floor((age - FISH_RISE_SECONDS) / period) - n;
        if (cycle < 0) continue;
        const since = age - FISH_RISE_SECONDS - cycle * period;
        const off = ((cycle * 0.618) % 1) * 2 - 1;
        const dx = x + off * fw * 0.3;
        const from = top + fh * 0.62;
        const py = from + 0.5 * g * since * since;
        if (py > water) continue;
        this.drop(ctx, dx, py, u * 0.016, 1);
      }
    }
    ctx.restore();
  }

  private snap(value: number) {
    const scale = this.scale || 1;
    return Math.round(value * scale) / scale;
  }

  /** Strom v zadní řadě lesa: ztmavený a do modrozelena, ať les působí hluboký. */
  private bakedFar(img: HTMLImageElement, deviceH: number): HTMLCanvasElement {
    const h = Math.max(1, Math.round(deviceH));
    const sizes = this.farBakes.get(img) ?? new Map<number, HTMLCanvasElement>();
    const prev = sizes.get(h);
    if (prev) return prev;
    const base = this.baked(img, deviceH);
    const canvas = document.createElement("canvas");
    canvas.width = base.width;
    canvas.height = base.height;
    const g = canvas.getContext("2d");
    if (g) {
      g.drawImage(base, 0, 0);
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = "rgba(38, 72, 58, 0.38)";
      g.fillRect(0, 0, canvas.width, canvas.height);
    }
    sizes.set(h, canvas);
    this.farBakes.set(img, sizes);
    return canvas;
  }

  private baked(img: HTMLImageElement, deviceH: number): HTMLCanvasElement {
    const h = Math.max(1, Math.round(deviceH));
    const sizes = this.bakes.get(img) ?? new Map<number, HTMLCanvasElement>();
    const prev = sizes.get(h);
    if (prev) return prev;
    // Výšky jedné velikosti se při změně zoomu nemnoží donekonečna: stará se zahodí.
    if (sizes.size > 16) sizes.clear();
    const w = Math.max(1, Math.round(h * (img.width / Math.max(1, img.height))));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext("2d");
    if (g) {
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = "high";
      g.drawImage(img, 0, 0, w, h);
    }
    sizes.set(h, canvas);
    this.bakes.set(img, sizes);
    return canvas;
  }

  private pickTale(kind: Kind): string {
    const pool = LINES[kind] ?? ["Dneska vyhrál chodník."];
    let index = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && index === this.lastTale[kind]) index = (index + 1) % pool.length;
    this.lastTale[kind] = index;
    return pool[index] ?? pool[0]!;
  }

  /** The selected player changed (menu): show their record and Chronicle. */
  refreshRecord() {
    this.useRecordOf(currentProfile());
    // Kapitoly jelena patří hráči.
    this.stagMeetings = loadProgress().stagMeetings;
    // Každý hráč má svou kroniku.
    this.scrollsKnown = knownIds().length;
    this.pushHud(true);
  }

  private useRecordOf(player: { best: number; gossips: number } | null) {
    this.best = player?.best ?? 0;
    this.bestGossips = player?.gossips ?? 0;
  }

  private loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { v?: number; best?: number; gossips?: number; mute?: boolean; scrolls?: number };
      if (data.v !== 1) return;
      this.muted = Boolean(data.mute);
      this.scrolls = data.scrolls ?? 0;
    } catch {
      /* ignore broken saves */
    }
  }

  private save() {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({ v: 1, best: this.best, gossips: this.bestGossips, mute: this.muted, scrolls: this.scrolls }),
      );
    } catch {
      /* private mode */
    }
  }
}

type ColorKey = "skyTop" | "skyBot" | "hillFar" | "hill" | "grass" | "grassDark" | "path" | "pathDark";

function frameOf(sheet: Art[string] | undefined, index: number): HTMLImageElement | null {
  if (!Array.isArray(sheet) || sheet.length === 0) return null;
  const i = ((index % sheet.length) + sheet.length) % sheet.length;
  return sheet[i] ?? null;
}

function box(cx: number, feet: number, w: number, h: number) {
  const iw = w * 0.82;
  const ih = h * 0.86;
  return { l: cx - iw / 2, r: cx + iw / 2, t: feet - ih, b: feet - 2 };
}

function overlap(a: { l: number; r: number; t: number; b: number }, b: { l: number; r: number; t: number; b: number }) {
  return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, life: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(life * 5);
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 4;
    const rad = i % 2 === 0 ? r : r * 0.38;
    const px = Math.cos(angle) * rad;
    const py = Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#e4577a";
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s, -s * 0.25, -s * 0.35, -s, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.35, -s, s, -s * 0.25, 0, s * 0.35);
  ctx.fill();
  ctx.restore();
}

