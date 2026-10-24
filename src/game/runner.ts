import { Sfx } from "@/game/audio";
import { reportPlayer, submitScore } from "@/game/plays";
import { publicUrl } from "@/lib/public-url";
import {
  BIOME_LEN,
  BIOMES,
  FACTS,
  biomeMix,
  lerpRgb,
  rgbCss,
  type PlaceId,
  type RGB,
} from "@/game/content";

export type Phase = "loading" | "splash" | "menu" | "play" | "pause" | "over";

export type Hud = {
  phase: Phase;
  score: number;
  best: number;
  bestGossips: number;
  gossips: number;
  combo: number;
  lives: number;
  biome: string;
  fact: { title: string; text: string } | null;
  pips: number;
  newBest: boolean;
  muted: boolean;
  coach: boolean;
  line: string;
  showTale: boolean;
  taleTag: string;
  ready: boolean;
  progress: number;
};

type Kind =
  | "fence"
  | "pot"
  | "dog"
  | "gardener"
  | "car"
  | "branch"
  | "gossip"
  | "heart"
  | "bush"
  | "lamp"
  | "tree"
  | "bench"
  | "houses"
  | "castle"
  | "greenhouse"
  | "pond"
  | "column"
  | "church"
  | "school"
  | "info";

type Ent = { kind: Kind; x: number; lift: number; anim: number; alive: boolean };

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
};

type Pop = { x: number; y: number; text: string; life: number };

type Art = Record<string, HTMLImageElement | HTMLImageElement[] | null>;

const SAVE_KEY = "drbena-kopidlno-v1";

const HAZARDS = new Set<Kind>(["fence", "pot", "dog", "gardener", "car", "branch"]);
const PICKUPS = new Set<Kind>(["gossip", "heart"]);
const LANDMARKS = new Set<Kind>(["houses", "castle", "greenhouse", "pond"]);
const DECOR = new Set<Kind>(["bush", "lamp", "tree", "bench", "column", "church", "school", "info"]);

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
};

const SPEC: Record<Kind, { h: number; hitW: number; hitH: number; lift: number }> = {
  fence: { h: 0.62, hitW: 0.62, hitH: 0.78, lift: 0 },
  pot: { h: 0.5, hitW: 0.72, hitH: 0.62, lift: 0 },
  dog: { h: 0.66, hitW: 0.48, hitH: 0.7, lift: 0 },
  gardener: { h: 1.08, hitW: 0.36, hitH: 0.76, lift: 0 },
  car: { h: 0.78, hitW: 0.62, hitH: 0.55, lift: 0 },
  branch: { h: 1.02, hitW: 0.84, hitH: 0.52, lift: 0 },
  gossip: { h: 0.42, hitW: 0.62, hitH: 0.62, lift: 0.14 },
  heart: { h: 0.32, hitW: 0.7, hitH: 0.7, lift: 0.72 },
  bush: { h: 0.46, hitW: 0, hitH: 0, lift: 0 },
  lamp: { h: 1.42, hitW: 0, hitH: 0, lift: 0 },
  tree: { h: 1.85, hitW: 0, hitH: 0, lift: 0 },
  bench: { h: 0.5, hitW: 0, hitH: 0, lift: 0 },
  houses: { h: 1.55, hitW: 0, hitH: 0, lift: 0 },
  castle: { h: 2.35, hitW: 0, hitH: 0, lift: 0 },
  greenhouse: { h: 2.15, hitW: 0, hitH: 0, lift: 0 },
  pond: { h: 1.85, hitW: 0, hitH: 0, lift: 0.02 },
  column: { h: 1.7, hitW: 0, hitH: 0, lift: 0 },
  church: { h: 2.2, hitW: 0, hitH: 0, lift: 0 },
  school: { h: 1.45, hitW: 0, hitH: 0, lift: 0 },
  info: { h: 0.78, hitW: 0, hitH: 0, lift: 0 },
};

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const ART_REV = "14";

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
    biome: "Náměstí",
    fact: null,
    pips: 0,
    newBest: false,
    muted: false,
    coach: true,
    line: "",
    showTale: false,
    taleTag: "Příhoda",
    ready: false,
    progress: 0,
  };
}

