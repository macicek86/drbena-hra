import { knownIds, pageIds, rememberFact } from "@/game/chronicle";
import { Sfx } from "@/game/audio";
import { STAG_STORIES, stagStoryFor, type StagStory } from "@/game/stag-stories";
import { bonusAct as actBonus, bonusHud, BONUS_PARDON_TALE, createOfferedMini, fishOffersMini, healFromBonus, type AnyBonus, type BonusAction, type BonusHud } from "@/game/minigames";
import { tickAlarm, type AlarmEvent } from "./goatAlarm.ts";
import { reportPlayer, submitScore } from "@/game/plays";
import { currentProfile, ensureProfile, recordGame } from "@/game/profiles";
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

export type Phase = "loading" | "splash" | "menu" | "play" | "pause" | "fish-intro" | "bonus" | "dialogue" | "over";

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
};

type Kind =
  | "fence"
  | "pot"
  | "dog"
  | "gardener"
  | "car"
  | "branch"
  | "cyclist"
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
  | "sign-kopidlno";

type Ent = { kind: Kind; x: number; lift: number; anim: number; alive: boolean; fly?: number; sway?: number; face?: number; wait?: number };

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

const HAZARDS = new Set<Kind>(["fence", "pot", "dog", "gardener", "car", "branch", "cyclist"]);
const PICKUPS = new Set<Kind>(["gossip", "heart", "scroll", "firefly"]);
const LANDMARKS = new Set<Kind>(["houses", "castle", "greenhouse", "pond", "mlynec-cross", "mlynec-house", "mlynec-bell", "mlynec-school", "mlynec-pond", "ledkov-a", "ledkov-b", "drahoraz-church", "drahoraz-tower", "apple-0", "apple-1", "apple-2", "linden", "pseves-heart", "obora", "stag"]);
// Cedule na začátku obcí: jen kulisa, nikdy překážka (src/game/runner.ts, approachAfter).
const SIGNS = ["sign-mlynec", "sign-ledkov", "sign-drahoraz", "sign-kopidlno"] as const;
const PLACES = new Set<Kind>([...SIGNS, "houses", "castle", "greenhouse", "pond", "mlynec-cross", "mlynec-house", "mlynec-bell", "mlynec-school", "mlynec-pond", "ledkov-a", "ledkov-b", "drahoraz-church", "drahoraz-tower", "apple-0", "apple-1", "apple-2", "linden", "pseves-heart", "column", "church", "school", "info"]);
const MLYNEC = new Set<Kind>(["mlynec-cross", "mlynec-house", "mlynec-bell", "mlynec-school", "mlynec-pond"]);
const LEDKOV = new Set<Kind>(["ledkov-a", "ledkov-b"]);
const DRAHORAZ = new Set<Kind>(["drahoraz-church", "drahoraz-tower", "apple-0", "apple-1", "apple-2"]);
const PSEVES = new Set<Kind>(["linden", "pseves-heart"]);
const VILLAGES = new Set<Kind>([...MLYNEC, ...LEDKOV, ...DRAHORAZ, ...PSEVES]);
const PROPS = new Set<Kind>(["bush", "lamp", "tree", "bench", "pigeon", "bin"]);
const DECOR = new Set<Kind>(["bush", "lamp", "tree", "bench", "pigeon", "bin", "column", "church", "school", "info", ...SIGNS]);

// Nejdřív se ryba celá vynoří; až pak otevřít dialog či nabídku minihry.
const FISH_RISE_SECONDS = 0.85;

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
  gossip: { h: 0.42, hitW: 0.62, hitH: 0.62, lift: 0.14 },
  heart: { h: 0.32, hitW: 0.7, hitH: 0.7, lift: 0.72 },
  scroll: { h: 0.5, hitW: 0.55, hitH: 0.62, lift: 0.48 },
  bush: { h: 0.46, hitW: 0, hitH: 0, lift: 0 },
  lamp: { h: 1.42, hitW: 0, hitH: 0, lift: 0 },
  tree: { h: 1.85, hitW: 0, hitH: 0, lift: 0 },
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
  // Rybník Zrcadlo v Mlýnci: jen kulisa (ryba vyskakuje jen z kopidlenského rybníka, kind "pond").
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
  "sign-kopidlno": { h: 1.05, hitW: 0, hitH: 0, lift: 0 },
};

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const ART_REV = "33";

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
  };
}