export class Runner {
  private ctx: CanvasRenderingContext2D | null;
  private sfx = new Sfx();
  private art: Art = {};
  private raf = 0;
  private alive = true;
  private last = 0;
  private acc = 0;
  private emitAcc = 0;
  private viewW = 800;
  private viewH = 450;
  private scale = 1;
  private cssW = 800;
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
  private gossips = 0;
  private gossipScore = 0;
  private combo = 0;
  private lastCollect = -10;
  private fact: { title: string; text: string } | null = null;
  private factLife = 0;
  private factIndex = 0;
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
  }));
  private hazardCursor = 400;
  private decorCursor = 0;
  private nextChunk = 0;
  private lastHazard: Kind | null = null;
  private hitKind: Kind | null = null;
  private loaded = 0;
  private loadTotal = 1;
  private ready = false;
  private fish = 0;
  private fishX = 0;
  private lastFish = -1;
  private fishTold = -1;
  private taleTag = "Příhoda";
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
  private playerX = 160;

  constructor(
    private canvas: HTMLCanvasElement,
    private onHud: (hud: Hud) => void,
  ) {
    this.ctx = canvas.getContext("2d");
    this.loadSave();
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
    if (this.phase === "play") this.phase = "pause";
    else if (this.phase === "pause") this.phase = "play";
    this.pushHud(true);
  }

  begin() {
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
    this.gossips = 0;
    this.gossipScore = 0;
    this.combo = 0;
    this.lastCollect = -10;
    this.fact = null;
    this.factLife = 0;
    this.ents = [];
    this.pops = [];
    this.hazardCursor = this.viewW * 0.92;
    this.decorCursor = -20;
    this.nextChunk = 0;
    this.lastHazard = null;
    this.hitKind = null;
    this.tale = "";
    this.taleLife = 0;
    this.talk = 0;
    this.newBest = false;
    this.coachJump = false;
    this.coachDuck = false;
    this.lastFish = -1;
    this.fish = 0;
    this.fillWorld();
    this.pushHud(true);
    reportPlayer();
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
      "houses",
      "castle",
      "greenhouse",
      "pond",
      "column",
      "church",
      "school",
      "info",
      "dog",
      "gossip",
      "fish",
    ] as const;
    const frames = ["jump", "duck", "run", "idle"] as const;
    this.loaded = 0;
    this.loadTotal = names.length + frames.length * 4;
    this.ready = false;
    const rest = Promise.all([
      this.loadFramesCounted("jump"),
      this.loadFramesCounted("duck"),
      ...names.map((name) => this.loadCounted(publicUrl(`/game/${name}.webp`))),
    ]).then((loaded) => {
      if (!this.alive) return;
      const [jump, duck, ...singles] = loaded;
      this.art.jump = jump;
      this.art.duck = duck;
      names.forEach((name, i) => {
        this.art[name] = singles[i] ?? null;
      });
    });
    const hero = Promise.all([this.loadFramesCounted("run"), this.loadFramesCounted("idle")]).then(([run, idle]) => {
      if (!this.alive) return;
      this.art.run = run;
      this.art.idle = idle;
    });
    if (!this.alive) return;
    this.openMenu();
    await Promise.all([hero, rest]);
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
    const code = event.code;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) event.preventDefault();
    this.unlock();
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
    this.cssW = cssW;
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    this.viewW = cssW < 560 ? 530 : cssW < 980 ? 760 : 1000;
    this.scale = (cssW * dpr) / this.viewW;
    this.viewH = (cssH * dpr) / this.scale;
    const barCss = cssW < 860 ? 118 : 36;
    const bar = barCss * (this.viewW / Math.max(1, cssW));
    this.groundY = this.viewH - bar - 8;
    this.u = Math.min(156, Math.max(112, this.viewW * 0.25));
    this.playerX = this.viewW * 0.24;
    const jumpH = this.u * 1.35;
    const air = 0.92;
    this.jumpSpeed = (4 * jumpH) / air;
    this.gravity = (8 * jumpH) / (air * air);
    if (this.onGround) this.feet = this.groundY;
    const pace = this.viewW < 600 ? 1.18 : 1;
    this.speed0 = 255 * (this.viewW / 740) * pace;
    this.speedMax = 500 * (this.viewW / 740) * pace;
  }

  private speed0 = 250;
  private speedMax = 480;

  private loop(now: number) {
    if (!this.alive) return;
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
    const mode = this.phase === "menu" ? "intro" : this.phase === "play" ? "loop" : "off";
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
    this.raf = requestAnimationFrame(this.loop);
  }

  private currentSpeed(): number {
    if (this.phase === "menu") return this.speed0 * 0.62;
    const ramp = Math.min(1, this.run / (BIOME_LEN * 3.1));
    return this.speed0 + (this.speedMax - this.speed0) * ramp;
  }

  private step(dt: number) {
    this.time += dt;
    this.pollPad();
    if (this.phase === "loading" || this.phase === "splash") return;
    if (this.phase === "pause") {
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

    if (this.taleLife > 0 && this.fish <= 0) {
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

    const speed = this.currentSpeed();
    this.speed = speed;
    this.camera += speed * dt;
    if (this.phase === "play") this.run += speed * dt;

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
      if (this.factLife <= 0) this.fact = null;
    }
  }

  private simPlayer(dt: number) {
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
    for (const ent of this.ents) {
      if (!ent.alive) continue;
      const box = this.entBox(ent);
      if (!box) continue;
      if (!overlap(player, box)) continue;
      if (PICKUPS.has(ent.kind)) {
        ent.alive = false;
        if (ent.kind === "gossip") this.grabGossip(ent);
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
    if (this.gossips > 0 && this.gossips % 10 === 0) {
      const here = this.placeAt(this.camera + this.playerX).id;
      const pool = FACTS.filter((item) => item.place === here);
      const fact = pool[this.factIndex % pool.length]!;
      this.factIndex += 1;
      this.fact = fact;
      this.factLife = 6.2;
      this.sfx.fact();
      this.pushHud(true);
    }
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
    this.taleTag = "Příhoda";
    this.taleLife = 2.6;
    this.talk = 0.9;
    this.sfx.hurt();
    this.burst(this.playerX, this.feet - this.u * 0.4, "#e8a317", 8);
    if (this.lives <= 0) {
      this.phase = "over";
      this.talk = 0;
      this.lock = 0.45;
      const score = this.score();
      this.newBest = score > this.best;
      if (score > this.best) this.best = score;
      if (this.gossips > this.bestGossips) this.bestGossips = this.gossips;
      this.save();
      submitScore(score, this.gossips);
    }
    this.pushHud(true);
  }

  private fillWorld() {
    let guard = 0;
    while (this.decorCursor < this.camera + this.viewW + 50 && guard++ < 12) {
      const mix = biomeMix(this.decorCursor);
      const town = mix.biome.id === "namesti";
      const bag: Kind[] = town
        ? ["lamp", "bush", "bench", "tree", "bush"]
        : mix.biome.id === "park"
          ? ["tree", "bush", "bench", "tree", "bush"]
          : ["tree", "bush", "lamp", "bush", "bench"];
      let kind = bag[Math.floor(Math.random() * bag.length)]!;
      if (kind === "tree" && (this.facingBuilding(this.decorCursor) || this.nearPondMiddle(this.decorCursor))) {
        this.decorCursor += this.u * (1.5 + Math.random() * 1.2);
        continue;
      }
      this.ents.push({ kind, x: this.decorCursor, lift: 0, anim: 0, alive: true });
      this.decorCursor += this.u * (1.35 + Math.random() * 1.8);
    }
    const seen = Math.floor((this.camera + this.viewW * 0.15) / BIOME_LEN);
    while (this.nextChunk <= seen) {
      const biome = BIOMES[((this.nextChunk % 4) + 4) % 4]!;
      this.ents.push({
        kind: biome.landmark,
        x: this.nextChunk * BIOME_LEN + this.viewW * 0.82,
        lift: 0,
        anim: 0,
        alive: true,
      });
      if (biome.id === "namesti") {
        this.ents.push({
          kind: "info",
          x: this.nextChunk * BIOME_LEN + this.viewW * 0.82 - this.u * 1.42,
          lift: 0,
          anim: 0,
          alive: true,
        });
        this.ents.push({
          kind: "column",
          x: this.nextChunk * BIOME_LEN + this.viewW * 0.82 + this.u * 3.3,
          lift: 0,
          anim: 0,
          alive: true,
        });
        this.ents.push({
          kind: "church",
          x: this.nextChunk * BIOME_LEN + this.viewW * 0.82 + this.u * 7.6,
          lift: 0,
          anim: 0,
          alive: true,
        });
        this.ents.push({
          kind: "school",
          x: this.nextChunk * BIOME_LEN + this.viewW * 0.82 + this.u * 12.2,
          lift: 0,
          anim: 0,
          alive: true,
        });
      }
      this.nextChunk += 1;
    }
    if (this.phase !== "play") return;
    guard = 0;
    while (this.hazardCursor < this.camera + this.viewW + 20 && guard++ < 8) this.spawnWave();
  }

  private nearPondMiddle(x: number) {
    const cycle = BIOME_LEN * 4;
    const base = Math.floor(x / cycle);
    for (let i = base - 1; i <= base + 1; i += 1) {
      const pondX = (i * 4 + 3) * BIOME_LEN + this.viewW * 0.82;
      if (Math.abs(x - pondX) < this.u * 2.6) return true;
    }
    return false;
  }

  private pondGapEnd(x: number): number | null {
    const cycle = BIOME_LEN * 4;
    const base = Math.floor(x / cycle);
    for (let i = base - 1; i <= base + 1; i += 1) {
      const pondX = (i * 4 + 3) * BIOME_LEN + this.viewW * 0.82;
      const from = pondX + this.u * 0.2;
      const to = pondX + this.u * 8;
      if (x >= from && x < to) return to;
    }
    return null;
  }

  private facingBuilding(x: number) {
    const u = this.u;
    const cycle = BIOME_LEN * 4;
    const n0 = Math.floor(x / cycle) - 1;
    for (let n = n0; n <= n0 + 2; n += 1) {
      const square = n * cycle + this.viewW * 0.82;
      const spots: [number, number][] = [
        [square - u * 1.42, 1.15],
        [square, 1.7],
        [square + u * 3.3, 1.35],
        [square + u * 7.6, 1.55],
        [square + u * 12.2, 1.7],
        [n * cycle + BIOME_LEN + this.viewW * 0.82, 2.3],
        [n * cycle + BIOME_LEN * 2 + this.viewW * 0.82, 3.15],
      ];
      if (spots.some(([center, reach]) => Math.abs(x - center) < u * reach)) return true;
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
    if (this.run < 260) {
      for (let i = 0; i < 4; i += 1) {
        this.ents.push({ kind: "gossip", x: x + i * u * 0.4, lift: 0.16, anim: i, alive: true });
      }
      this.hazardCursor += 4 * u * 0.4 + speed * 0.62;
      return;
    }
    const roll = Math.random();
    if (roll < 0.22) {
      const n = 3 + (Math.random() < 0.45 ? 2 : 0);
      const lift = Math.random() < 0.5 ? 0.92 : 0.14;
      for (let i = 0; i < n; i += 1) {
        this.ents.push({ kind: "gossip", x: x + i * u * 0.4, lift, anim: i, alive: true });
      }
      this.hazardCursor += n * u * 0.4 + speed * 0.5;
      return;
    }
    if (roll < 0.28 && this.lives < 3 && this.run > 500) {
      this.ents.push({ kind: "heart", x, lift: 0.72, anim: 0, alive: true });
      this.hazardCursor += speed * 0.8;
      return;
    }
    const kind = this.rollHazard();
    this.ents.push({ kind, x, lift: 0, anim: Math.random() * 6, alive: true });
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
    this.hazardCursor += bulk + speed * 1.08;
    this.lastHazard = kind;
  }

  private rollHazard(): Kind {
    const mid = this.run > 700;
    const hard = this.run > 2100;
    const bag: Kind[] = ["fence", "pot", "dog", "fence", "pot"];
    if (mid) bag.push("dog", "gardener", "branch", "fence");
    if (hard) bag.push("car", "gardener", "branch", "car");
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
      bit.vy += 500 * dt;
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
      left -= 1;
    }
  }

  private pollPad() {
    const pad = navigator.getGamepads?.()?.[0];
    if (!pad) {
      this.padJump = false;
      this.padDuck = false;
      return;
    }
    const jump = Boolean(pad.buttons[0]?.pressed || pad.buttons[12]?.pressed || (pad.axes[1] ?? 0) < -0.65);
    const duck = Boolean(pad.buttons[1]?.pressed || pad.buttons[13]?.pressed || (pad.axes[1] ?? 0) > 0.65);
    if (jump && !this.prevPadJump) this.jumpEdge = true;
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
    ctx.setTransform(this.scale, 0, 0, this.scale, ox * this.scale, oy * this.scale);
    ctx.clearRect(-20, -20, this.viewW + 40, this.viewH + 40);

    const sky = ctx.createLinearGradient(0, 0, 0, Math.max(this.groundY, 10));
    sky.addColorStop(0, col("skyTop"));
    sky.addColorStop(1, col("skyBot"));
    ctx.fillStyle = sky;
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

    for (const ent of this.ents) {
      if (ent.alive && LANDMARKS.has(ent.kind)) this.drawEnt(ctx, ent);
    }
    for (const ent of this.ents) {
      if (ent.alive && DECOR.has(ent.kind)) this.drawEnt(ctx, ent);
    }

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
      if (!ent.alive || LANDMARKS.has(ent.kind) || DECOR.has(ent.kind)) continue;
      this.drawEnt(ctx, ent);
    }

    this.drawFish(ctx);
    this.drawPlayer(ctx);
    for (const bit of this.bits) {
      if (!bit.on) continue;
      ctx.globalAlpha = Math.max(0, bit.life / bit.max);
      ctx.fillStyle = bit.color;
      ctx.beginPath();
      ctx.arc(bit.x, bit.y, bit.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.font = `800 ${Math.round(this.u * 0.16)}px Nunito, sans-serif`;
    ctx.textAlign = "center";
    for (const pop of this.pops) {
      ctx.globalAlpha = Math.max(0, pop.life / 0.7);
      ctx.fillStyle = "#241c16";
      ctx.fillText(pop.text, pop.x, pop.y - (0.7 - pop.life) * 28);
    }
    ctx.globalAlpha = 1;
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
    for (let wx = start; wx < this.camera + this.viewW; wx += step) {
      const n = hash(wx);
      if (n < 0.55) continue;
      const x = wx - this.camera;
      const y = this.groundY - 4;
      ctx.fillStyle = n > 0.82 ? "#e4577a" : n > 0.7 ? "#e8a317" : "#fff6e8";
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawEnt(ctx: CanvasRenderingContext2D, ent: Ent) {
    const spec = SPEC[ent.kind];
    const pulse = ent.kind === "gossip" ? 1 + Math.sin(this.time * 5 + ent.anim) * 0.06 : 1;
    const h = spec.h * this.u * pulse;
    let bob = ent.kind === "gossip" ? Math.sin(this.time * 4 + ent.anim) * this.u * 0.04 : 0;
    let rot = 0;
    if (ent.kind === "dog") {
      bob = Math.abs(Math.sin(this.time * 11 + ent.anim)) * this.u * 0.04;
      rot = Math.sin(this.time * 11 + ent.anim) * 0.07;
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
    if (rot) {
      ctx.save();
      ctx.translate(cx, feet - h * 0.55);
      ctx.rotate(rot);
      ctx.drawImage(img, -w / 2, -h * 0.45, w, h);
      ctx.restore();
      return;
    }
    ctx.drawImage(img, cx - w / 2, feet - h, w, h);
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
    ctx.drawImage(img, this.playerX - w / 2, this.feet - h, w, h);
  }

  private placeAt(x: number): { id: PlaceId; name: string } {
    const u = this.u;
    const cycle = BIOME_LEN * 4;
    const n = Math.floor(x / cycle);
    const origin = n * cycle;
    const square = origin + this.viewW * 0.82;
    const church = square + u * 7.6;
    const school = square + u * 12.2;
    const castle = origin + BIOME_LEN + this.viewW * 0.82;
    const glass = origin + BIOME_LEN * 2 + this.viewW * 0.82;
    const pond = origin + BIOME_LEN * 3 + this.viewW * 0.82;
    const nextSquare = origin + cycle + this.viewW * 0.82;
    if (x < (church + school) / 2) return { id: "namesti", name: "Náměstí" };
    if (x < (school + castle) / 2) return { id: "skola", name: "Stará škola" };
    if (x < (castle + glass) / 2) return { id: "zamek", name: "Zámek" };
    if (x < (glass + pond) / 2) return { id: "sklenik", name: "Palmový skleník" };
    if (x < (pond + nextSquare) / 2) return { id: "park", name: "Zámecký park" };
    return { id: "namesti", name: "Náměstí" };
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
      biome: this.placeAt(this.camera + this.playerX).name,
      fact: this.fact,
      pips: this.gossips % 10,
      newBest: this.newBest,
      muted: this.muted,
      coach: this.phase === "play" && !this.taleLife && (!this.coachJump || !this.coachDuck) && this.run < 1400,
      line: this.tale,
      showTale: this.taleLife > 0 && this.phase === "play",
      taleTag: this.taleTag,
      ready: this.ready,
      progress: Math.min(1, this.loaded / this.loadTotal),
    });
  }

  private maybeFish() {
    if (this.talk > 0 || this.fish > 0) return;
    const here = this.camera + this.playerX;
    for (const ent of this.ents) {
      if (ent.kind !== "pond" || !ent.alive) continue;
      const id = Math.floor(ent.x / BIOME_LEN);
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
    let index = Math.floor(Math.random() * FISH.length);
    if (FISH.length > 1 && index === this.fishTold) index = (index + 1) % FISH.length;
    this.fishTold = index;
    this.fishX = x;
    this.fish = 5.2;
    this.talk = 5.2;
    this.tale = FISH[index] ?? FISH[0]!;
    this.taleTag = "Ryba z rybníka";
    this.taleLife = 5.2;
    this.vy = 0;
    this.onGround = true;
    this.feet = this.groundY;
    for (const ent of this.ents) {
      if (ent.kind === "tree" && Math.abs(ent.x - (x - this.u * 1.15)) < this.u * 2.6) ent.alive = false;
      if (!HAZARDS.has(ent.kind) || !ent.alive) continue;
      if (ent.x > x - this.u * 2.2 && ent.x < x + this.u * 7) ent.alive = false;
    }
    this.sfx.fact();
    this.pushHud(true);
  }

  private drawFish(ctx: CanvasRenderingContext2D) {
    if (this.fish <= 0) return;
    const img = this.art.fish;
    if (!(img instanceof HTMLImageElement)) return;
    const duration = 5.2;
    const t = 1 - this.fish / duration;
    const peek = t < 0.16 ? t / 0.16 : t > 0.84 ? (1 - t) / 0.16 : 1;
    const water = this.groundY - this.u * 0.58;
    const x = this.fishX - this.camera;
    const fh = this.u * 1.05;
    const fw = fh * (img.width / img.height);
    const bob = Math.sin(this.time * 5) * this.u * 0.03;
    const top = water - peek * fh * 0.76 + bob;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-30, -30, this.viewW + 60, water + 8);
    ctx.clip();
    ctx.drawImage(img, x - fw / 2, top, fw, fh);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, water, fw * (0.28 + peek * 0.08), this.u * 0.045, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private pickTale(kind: Kind): string {
    const pool = LINES[kind] ?? ["Dneska vyhrál chodník."];
    let index = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && index === this.lastTale[kind]) index = (index + 1) % pool.length;
    this.lastTale[kind] = index;
    return pool[index] ?? pool[0]!;
  }

  private loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { v?: number; best?: number; gossips?: number; mute?: boolean };
      if (data.v !== 1) return;
      this.best = data.best ?? 0;
      this.bestGossips = data.gossips ?? 0;
      this.muted = Boolean(data.mute);
    } catch {
      /* ignore broken saves */
    }
  }

  private save() {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({ v: 1, best: this.best, gossips: this.bestGossips, mute: this.muted }),
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