export class Runner {
  private ctx: CanvasRenderingContext2D | null;
  private sfx = new Sfx();
  private art: Art = {};
  private bakes = new WeakMap<HTMLImageElement, { h: number; canvas: HTMLCanvasElement }>();
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
    if (this.phase === "bonus" || this.phase === "dialogue" || this.phase === "fish-intro") return;
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
      this.save();
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
      "pseves-heart",
      "column",
      "church",
      "school",
      "info",
      "dog",
      "cyclist",
      ...SIGNS,
      "gossip",
      "scroll",
      "fish",
    ] as const;
    const frames = ["jump", "duck", "run", "idle"] as const;
    this.loaded = 0;
    this.loadTotal = names.length + frames.length * 4 + 13;
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
    ]).then(([run, idle, stagRun, stagIdle]) => {
      if (!this.alive) return;
      this.art.run = run;
      this.art.idle = idle;
      this.art.stagRun = stagRun;
      this.art.stagIdle = stagIdle;
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

  private loadFramesCounted(name: string) {
    return Promise.all([0, 1, 2, 3].map((i) => this.loadCounted(publicUrl(`/game/${name}/${i}.webp`)))).then((frames) =>
      frames.filter((frame): frame is HTMLImageElement => frame !== null),
    );
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
    const barCss = cssW < 860 ? 118 : 36;
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
      const mode = this.phase === "menu" ? "intro" : this.phase === "play" || this.phase === "dialogue" || this.phase === "fish-intro" ? "loop" : "off";
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
        this.ctx = this.canvas.getContext("2d");
      }
    } finally {
      if (this.alive) this.raf = requestAnimationFrame(this.loop);
    }
  }

  private currentSpeed(): number {
    if (this.phase === "menu") return this.speed0 * 0.62;
    const loop = CYCLE_LEN;
    const first = Math.min(1, this.run / loop);
    const base = this.speed0 + (this.speedMax - this.speed0) * first;
    const later = Math.min(1, Math.max(0, this.run - loop) / (loop * 2));
    return base * (1 + 0.15 * later) * this.oboraPace() * this.stagWonder();
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
    if (this.phase === "pause" || this.phase === "bonus" || this.phase === "dialogue") {
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

    const speed = this.phase === "play" && this.stagHolds() ? 0 : this.currentSpeed();
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

  private stagHolds(): boolean {
    for (const ent of this.ents) {
      if (ent.alive && ent.kind === "stag" && (ent.face ?? 0) === 1 && (ent.sway ?? 0) === 2) return true;
    }
    return false;
  }

  private simPlayer(dt: number) {
    if (this.stagHolds()) {
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

    const wantJump = this.jumpBuffer > 0 && !ducking && (this.onGround || this.coyote > 0);
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
    this.invuln = 1.35;
    this.shake = 0.35;
    this.flash = 0;
    this.vy = -this.jumpSpeed * 0.22;
    this.onGround = false;
    this.hitKind = ent.kind;
    this.tale = this.pickTale(ent.kind);
    this.taleTag = "Příhoda Drběny";
    this.taleTitle = TALE_TITLES[ent.kind] ?? "Drběnina příhoda";
    this.taleLife = 3.0;
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

  /** Cyklista jede koze naproti, jakmile vjede na obrazovku (a jen během běhu). */
  private rideCyclists(dt: number) {
    if (this.phase !== "play") return;
    // Pomalu (šestina rychlosti kozy): hráč má na reakci skoro stejně času jako u stojící překážky.
    const pace = Math.max(this.speed, this.speed0) * 0.16;
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "cyclist") continue;
      if (ent.x - this.camera < this.viewW * 0.98) ent.x -= pace * dt;
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
    // První obora na druhém okruhu je vždy přístupná.
    // Ostatní se dále střídají s rybníkem, aby hra neztratila pestrost.
    if (chunk === 7) return true;
    if (chunk < 7 || chunk % 4 !== 3) return false;
    const n = Math.sin(chunk * 127.1) * 43758.5453;
    return n - Math.floor(n) < 0.5;
  }

  private oboraLayout(chunk: number) {
    const u = this.u;
    const aspects = [2146 / 632, 2172 / 632, 2140 / 632];
    const glassRight = stageStart(chunk - 1) + this.viewW * 0.82 + this.visualHalf("greenhouse") + u * 1.05;
    const infoLeft = stageStart(chunk + 1) + this.viewW * 0.82 - u * 1.42 - this.visualHalf("info") - u * 0.55;
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
      face: this.forceMeet || this.stagMeetings < STAG_STORIES.length ? 1 : hash(chunk + 19) < 0.5 ? 1 : 0,
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
      const bag: Kind[] = town
        ? ["lamp", "bush", "bench", "bin", "tree", "bush", "pigeon"]
        : mix.biome.id === "park"
          ? ["tree", "bush", "bench", "tree", "bush", "pigeon"]
          : ["tree", "bush", "lamp", "bush", "bench", "bin", "pigeon"];
      let kind = bag[Math.floor(Math.random() * bag.length)]!;
      if (kind !== "bin" && PROPS.has(kind) && this.onPlaceFace(this.decorCursor, kind)) {
        this.decorCursor += this.u * (1.5 + Math.random() * 1.2);
        continue;
      }
      if (kind === "bin" && this.approaches.some((row) => this.decorCursor >= row.from && this.decorCursor < row.village)) {
        this.decorCursor += this.u * (1.5 + Math.random() * 1.2);
        continue;
      }
      if (this.ents.some((ent) => ent.alive && VILLAGES.has(ent.kind) && Math.abs(ent.x - this.decorCursor) < this.visualHalf(ent.kind) + this.visualHalf(kind) + this.u * 0.35)) {
        this.decorCursor += this.u * (1.5 + Math.random() * 1.2);
        continue;
      }
      this.ents.push({ kind, x: this.decorCursor, lift: 0, anim: 0, alive: true });
      this.decorCursor += this.u * (1.35 + Math.random() * 1.8);
    }
    const horizon = this.camera + this.visualHalf("pond") + this.viewW * 0.22 + this.u;
    while (stageStart(this.nextChunk) <= horizon || (this.isOboraChunk(this.nextChunk) && this.oboraLayout(this.nextChunk).start <= this.camera + this.viewW + this.u * 1.6)) {
      const biome = BIOMES[((this.nextChunk % 4) + 4) % 4]!;
      if (biome.id === "park" && this.isOboraChunk(this.nextChunk)) {
        this.spawnObora(this.nextChunk);
      } else {
        const origin = stageStart(this.nextChunk) + this.viewW * 0.82;
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
          x: stageStart(this.nextChunk) + this.viewW * 0.82 - this.u * 1.42,
          lift: 0,
          anim: 0,
          alive: true,
        });
        this.ents.push({
          kind: "column",
          x: stageStart(this.nextChunk) + this.viewW * 0.82 + this.u * 3.3,
          lift: 0,
          anim: 0,
          alive: true,
        });
        this.ents.push({
          kind: "church",
          x: stageStart(this.nextChunk) + this.viewW * 0.82 + this.u * 7.6,
          lift: 0,
          anim: 0,
          alive: true,
        });
        this.ents.push({
          kind: "school",
          x: stageStart(this.nextChunk) + this.viewW * 0.82 + this.u * 12.2,
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
                              ? 2350 / 440
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
                    ? 900 / 707
                    : kind === "tree"
                      ? 402 / 440
                      : kind === "branch"
                        ? 805 / 416
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

  private drawPondEndTrees(ctx: CanvasRenderingContext2D) {
    const img = this.art.tree;
    if (!(img instanceof HTMLImageElement) || !img.height) return;
    const h = SPEC.tree.h * this.u;
    const tw = h * (img.width / img.height);
    const baked = this.baked(img, h * this.scale);
    const feet = this.groundY;
    for (const ent of this.ents) {
      if (!ent.alive || ent.kind !== "pond") continue;
      const edge = ent.x - this.camera + this.pondHalf();
      if (edge < -this.cullMargin || edge > this.viewW + this.cullMargin) continue;
      const x = edge + tw * 0.08;
      ctx.drawImage(baked, this.snap(x - tw / 2), this.snap(feet - h), tw, h);
    }
  }

  private drawOboraEndTrees(ctx: CanvasRenderingContext2D) {
    const img = this.art.tree;
    if (!(img instanceof HTMLImageElement) || !img.height) return;
    const h = SPEC.tree.h * this.u;
    const tw = h * (img.width / img.height);
    const baked = this.baked(img, h * this.scale);
    const feet = this.groundY;
    for (const span of this.oboraSpans) {
      const edge = span.to - this.camera;
      if (edge < -this.cullMargin || edge > this.viewW + this.cullMargin) continue;
      const x = edge - tw * 0.28;
      ctx.drawImage(baked, this.snap(x - tw / 2), this.snap(feet - h), tw, h);
    }
  }

  private pondGapEnd(x: number): number | null {
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

  private onPlaceFace(x: number, kind: Kind): boolean {
    const reach = this.visualHalf(kind);
    const u = this.u;
    const cycle = CYCLE_LEN;
    const n0 = Math.floor(x / cycle) - 1;
    for (let n = n0; n <= n0 + 2; n += 1) {
      const square = n * cycle + this.viewW * 0.82;
      const spots: [number, Kind][] = [
        [square - u * 1.42, "info"],
        [square, "houses"],
        [square + u * 3.3, "column"],
        [square + u * 7.6, "church"],
        [square + u * 12.2, "school"],
        [stageStart(n * 4 + 1) + this.viewW * 0.82, "castle"],
        [stageStart(n * 4 + 2) + this.viewW * 0.82, "greenhouse"],
        [this.pondX(stageStart(n * 4 + 3)), "pond"],
      ];
      for (const [center, place] of spots) {
        const inner = this.visualHalf(place) * 0.78;
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
    if (run > 280 && x >= this.nextScroll && !this.scrollAhead()) {
      const low = this.scrolls < 2;
      const early = this.scrollsRun < 2;
      const lift = low ? 0.1 + Math.random() * 0.12 : 0.78 + Math.random() * 0.28;
      this.ents.push({ kind: "scroll", x: x + Math.random() * u * 1.15, lift, anim: Math.random() * 6, alive: true });
      this.scrolls += 1;
      this.scrollsRun += 1;
      this.save();
      const gap = early ? 1.7 + Math.random() * 1.8 : 4.5 + Math.random() * 7;
      this.hazardCursor += speed * (0.7 + Math.random() * 0.45);
      this.nextScroll = this.hazardCursor + speed * gap;
      return;
    }
    const roll = Math.random();
    const stage = stageIndex(Math.max(0, x));
    const gossipP = stage >= 2 ? 0.28 : stage === 0 ? 0.24 : 0.22;
    if (roll < gossipP) {
      const n = 3 + (Math.random() < 0.45 ? 2 : 0);
      const lift = stage >= 2 ? (Math.random() < 0.5 ? 0.92 : 0.14) : Math.random() < 0.7 ? 0.14 : 0.92;
      for (let i = 0; i < n; i += 1) {
        this.ents.push({ kind: "gossip", x: x + i * u * 0.4, lift, anim: i, alive: true });
      }
      this.hazardCursor += n * u * 0.4 + speed * (stage === 0 ? 0.7 : 0.55);
      return;
    }
    if (roll < gossipP + 0.06 && this.lives < 3 && run > 500) {
      this.ents.push({ kind: "heart", x, lift: 0.72, anim: 0, alive: true });
      this.hazardCursor += speed * 0.8;
      return;
    }
    const kind = this.rollHazard(x);
    if (kind === "cyclist") {
      // Cyklista jede koze naproti, až když je vidět, a proto startuje o kus dál: z mezery
      // před ním si cestou ujede asi desetinu obrazovky, takže předchozí překážku nedožene.
      const lead = this.viewW * 0.16;
      this.ents.push({ kind, x: x + lead, lift: 0, anim: Math.random() * 6, alive: true });
      this.hazardCursor += lead + u * 1.1 + speed * 1.3;
      this.lastHazard = kind;
      return;
    }
    this.ents.push({ kind, x, lift: 0, anim: Math.random() * 6, alive: true });
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
    const second = stage >= 4 && Math.random() < 0.18 ? (kind === "fence" ? "branch" : kind === "pot" ? "fence" : null) : null;
    if (second) {
      const at = x + bulk + speed * 1.5;
      if (this.pondGapEnd(at) == null) {
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
    const gapT = stage <= 0 ? 1.42 : stage === 1 ? 1.26 : stage === 2 ? 1.14 : stage === 3 ? 1.06 : 0.98;
    this.hazardCursor += bulk + speed * gapT;
    this.lastHazard = kind;
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
    // Na cestách mezi vesnicemi občas přijede naproti cyklista.
    const road = this.approaches.some((gap) => x >= gap.from && x < gap.to);
    if (road && this.lastHazard !== "cyclist" && Math.random() < 0.3) return "cyclist";
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
    return box(cx, feet, w * spec.hitW, h * spec.hitH);
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
    for (const ent of this.ents) {
      if (!ent.alive || !PLACES.has(ent.kind)) continue;
      const sx = ent.x - cam;
      if (sx < -margin || sx > this.viewW + margin) continue;
      this.drawEnt(ctx, ent);
    }
    for (const ent of this.ents) {
      if (!ent.alive || !PROPS.has(ent.kind) || ent.fly) continue;
      const sx = ent.x - cam;
      if (sx < -margin || sx > this.viewW + margin) continue;
      this.drawEnt(ctx, ent);
    }
    this.drawPondEndTrees(ctx);
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
    const baseH = spec.h * this.u;
    const h = baseH * pulse;
    let bob = ent.kind === "gossip" || ent.kind === "scroll" ? Math.sin(this.time * 4 + ent.anim) * this.u * 0.04 : 0;
    let rot = 0;
    let flip = 1;
    if (ent.kind === "dog") {
      bob = Math.abs(Math.sin(this.time * 11 + ent.anim)) * this.u * 0.04;
      rot = Math.sin(this.time * 11 + ent.anim) * 0.07;
    } else if (ent.kind === "pigeon") {
      if (ent.fly) {
        flip = ent.face ?? 1;
        bob = Math.sin(this.time * 28) * this.u * 0.018;
        rot = -0.22 + Math.sin(this.time * 2.2 + ent.anim) * 0.38;
      } else {
        bob = Math.abs(Math.sin(this.time * 5 + ent.anim)) * this.u * 0.012;
      }
    } else if (ent.kind === "cyclist") {
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
    const img = this.spriteFor(ent);
    if (!img) return;
    const w = h * (img.width / img.height);
    const baked = this.baked(img, baseH * this.scale);
    if (rot || flip < 0) {
      ctx.save();
      ctx.translate(this.snap(cx), this.snap(feet - h * 0.55));
      ctx.scale(flip, 1);
      ctx.rotate(rot);
      ctx.drawImage(baked, -w / 2, -h * 0.45, w, h);
      ctx.restore();
      return;
    }
    ctx.drawImage(baked, this.snap(cx - w / 2), this.snap(feet - h), w, h);
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
    } else if (this.fish > 0) {
      sheet = this.art.idle;
      index = Math.floor(this.time * 3) % 4;
    } else if (!this.onGround && this.phase === "play") {
      sheet = this.art.jump;
      if (this.vy < -this.jumpSpeed * 0.25) index = 1;
      else if (this.vy > this.jumpSpeed * 0.12) index = 3;
      else index = 2;
    } else if (this.stagHolds()) {
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
    const square = origin + this.viewW * 0.82;
    const church = square + u * 7.6;
    const school = square + u * 12.2;
    const castle = stageStart(n * 4 + 1) + this.viewW * 0.82;
    const glass = stageStart(n * 4 + 2) + this.viewW * 0.82;
    const pond = this.pondX(stageStart(n * 4 + 3));
    const nextSquare = origin + cycle + this.viewW * 0.82;
    if (x < (church + school) / 2) return { id: "namesti", name: "Náměstí" };
    if (x < (school + castle) / 2) return { id: "skola", name: "Stará škola" };
    if (x < (castle + glass) / 2) return { id: "zamek", name: "Zámek" };
    if (x < (glass + pond) / 2) return { id: "sklenik", name: "Palmový skleník" };
    if (x < (pond + nextSquare) / 2) return { id: "park", name: "Zámecký park" };
    return { id: "namesti", name: "Náměstí" };
  }

  private pondX(chunkStart: number): number {
    return chunkStart + this.viewW * 0.82;
  }

  private nextTown(x: number): number {
    const cycle = CYCLE_LEN;
    const n = Math.floor(x / cycle);
    const here = n * cycle + this.viewW * 0.82;
    const houses = here > x ? here : (n + 1) * cycle + this.viewW * 0.82;
    return houses - this.u * 2.2;
  }

  private rowWidth(parts: { kind: Kind; gap: number }[]): number {
    // Skutečné rozměry načtených spriteů; nepoužívat druhé, ručně opisované poměry stran.
    return parts.reduce((sum, part) => sum + this.visualHalf(part.kind) * 2 + part.gap, 0);
  }

  private plantRow(x: number, parts: { kind: Kind; gap: number }[]) {
    for (const part of parts) {
      const w = this.visualHalf(part.kind) * 2;
      this.ents.push({ kind: part.kind, x: x + w / 2, lift: 0, anim: 0, alive: true });
      x += w + part.gap;
    }
  }

  private plantPause(from: number, to: number, bushes: boolean) {
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
    const count = Math.min(6, Math.max(2, Math.floor(room / (this.u * 3))));
    const step = room / (count + 1);
    for (let i = 1; i <= count; i += 1) {
      const kind: Kind = bushes && i % 2 === 0 ? "bush" : "tree";
      this.ents.push({ kind, x: left + step * i, lift: 0, anim: 0, alive: true });
    }
  }

  private approachAfter(end: number) {
    if (this.approaches.some((row) => Math.abs(row.from - end) < 12)) return;
    const u = this.u;
    const houses = this.nextTown(end + 1) + u * 2.2;
    const limit = houses - u * 1.42 - this.visualHalf("info") - u * 0.35;
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
        { kind: "linden", gap: u * 0.15 },
        { kind: "pseves-heart", gap: 0 },
      ] },
    ];
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
    // Cedule obcí stojí kousek před první stavbou vsi. Pševes zatím ceduli nemá.
    // Kopidlno má ceduli jen při návratu na konci „Cesty do Kopidlna“ (na úplném začátku hry ne).
    // Až přibude budova na začátek Kopidlna, postaví se mezi ceduli a infocentrum (posunout `limit`).
    const signs: (Kind | null)[] = ["sign-mlynec", "sign-ledkov", "sign-drahoraz", null];
    const signGap = u * 0.35;
    signs.forEach((kind, i) => {
      if (!kind) return;
      this.ents.push({ kind, x: starts[i]! - signGap - this.visualHalf(kind), lift: 0, anim: 0, alive: true });
    });
    this.ents.push({ kind: "sign-kopidlno", x: limit - signGap - this.visualHalf("sign-kopidlno"), lift: 0, anim: 0, alive: true });

    // Odstranit předem náhodně vygenerované dekorace; vrátit jen venkovskou zeleň
    // v mezerách. V obcích se nesmí objevit ani překážka překrývající budovu.
    const hazardPad = this.visualHalf("branch") + u * 0.15;
    for (const ent of this.ents) {
      if (!ent.alive || ent.x <= end || ent.x >= limit) continue;
      if (PROPS.has(ent.kind)) ent.alive = false;
      else if (HAZARDS.has(ent.kind) && starts.some((at, i) => ent.x >= at - hazardPad && ent.x <= ends[i]! + hazardPad)) ent.alive = false;
    }
    for (let i = 0; i < groups.length; i += 1) {
      const from = i === 0 ? end : ends[i - 1]!;
      this.plantPause(from, starts[i]!, i === 1);
      this.plantRow(starts[i]!, groups[i]!.parts);
    }
    this.plantPause(ends[ends.length - 1]!, limit, false);
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
      if (here > fishAt - this.u * 1.7 && here < fishAt - this.u * 0.55) {
        this.lastFish = id;
        this.startFish(fishAt);
        return;
      }
    }
  }

  private startFish(x: number) {
    this.fishX = x;
    this.fishAge = 0;
    this.vy = 0;
    this.onGround = true;
    this.feet = this.groundY;
    this.releaseInputs();
    for (const ent of this.ents) {
      if (ent.kind === "tree" && Math.abs(ent.x - (x - this.u * 1.15)) < this.u * 2.6) ent.alive = false;
      if (!HAZARDS.has(ent.kind) || !ent.alive) continue;
      if (ent.x > x - this.u * 9.2 && ent.x < x + this.u * 8) ent.alive = false;
    }
    if (fishOffersMini()) {
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
    this.fishDialogue = FISH[index] ?? FISH[0]!;
    this.fish = 5.2;
    this.talk = 0;
    this.tale = "";
    this.taleTag = "Příhoda";
    this.taleLife = 0;
    this.phase = "fish-intro";
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
    const rise = Math.min(1, this.fishAge / FISH_RISE_SECONDS);
    const heldAboveWater = this.phase === "fish-intro" || this.phase === "bonus" || (this.phase === "dialogue" && this.fishDialogue !== null);
    const peek = heldAboveWater ? rise : t < 0.16 ? t / 0.16 : t > 0.84 ? (1 - t) / 0.16 : 1;
    const water = this.groundY - this.u * 0.58;
    const x = this.fishX - this.camera;
    const fh = this.u * 1.05;
    const fw = fh * (img.width / img.height);
    const bob = Math.sin(this.time * 5) * this.u * 0.03;
    const top = water - peek * fh * 0.76 + bob;
    const baked = this.baked(img, fh * this.scale);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-30, -30, this.viewW + 60, water + 8);
    ctx.clip();
    ctx.drawImage(baked, this.snap(x - fw / 2), this.snap(top), fw, fh);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, water, fw * (0.28 + peek * 0.08), this.u * 0.045, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private snap(value: number) {
    const scale = this.scale || 1;
    return Math.round(value * scale) / scale;
  }

  private baked(img: HTMLImageElement, deviceH: number): HTMLCanvasElement {
    const h = Math.max(1, Math.round(deviceH));
    const prev = this.bakes.get(img);
    if (prev && prev.h === h) return prev.canvas;
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
    this.bakes.set(img, { h, canvas });
    return canvas;
  }

  private pickTale(kind: Kind): string {
    const pool = LINES[kind] ?? ["Dneska vyhrál chodník."];
    let index = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && index === this.lastTale[kind]) index = (index + 1) % pool.length;
    this.lastTale[kind] = index;
    return pool[index] ?? pool[0]!;
  }

  /** The selected player changed (menu): show their record. */
  refreshRecord() {
    this.useRecordOf(currentProfile());
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
      const data = JSON.parse(raw) as { v?: number; best?: number; gossips?: number; mute?: boolean; scrolls?: number; stagMeetings?: number };
      if (data.v !== 1) return;
      this.muted = Boolean(data.mute);
      this.scrolls = data.scrolls ?? 0;
      // Stejná lokální pozice jako skóre; staré uložené hry mají výchozí nulu.
      this.stagMeetings = typeof data.stagMeetings === "number" && Number.isFinite(data.stagMeetings)
        ? Math.max(0, Math.floor(data.stagMeetings))
        : 0;
    } catch {
      /* ignore broken saves */
    }
  }

  private save() {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({ v: 1, best: this.best, gossips: this.bestGossips, mute: this.muted, scrolls: this.scrolls, stagMeetings: this.stagMeetings }),
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

