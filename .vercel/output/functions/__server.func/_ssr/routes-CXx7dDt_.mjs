import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as RotateCcw, c as Heart, i as Share2, n as Volume2, o as Play, s as Pause, t as VolumeX } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CXx7dDt_.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var MELODY = [
	523,
	659,
	784,
	659,
	440,
	523,
	659,
	523,
	587,
	784,
	698,
	523,
	494,
	392,
	440,
	523
];
var Sfx = class {
	ctx = null;
	master = null;
	musicBus = null;
	sfxBus = null;
	nextNote = 0;
	step = 0;
	muted = false;
	unlock() {
		const Ctx = window.AudioContext || window.webkitAudioContext;
		if (!this.ctx) {
			this.ctx = new Ctx({ latencyHint: "interactive" });
			this.master = this.ctx.createGain();
			this.musicBus = this.ctx.createGain();
			this.sfxBus = this.ctx.createGain();
			this.musicBus.gain.value = .16;
			this.sfxBus.gain.value = .85;
			this.musicBus.connect(this.master);
			this.sfxBus.connect(this.master);
			this.master.connect(this.ctx.destination);
			this.master.gain.value = this.muted ? 0 : 1;
		}
		if (this.ctx.state === "suspended") this.ctx.resume();
	}
	setMuted(muted) {
		this.muted = muted;
		if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, .03);
	}
	resume() {
		if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
	}
	tick(running) {
		if (!this.ctx || !this.musicBus || !running) return;
		const beat = 60 / 128 / 2;
		const horizon = this.ctx.currentTime + .25;
		while (this.nextNote < horizon) {
			const freq = MELODY[this.step % MELODY.length];
			if (freq > 0) this.blip(freq, this.nextNote, .16, "triangle", .18, this.musicBus);
			this.step += 1;
			this.nextNote += beat;
		}
	}
	jump() {
		this.sweep(420, 720, .09, "sine", .22);
	}
	land() {
		this.sweep(180, 90, .06, "triangle", .12);
	}
	collect(combo) {
		const base = 620 + Math.min(combo, 8) * 40;
		this.blip(base, void 0, .07, "sine", .2);
		this.blip(base * 1.5, (this.ctx?.currentTime ?? 0) + .05, .09, "sine", .16);
	}
	hurt() {
		this.sweep(240, 70, .22, "sawtooth", .16);
	}
	fact() {
		[
			523,
			659,
			784,
			1046
		].forEach((f, i) => {
			this.blip(f, (this.ctx?.currentTime ?? 0) + i * .07, .12, "triangle", .16);
		});
	}
	blip(freq, when, dur, type, gain, bus) {
		if (!this.ctx || !this.sfxBus) return;
		const t = when ?? this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, t);
		g.gain.setValueAtTime(1e-4, t);
		g.gain.exponentialRampToValueAtTime(gain, t + .015);
		g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
		osc.connect(g);
		g.connect(bus ?? this.sfxBus);
		osc.start(t);
		osc.stop(t + dur + .02);
		osc.onended = () => {
			osc.disconnect();
			g.disconnect();
		};
	}
	sweep(from, to, dur, type, gain) {
		if (!this.ctx || !this.sfxBus) return;
		const t = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(from, t);
		osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
		g.gain.setValueAtTime(1e-4, t);
		g.gain.exponentialRampToValueAtTime(gain, t + .012);
		g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
		osc.connect(g);
		g.connect(this.sfxBus);
		osc.start(t);
		osc.stop(t + dur + .02);
		osc.onended = () => {
			osc.disconnect();
			g.disconnect();
		};
	}
};
var BIOMES = [
	{
		id: "namesti",
		name: "Náměstí",
		skyTop: [
			121,
			199,
			242
		],
		skyBot: [
			246,
			226,
			184
		],
		hillFar: [
			169,
			201,
			138
		],
		hill: [
			122,
			176,
			92
		],
		grass: [
			103,
			168,
			74
		],
		grassDark: [
			78,
			140,
			56
		],
		path: [
			196,
			180,
			150
		],
		pathDark: [
			168,
			152,
			120
		],
		landmark: "houses"
	},
	{
		id: "zamek",
		name: "Zámek",
		skyTop: [
			110,
			180,
			234
		],
		skyBot: [
			217,
			240,
			250
		],
		hillFar: [
			143,
			176,
			122
		],
		hill: [
			96,
			150,
			78
		],
		grass: [
			92,
			154,
			64
		],
		grassDark: [
			63,
			122,
			48
		],
		path: [
			226,
			210,
			174
		],
		pathDark: [
			196,
			176,
			132
		],
		landmark: "castle"
	},
	{
		id: "sklenik",
		name: "Palmový skleník",
		skyTop: [
			103,
			192,
			228
		],
		skyBot: [
			231,
			246,
			201
		],
		hillFar: [
			135,
			181,
			108
		],
		hill: [
			86,
			154,
			72
		],
		grass: [
			98,
			162,
			70
		],
		grassDark: [
			70,
			133,
			52
		],
		path: [
			215,
			196,
			160
		],
		pathDark: [
			176,
			156,
			118
		],
		landmark: "greenhouse"
	},
	{
		id: "park",
		name: "Zámecký park",
		skyTop: [
			126,
			200,
			238
		],
		skyBot: [
			229,
			244,
			212
		],
		hillFar: [
			121,
			168,
			120
		],
		hill: [
			74,
			138,
			82
		],
		grass: [
			79,
			148,
			68
		],
		grassDark: [
			55,
			118,
			52
		],
		path: [
			205,
			184,
			146
		],
		pathDark: [
			168,
			146,
			108
		],
		landmark: "pond"
	}
];
var BIOME_LEN = 2700;
var FACTS = [
	{
		title: "Skleník jako z Vídně",
		text: "Palmový skleník v zámeckém parku stavěli v letech 1893–1894 podle návrhu Josefa Podhajského. Je to zmenšenina slavného skleníku v schönbrunnském parku."
	},
	{
		title: "Palmy do nebe",
		text: "Uprostřed skleníku rostou palmy vysoké kolem deseti metrů. Skleněná kopule i dnes patří k technickým památkám, které se dají navštívit."
	},
	{
		title: "Z tvrze zámek",
		text: "Zámek Kopidlno stojí na místě středověké vodní tvrze. První známý pán, Petr z Kopidlna, je v pramenech k roku 1322."
	},
	{
		title: "Město bez hradeb",
		text: "Městská práva získalo Kopidlno roku 1514. Místo hradeb spoléhalo na bažiny a okolní krajinu."
	},
	{
		title: "Rybník z bažiny",
		text: "Zámecký rybník vznikl v polovině 16. století tam, kde dřív byla bažina. Dnes lemuje cestu z náměstí do parku."
	},
	{
		title: "Anglický park",
		text: "Kolem zámku je přírodně krajinářský park o ploše asi 7,7 hektaru. Dnešní podoba pochází z úprav na konci 19. století."
	},
	{
		title: "Škola v zámku",
		text: "Od roku 1948 sídlí v zámku zahradnická škola. Vzácné dřeviny v parku mají na starosti její studenti a učitelé."
	},
	{
		title: "Stoleté stromy",
		text: "V parku rostou metasekvoje čínská, tisovec dvouřadý nebo dub velkoplodý. Řada stromů pamatuje stejnou dobu jako skleník."
	},
	{
		title: "Odkud je jméno",
		text: "Jméno Kopidlno se tradicí váže k léčivé bylině zvané kopidlo. Jiná pověst ho odvozuje od kopí."
	},
	{
		title: "Kousek od Jičína",
		text: "Město leží asi 13 kilometrů jihozápadně od Jičína a žije v něm zhruba 2 200 lidí. Kousek je to i do Rumcajsova kraje."
	},
	{
		title: "Medvědí dědeček",
		text: "Kopidlno znají i diváci večerníčku Pojďte pane, budeme si hrát. Prý tu bydlel dědeček medvídků."
	},
	{
		title: "Fíkovna a oranžérie",
		text: "V parku kdysi stály i fíkovna a oranžérie. Dnes parku vévodí palmový skleník, kašna a pískovcový sloup."
	},
	{
		title: "Kdo zámek hlídá",
		text: "Zámek je kulturní památkou od roku 1958. Patří Královéhradeckému kraji a park je otevřený na procházku."
	},
	{
		title: "Socha služky",
		text: "V zámeckém parku připomíná místní pověst takzvaná socha služky. Drbů je tu víc než záhonů."
	}
];
function lerpRgb(a, b, t) {
	return [
		Math.round(a[0] + (b[0] - a[0]) * t),
		Math.round(a[1] + (b[1] - a[1]) * t),
		Math.round(a[2] + (b[2] - a[2]) * t)
	];
}
function rgbCss(c) {
	return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
function biomeMix(camera) {
	const f = camera / BIOME_LEN;
	const i = Math.floor(f);
	const frac = f - i;
	const a = BIOMES[(i % 4 + 4) % 4];
	const b = BIOMES[((i + 1) % 4 + 4) % 4];
	const t = frac < .78 ? 0 : (frac - .78) / .22;
	return {
		biome: a,
		tint: b,
		t,
		name: t > .55 ? b.name : a.name
	};
}
var SAVE_KEY = "drbena-kopidlno-v1";
var HAZARDS = /* @__PURE__ */ new Set([
	"fence",
	"pot",
	"dog",
	"gardener",
	"car",
	"branch"
]);
var PICKUPS = /* @__PURE__ */ new Set(["gossip", "heart"]);
var LANDMARKS = /* @__PURE__ */ new Set([
	"houses",
	"castle",
	"greenhouse",
	"pond"
]);
var DECOR = /* @__PURE__ */ new Set([
	"bush",
	"lamp",
	"tree",
	"bench"
]);
var LINES = {
	fence: "Plot tě nepustil dál.",
	pot: "Květináč byl tvrdší, než vypadal.",
	dog: "Pejsek si tě vyhlídl.",
	gardener: "Zahradník měl přednost.",
	car: "Červené auto nepředjelo.",
	branch: "Větev byla níž, než se zdálo."
};
var SPEC = {
	fence: {
		h: .62,
		hitW: .62,
		hitH: .78,
		lift: 0
	},
	pot: {
		h: .5,
		hitW: .5,
		hitH: .74,
		lift: 0
	},
	dog: {
		h: .5,
		hitW: .66,
		hitH: .66,
		lift: 0
	},
	gardener: {
		h: 1.08,
		hitW: .36,
		hitH: .76,
		lift: 0
	},
	car: {
		h: .64,
		hitW: .46,
		hitH: .58,
		lift: 0
	},
	branch: {
		h: .58,
		hitW: .7,
		hitH: .7,
		lift: .4
	},
	gossip: {
		h: .36,
		hitW: .6,
		hitH: .6,
		lift: .14
	},
	heart: {
		h: .32,
		hitW: .7,
		hitH: .7,
		lift: .72
	},
	bush: {
		h: .46,
		hitW: 0,
		hitH: 0,
		lift: 0
	},
	lamp: {
		h: 1.25,
		hitW: 0,
		hitH: 0,
		lift: 0
	},
	tree: {
		h: 1.85,
		hitW: 0,
		hitH: 0,
		lift: 0
	},
	bench: {
		h: .42,
		hitW: 0,
		hitH: 0,
		lift: 0
	},
	houses: {
		h: 1.55,
		hitW: 0,
		hitH: 0,
		lift: 0
	},
	castle: {
		h: 2.35,
		hitW: 0,
		hitH: 0,
		lift: 0
	},
	greenhouse: {
		h: 2.15,
		hitW: 0,
		hitH: 0,
		lift: 0
	},
	pond: {
		h: 1.65,
		hitW: 0,
		hitH: 0,
		lift: .02
	}
};
function hash(n) {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
}
async function loadImage(src) {
	try {
		const img = new Image();
		img.src = src;
		await img.decode();
		return img;
	} catch {
		return null;
	}
}
async function loadFrames(name) {
	return (await Promise.all([
		0,
		1,
		2,
		3
	].map((i) => loadImage(`/game/${name}/${i}.webp`)))).filter((frame) => frame !== null);
}
function emptyHud() {
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
		line: ""
	};
}
var Runner = class {
	canvas;
	onHud;
	ctx;
	sfx = new Sfx();
	art = {};
	raf = 0;
	alive = true;
	last = 0;
	acc = 0;
	emitAcc = 0;
	viewW = 800;
	viewH = 450;
	scale = 1;
	cssW = 800;
	groundY = 400;
	u = 120;
	jumpSpeed = 500;
	gravity = 2e3;
	camera = 0;
	run = 0;
	speed = 220;
	phase = "loading";
	feet = 400;
	vy = 0;
	onGround = true;
	keyJump = false;
	keyDuck = false;
	touchJump = false;
	touchDuck = false;
	jumpEdge = false;
	duckLock = 0;
	coyote = 0;
	jumpBuffer = 0;
	suppress = 0;
	lock = 0;
	anim = 0;
	time = 0;
	invuln = 0;
	shake = 0;
	flash = 0;
	lives = 3;
	gossips = 0;
	gossipScore = 0;
	combo = 0;
	lastCollect = -10;
	fact = null;
	factLife = 0;
	factIndex = 0;
	ents = [];
	pops = [];
	bits = Array.from({ length: 80 }, () => ({
		on: false,
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		life: 0,
		max: 1,
		color: "#fff",
		size: 3
	}));
	hazardCursor = 400;
	decorCursor = 0;
	nextChunk = 0;
	lastHazard = null;
	hitKind = null;
	newBest = false;
	best = 0;
	bestGossips = 0;
	muted = false;
	coachJump = false;
	coachDuck = false;
	dust = 0;
	prevPadJump = false;
	prevStart = false;
	padJump = false;
	padDuck = false;
	playerX = 160;
	constructor(canvas, onHud) {
		this.canvas = canvas;
		this.onHud = onHud;
		this.ctx = canvas.getContext("2d");
		this.loadSave();
	}
	start() {
		this.resize();
		this.bind();
		this.last = performance.now();
		this.loop = this.loop.bind(this);
		this.raf = requestAnimationFrame(this.loop);
		this.bootstrap();
	}
	destroy() {
		this.alive = false;
		cancelAnimationFrame(this.raf);
		window.removeEventListener("keydown", this.onKeyDown);
		window.removeEventListener("keyup", this.onKeyUp);
		window.removeEventListener("blur", this.onBlur);
		document.removeEventListener("visibilitychange", this.onVis);
		this.ro?.disconnect();
	}
	pressJump(down) {
		this.unlock();
		this.touchJump = down;
		if (down) this.jumpEdge = true;
	}
	pressDuck(down) {
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
		this.suppress = .2;
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
		this.hazardCursor = this.viewW * .92;
		this.decorCursor = -20;
		this.nextChunk = 0;
		this.lastHazard = null;
		this.hitKind = null;
		this.newBest = false;
		this.coachJump = false;
		this.coachDuck = false;
		this.fillWorld();
		this.pushHud(true);
	}
	ro = null;
	async bootstrap() {
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
			"pond"
		];
		const rest = Promise.all([
			loadFrames("jump"),
			loadFrames("duck"),
			loadFrames("dog"),
			loadFrames("gossip"),
			...names.map((name) => loadImage(`/game/${name}.webp`))
		]).then((loaded) => {
			if (!this.alive) return;
			const [jump, duck, dog, gossip, ...singles] = loaded;
			this.art.jump = jump;
			this.art.duck = duck;
			this.art.dog = dog;
			this.art.gossip = gossip;
			names.forEach((name, i) => {
				this.art[name] = singles[i] ?? null;
			});
		});
		const hero = Promise.all([loadFrames("run"), loadFrames("idle")]).then(([run, idle]) => {
			if (!this.alive) return;
			this.art.run = run;
			this.art.idle = idle;
		});
		if (!this.alive) return;
		this.openMenu();
		await Promise.all([hero, rest]);
	}
	openMenu() {
		this.phase = "menu";
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
	bind() {
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
	onKeyDown = (event) => {
		const code = event.code;
		if ([
			"Space",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight"
		].includes(code)) event.preventDefault();
		this.unlock();
		if (code === "Space" || code === "ArrowUp" || code === "KeyW") {
			if (!event.repeat) {
				if (this.phase === "menu" || this.phase === "over" && this.lock <= 0) this.begin();
				else this.jumpEdge = true;
			}
			this.keyJump = true;
		} else if (code === "ArrowDown" || code === "KeyS") {
			this.keyDuck = true;
			this.coachDuck = true;
		} else if (code === "KeyP" || code === "Escape") this.togglePause();
		else if (code === "Enter") {
			if (this.phase === "menu" || this.phase === "over" && this.lock <= 0) this.begin();
		} else if (code === "KeyM") this.toggleMute();
	};
	onKeyUp = (event) => {
		if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") this.keyJump = false;
		if (event.code === "ArrowDown" || event.code === "KeyS") this.keyDuck = false;
	};
	onBlur = () => {
		this.keyJump = false;
		this.keyDuck = false;
		this.touchJump = false;
		this.touchDuck = false;
	};
	onVis = () => {
		if (document.hidden && this.phase === "play") {
			this.phase = "pause";
			this.pushHud(true);
		} else this.sfx.resume();
	};
	swipe = null;
	onPointerDown = (event) => {
		this.unlock();
		this.swipe = {
			x: event.clientX,
			y: event.clientY
		};
	};
	onPointerUp = (event) => {
		if (!this.swipe) return;
		const dx = event.clientX - this.swipe.x;
		const dy = event.clientY - this.swipe.y;
		this.swipe = null;
		if (this.phase === "menu" || this.phase === "over" && this.lock <= 0) {
			this.begin();
			return;
		}
		if (this.phase !== "play") return;
		if (dy > 36 && Math.abs(dy) > Math.abs(dx)) {
			this.duckLock = Math.max(this.duckLock, .38);
			this.coachDuck = true;
			return;
		}
		if (Math.abs(dx) < 48 && dy < 30) this.jumpEdge = true;
	};
	unlock() {
		this.sfx.unlock();
		this.sfx.setMuted(this.muted);
	}
	resize() {
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const cssW = this.canvas.clientWidth || window.innerWidth;
		const cssH = this.canvas.clientHeight || window.innerHeight;
		this.cssW = cssW;
		this.canvas.width = Math.max(1, Math.round(cssW * dpr));
		this.canvas.height = Math.max(1, Math.round(cssH * dpr));
		this.viewW = cssW < 560 ? 530 : cssW < 980 ? 760 : 1e3;
		this.scale = cssW * dpr / this.viewW;
		this.viewH = cssH * dpr / this.scale;
		const bar = (cssW < 860 ? 118 : 36) * (this.viewW / Math.max(1, cssW));
		this.groundY = this.viewH - bar - 8;
		this.u = Math.min(156, Math.max(112, this.viewW * .25));
		this.playerX = this.viewW * .24;
		const jumpH = this.u * 1.35;
		const air = .92;
		this.jumpSpeed = 4 * jumpH / air;
		this.gravity = 8 * jumpH / (air * air);
		if (this.onGround) this.feet = this.groundY;
		const pace = this.viewW < 600 ? 1.18 : 1;
		this.speed0 = 255 * (this.viewW / 740) * pace;
		this.speedMax = 500 * (this.viewW / 740) * pace;
	}
	speed0 = 250;
	speedMax = 480;
	loop(now) {
		if (!this.alive) return;
		const dt = Math.min(.05, (now - this.last) / 1e3 || 0);
		this.last = now;
		this.acc += dt;
		let steps = 0;
		while (this.acc >= 1 / 60 && steps < 5) {
			this.step(1 / 60);
			this.acc -= 1 / 60;
			steps += 1;
		}
		this.draw();
		this.sfx.tick(this.phase !== "loading");
		this.emitAcc += dt;
		if (this.emitAcc > .12) {
			this.emitAcc = 0;
			this.pushHud(false);
		}
		this.raf = requestAnimationFrame(this.loop);
	}
	currentSpeed() {
		if (this.phase === "menu") return this.speed0 * .62;
		const ramp = Math.min(1, this.run / (BIOME_LEN * 3.1));
		return this.speed0 + (this.speedMax - this.speed0) * ramp;
	}
	step(dt) {
		this.time += dt;
		this.pollPad();
		if (this.phase === "loading") return;
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
		this.decayJuice(dt);
		if (this.factLife > 0) {
			this.factLife -= dt;
			if (this.factLife <= 0) this.fact = null;
		}
	}
	simPlayer(dt) {
		this.suppress = Math.max(0, this.suppress - dt);
		const ducking = this.isDucking();
		if (this.keyDuck || this.touchDuck) this.duckLock = Math.max(this.duckLock, .28);
		else this.duckLock = Math.max(0, this.duckLock - dt);
		if (this.jumpEdge && this.suppress <= 0) {
			this.jumpBuffer = .18;
			this.coachJump = true;
		}
		this.jumpEdge = false;
		this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
		if (this.jumpBuffer > 0 && !ducking && (this.onGround || this.coyote > 0)) {
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
			this.coyote = .1;
		} else {
			this.onGround = false;
			this.coyote = Math.max(0, this.coyote - dt);
		}
		if (this.onGround && !ducking) {
			this.dust -= dt;
			if (this.dust <= 0) {
				this.dust = .12;
				this.burst(this.playerX - this.u * .2, this.groundY, "#e7d3a4", 1);
			}
			this.anim += dt * (9 + this.speed / this.u);
		}
	}
	collisions() {
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
			} else if (HAZARDS.has(ent.kind) && this.invuln <= 0) this.hurt(ent);
		}
	}
	grabGossip(ent) {
		const now = this.time;
		this.combo = now - this.lastCollect < 1.15 ? this.combo + 1 : 1;
		this.lastCollect = now;
		const pts = 12 * this.combo;
		this.gossipScore += pts;
		this.gossips += 1;
		this.sfx.collect(this.combo);
		this.pops.push({
			x: ent.x - this.camera,
			y: this.groundY - ent.lift * this.u,
			text: `+${pts}`,
			life: .7
		});
		this.burst(ent.x - this.camera, this.groundY - ent.lift * this.u, "#e8a317", 7);
		if (this.gossips > 0 && this.gossips % 10 === 0) {
			const fact = FACTS[this.factIndex % FACTS.length];
			this.factIndex += 1;
			this.fact = fact;
			this.factLife = 6.2;
			this.sfx.fact();
			this.pushHud(true);
		}
	}
	hurt(ent) {
		ent.alive = false;
		this.lives -= 1;
		this.invuln = 1.35;
		this.shake = 1;
		this.flash = 1;
		this.vy = -this.jumpSpeed * .42;
		this.onGround = false;
		this.hitKind = ent.kind;
		this.sfx.hurt();
		this.burst(this.playerX, this.feet - this.u * .4, "#e4577a", 12);
		if (this.lives <= 0) {
			this.phase = "over";
			this.lock = .45;
			const score = this.score();
			this.newBest = score > this.best;
			if (score > this.best) this.best = score;
			if (this.gossips > this.bestGossips) this.bestGossips = this.gossips;
			this.save();
			this.pushHud(true);
		}
	}
	fillWorld() {
		let guard = 0;
		while (this.decorCursor < this.camera + this.viewW + 50 && guard++ < 12) {
			const mix = biomeMix(this.decorCursor);
			const bag = mix.biome.id === "namesti" ? [
				"lamp",
				"bush",
				"bench",
				"tree",
				"bush"
			] : mix.biome.id === "park" ? [
				"tree",
				"bush",
				"bench",
				"tree",
				"bush"
			] : [
				"tree",
				"bush",
				"lamp",
				"bush",
				"bench"
			];
			const kind = bag[Math.floor(Math.random() * bag.length)];
			this.ents.push({
				kind,
				x: this.decorCursor,
				lift: 0,
				anim: 0,
				alive: true
			});
			this.decorCursor += this.u * (1.35 + Math.random() * 1.8);
		}
		const seen = Math.floor((this.camera + this.viewW * .15) / BIOME_LEN);
		while (this.nextChunk <= seen) {
			const biome = BIOMES[(this.nextChunk % 4 + 4) % 4];
			this.ents.push({
				kind: biome.landmark,
				x: this.nextChunk * BIOME_LEN + this.viewW * .82,
				lift: 0,
				anim: 0,
				alive: true
			});
			this.nextChunk += 1;
		}
		if (this.phase !== "play") return;
		guard = 0;
		while (this.hazardCursor < this.camera + this.viewW + 20 && guard++ < 8) this.spawnWave();
	}
	spawnWave() {
		const u = this.u;
		const speed = Math.max(this.speed, this.speed0);
		const x = this.hazardCursor;
		if (this.run < 260) {
			for (let i = 0; i < 4; i += 1) this.ents.push({
				kind: "gossip",
				x: x + i * u * .4,
				lift: .16,
				anim: i,
				alive: true
			});
			this.hazardCursor += 4 * u * .4 + speed * .62;
			return;
		}
		const roll = Math.random();
		if (roll < .22) {
			const n = 3 + (Math.random() < .45 ? 2 : 0);
			const lift = Math.random() < .5 ? .92 : .14;
			for (let i = 0; i < n; i += 1) this.ents.push({
				kind: "gossip",
				x: x + i * u * .4,
				lift,
				anim: i,
				alive: true
			});
			this.hazardCursor += n * u * .4 + speed * .5;
			return;
		}
		if (roll < .28 && this.lives < 3 && this.run > 500) {
			this.ents.push({
				kind: "heart",
				x,
				lift: .72,
				anim: 0,
				alive: true
			});
			this.hazardCursor += speed * .8;
			return;
		}
		const kind = this.rollHazard();
		this.ents.push({
			kind,
			x,
			lift: kind === "branch" ? .4 : 0,
			anim: 0,
			alive: true
		});
		if (kind === "fence") [
			.48,
			.95,
			.48
		].forEach((lift, i) => {
			this.ents.push({
				kind: "gossip",
				x: x + (i - 1) * u * .36,
				lift,
				anim: i,
				alive: true
			});
		});
		else if (kind === "branch") for (let i = 0; i < 3; i += 1) this.ents.push({
			kind: "gossip",
			x: x + (i - 1) * u * .34,
			lift: .08,
			anim: i,
			alive: true
		});
		const bulk = kind === "car" ? u * 1.35 : kind === "gardener" ? u * .85 : u * .55;
		this.hazardCursor += bulk + speed * 1.08;
		this.lastHazard = kind;
	}
	rollHazard() {
		const mid = this.run > 700;
		const hard = this.run > 2100;
		const bag = [
			"fence",
			"pot",
			"dog",
			"fence",
			"pot"
		];
		if (mid) bag.push("dog", "gardener", "branch", "fence");
		if (hard) bag.push("car", "gardener", "branch", "car");
		let kind = bag[Math.floor(Math.random() * bag.length)];
		if (kind === this.lastHazard) kind = "pot";
		if (kind === "branch" && this.lastHazard === "gardener") kind = "fence";
		if (kind === "car" && (this.lastHazard === "branch" || this.lastHazard === "gardener")) kind = "dog";
		return kind;
	}
	sweep() {
		const min = this.camera - this.viewW * 1.35;
		for (let i = this.ents.length - 1; i >= 0; i -= 1) {
			const ent = this.ents[i];
			if (!ent.alive || ent.x < min) {
				this.ents[i] = this.ents[this.ents.length - 1];
				this.ents.pop();
			}
		}
	}
	decayJuice(dt) {
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
	burst(x, y, color, n) {
		let left = n;
		for (const bit of this.bits) {
			if (left <= 0) break;
			if (bit.on) continue;
			bit.on = true;
			bit.x = x;
			bit.y = y;
			bit.vx = (Math.random() - .5) * 180;
			bit.vy = -80 - Math.random() * 180;
			bit.life = .35 + Math.random() * .3;
			bit.max = bit.life;
			bit.color = color;
			bit.size = 2 + Math.random() * 3;
			left -= 1;
		}
	}
	pollPad() {
		const pad = navigator.getGamepads?.()?.[0];
		if (!pad) {
			this.padJump = false;
			this.padDuck = false;
			return;
		}
		const jump = Boolean(pad.buttons[0]?.pressed || pad.buttons[12]?.pressed || (pad.axes[1] ?? 0) < -.65);
		const duck = Boolean(pad.buttons[1]?.pressed || pad.buttons[13]?.pressed || (pad.axes[1] ?? 0) > .65);
		if (jump && !this.prevPadJump) this.jumpEdge = true;
		this.prevPadJump = jump;
		this.padJump = jump;
		this.padDuck = duck;
		if (duck) this.coachDuck = true;
		const start = Boolean(pad.buttons[9]?.pressed);
		if (start && !this.prevStart && (this.phase === "play" || this.phase === "pause")) this.togglePause();
		this.prevStart = start;
	}
	score() {
		return Math.floor(this.run * .05) + this.gossipScore;
	}
	isDucking() {
		return this.phase === "play" && this.onGround && (this.keyDuck || this.touchDuck || this.padDuck || this.duckLock > 0);
	}
	playerBox() {
		const ducking = this.isDucking();
		const h = (ducking ? .34 : .62) * this.u;
		const w = (ducking ? .58 : .36) * this.u;
		return box(this.playerX, this.feet, w, h);
	}
	entBox(ent) {
		if (!HAZARDS.has(ent.kind) && !PICKUPS.has(ent.kind)) return null;
		if (ent.kind !== "heart" && !this.spriteFor(ent)) return null;
		const spec = SPEC[ent.kind];
		const h = spec.h * this.u;
		const img = this.spriteFor(ent);
		const w = h * (img && img.width ? img.width / img.height : ent.kind === "car" ? 2 : 1);
		return box(ent.x - this.camera, this.groundY - (ent.kind === "branch" ? spec.lift : ent.lift) * this.u, w * spec.hitW, h * spec.hitH);
	}
	spriteFor(ent) {
		if (ent.kind === "dog") return frameOf(this.art.dog, Math.floor(this.time * 10 + ent.anim));
		if (ent.kind === "gossip") return frameOf(this.art.gossip, Math.floor(this.time * 6 + ent.anim));
		const img = this.art[ent.kind];
		return img instanceof HTMLImageElement ? img : null;
	}
	draw() {
		const ctx = this.ctx;
		if (!ctx) return;
		const mix = biomeMix(this.camera);
		const col = (key) => rgbCss(lerpRgb(mix.biome[key], mix.tint[key], mix.t));
		const mag = this.shake * this.u * .1;
		const ox = Math.sin(this.time * 46) * mag;
		const oy = Math.cos(this.time * 33) * mag * .45;
		ctx.setTransform(this.scale, 0, 0, this.scale, ox * this.scale, oy * this.scale);
		ctx.clearRect(-20, -20, this.viewW + 40, this.viewH + 40);
		const sky = ctx.createLinearGradient(0, 0, 0, Math.max(this.groundY, 10));
		sky.addColorStop(0, col("skyTop"));
		sky.addColorStop(1, col("skyBot"));
		ctx.fillStyle = sky;
		ctx.fillRect(-20, -20, this.viewW + 40, this.viewH + 40);
		ctx.fillStyle = "rgba(255, 236, 180, 0.95)";
		ctx.beginPath();
		ctx.arc(this.viewW * .8, this.u * .42, this.u * .22, 0, Math.PI * 2);
		ctx.fill();
		this.clouds(ctx);
		this.hills(ctx, .22, this.groundY - this.u * .85, this.u * .38, col("hillFar"));
		this.hills(ctx, .4, this.groundY - this.u * .28, this.u * .22, col("hill"));
		ctx.fillStyle = col("grass");
		ctx.fillRect(-20, this.groundY - 4, this.viewW + 40, this.viewH - this.groundY + 30);
		for (const ent of this.ents) if (ent.alive && LANDMARKS.has(ent.kind)) this.drawEnt(ctx, ent);
		for (const ent of this.ents) if (ent.alive && DECOR.has(ent.kind)) this.drawEnt(ctx, ent);
		ctx.fillStyle = col("path");
		const pathH = Math.max(22, this.u * .2);
		ctx.fillRect(-20, this.groundY + 1, this.viewW + 40, pathH);
		ctx.fillStyle = col("pathDark");
		const stride = 26;
		for (let x = -(this.camera % stride); x < this.viewW; x += stride) ctx.fillRect(x, this.groundY + pathH * .35, 12, 3);
		ctx.fillStyle = col("grassDark");
		ctx.fillRect(-20, this.groundY - 7, this.viewW + 40, 8);
		this.flowers(ctx);
		for (const ent of this.ents) {
			if (!ent.alive || LANDMARKS.has(ent.kind) || DECOR.has(ent.kind)) continue;
			this.drawEnt(ctx, ent);
		}
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
		ctx.font = `800 ${Math.round(this.u * .16)}px Nunito, sans-serif`;
		ctx.textAlign = "center";
		for (const pop of this.pops) {
			ctx.globalAlpha = Math.max(0, pop.life / .7);
			ctx.fillStyle = "#241c16";
			ctx.fillText(pop.text, pop.x, pop.y - (.7 - pop.life) * 28);
		}
		ctx.globalAlpha = 1;
		if (this.flash > 0) {
			ctx.fillStyle = `rgba(255,246,232,${this.flash * .28})`;
			ctx.fillRect(-20, -20, this.viewW + 40, this.viewH + 40);
		}
	}
	clouds(ctx) {
		ctx.fillStyle = "rgba(255,255,255,0.72)";
		for (let i = 0; i < 5; i += 1) {
			const x = ((i * 220 + 30 - this.camera * .12) % (this.viewW + 180) + this.viewW + 180) % (this.viewW + 180) - 60;
			const y = this.u * (.25 + i % 3 * .18);
			const r = this.u * (.12 + i % 2 * .04);
			ctx.beginPath();
			ctx.ellipse(x, y, r * 1.5, r, 0, 0, Math.PI * 2);
			ctx.ellipse(x + r, y + 4, r * 1.1, r * .8, 0, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	hills(ctx, parallax, base, amp, color) {
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.moveTo(-10, this.viewH + 10);
		for (let x = -10; x <= this.viewW + 10; x += 12) {
			const wx = this.camera * parallax + x;
			const y = base + Math.sin(wx * .01) * amp + Math.sin(wx * .004 + 1.4) * amp * .55;
			ctx.lineTo(x, y);
		}
		ctx.lineTo(this.viewW + 10, this.viewH + 10);
		ctx.closePath();
		ctx.fill();
	}
	flowers(ctx) {
		const step = Math.max(18, this.u * .22);
		const start = Math.floor(this.camera / step) * step;
		for (let wx = start; wx < this.camera + this.viewW; wx += step) {
			const n = hash(wx);
			if (n < .55) continue;
			const x = wx - this.camera;
			const y = this.groundY - 4;
			ctx.fillStyle = n > .82 ? "#e4577a" : n > .7 ? "#e8a317" : "#fff6e8";
			ctx.beginPath();
			ctx.arc(x, y, 3.2, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	drawEnt(ctx, ent) {
		const spec = SPEC[ent.kind];
		const h = spec.h * this.u;
		const bob = ent.kind === "gossip" ? Math.sin(this.time * 4 + ent.anim) * this.u * .04 : 0;
		const lift = (ent.kind === "branch" ? spec.lift : ent.lift) * this.u;
		const cx = ent.x - this.camera;
		const feet = this.groundY - lift + bob;
		if (ent.kind === "branch") {
			ctx.strokeStyle = "#6d4a2b";
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(cx, 0);
			ctx.lineTo(cx, feet - h + 8);
			ctx.stroke();
		}
		if (ent.kind === "heart") {
			drawHeart(ctx, cx, feet - h * .55, h * .42);
			return;
		}
		const img = this.spriteFor(ent);
		if (!img) return;
		const w = h * (img.width / img.height);
		ctx.drawImage(img, cx - w / 2, feet - h, w, h);
	}
	drawPlayer(ctx) {
		if (this.invuln > 0 && Math.floor(this.time * 18) % 2 === 0) return;
		const ducking = this.isDucking();
		const air = this.u * (1 - Math.min(1, (this.groundY - this.feet) / (this.u * 1.35)));
		ctx.fillStyle = "rgba(36, 28, 22, 0.18)";
		ctx.beginPath();
		ctx.ellipse(this.playerX, this.groundY + 3, this.u * .22 * (.7 + air * .3), this.u * .055, 0, 0, Math.PI * 2);
		ctx.fill();
		let sheet = this.art.run;
		let index = Math.floor(this.anim) % 4;
		if (this.phase === "over") {
			sheet = this.art.idle;
			index = Math.floor(this.time * 3) % 4;
		} else if (ducking) {
			sheet = this.art.duck;
			index = this.duckLock > .2 ? 1 + Math.floor(this.time * 8) % 2 : 0;
		} else if (!this.onGround && this.phase === "play") {
			sheet = this.art.jump;
			if (this.vy < -this.jumpSpeed * .25) index = 1;
			else if (this.vy > this.jumpSpeed * .12) index = 3;
			else index = 2;
		} else if (this.phase === "menu") {
			sheet = this.art.run;
			index = Math.floor(this.time * 8) % 4;
		}
		const img = frameOf(sheet, index) ?? frameOf(this.art.idle, 0);
		const h = this.u;
		if (!img) {
			ctx.fillStyle = "#241c16";
			ctx.fillRect(this.playerX - 16, this.feet - h * .7, 32, h * .7);
			return;
		}
		const w = h * (img.width / img.height);
		ctx.drawImage(img, this.playerX - w / 2, this.feet - h, w, h);
	}
	pushHud(force) {
		if (!force && this.phase === "loading") return;
		const mix = biomeMix(this.phase === "menu" ? this.camera : this.run > 0 ? this.camera : this.camera);
		const combo = this.time - this.lastCollect < 1.15 ? this.combo : 0;
		this.onHud({
			phase: this.phase,
			score: this.score(),
			best: this.best,
			bestGossips: this.bestGossips,
			gossips: this.gossips,
			combo,
			lives: this.lives,
			biome: mix.name,
			fact: this.fact,
			pips: this.gossips % 10,
			newBest: this.newBest,
			muted: this.muted,
			coach: this.phase === "play" && (!this.coachJump || !this.coachDuck) && this.run < 1400,
			line: LINES[this.hitKind ?? ""] ?? "Dneska vyhrál chodník."
		});
	}
	loadSave() {
		try {
			const raw = localStorage.getItem(SAVE_KEY);
			if (!raw) return;
			const data = JSON.parse(raw);
			if (data.v !== 1) return;
			this.best = data.best ?? 0;
			this.bestGossips = data.gossips ?? 0;
			this.muted = Boolean(data.mute);
		} catch {}
	}
	save() {
		try {
			localStorage.setItem(SAVE_KEY, JSON.stringify({
				v: 1,
				best: this.best,
				gossips: this.bestGossips,
				mute: this.muted
			}));
		} catch {}
	}
};
function frameOf(sheet, index) {
	if (!Array.isArray(sheet) || sheet.length === 0) return null;
	return sheet[(index % sheet.length + sheet.length) % sheet.length] ?? null;
}
function box(cx, feet, w, h) {
	const iw = w * .82;
	const ih = h * .86;
	return {
		l: cx - iw / 2,
		r: cx + iw / 2,
		t: feet - ih,
		b: feet - 2
	};
}
function overlap(a, b) {
	return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
}
function drawHeart(ctx, x, y, s) {
	ctx.save();
	ctx.translate(x, y);
	ctx.fillStyle = "#e4577a";
	ctx.beginPath();
	ctx.moveTo(0, s * .35);
	ctx.bezierCurveTo(-s, -s * .25, -s * .35, -s, 0, -s * .45);
	ctx.bezierCurveTo(s * .35, -s, s, -s * .25, 0, s * .35);
	ctx.fill();
	ctx.restore();
}
function GameApp() {
	const canvasRef = (0, import_react.useRef)(null);
	const gameRef = (0, import_react.useRef)(null);
	const [hud, setHud] = (0, import_react.useState)(emptyHud);
	const [copied, setCopied] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const game = new Runner(canvas, setHud);
		gameRef.current = game;
		game.start();
		return () => game.destroy();
	}, []);
	async function share() {
		const text = `Drběna nasbírala ${hud.gossips} drbů a ${hud.score} bodů v Kopidlně. Zvládneš víc?`;
		const url = window.location.href;
		try {
			if (navigator.share) {
				await navigator.share({
					title: "Drběna sbírá drby",
					text,
					url
				});
				return;
			}
			await navigator.clipboard.writeText(`${text} ${url}`);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1800);
		} catch {}
	}
	const playing = hud.phase === "play" || hud.phase === "pause" || hud.phase === "over";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "relative h-dvh w-full touch-none overflow-hidden bg-day text-ink select-none",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				className: "absolute inset-0 h-full w-full touch-none",
				"aria-label": "Hra Drběna sbírá drby"
			}),
			hud.phase === "loading" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 flex items-center justify-center p-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-4xl text-ink",
					children: "Drběna si rovná mašli…"
				})
			}),
			hud.phase === "menu" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 flex items-end justify-center p-4 sm:items-end sm:justify-end sm:p-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "mx-auto w-full max-w-md rounded-3xl border-2 border-ink bg-cream p-5 shadow-lg sm:p-7",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: "/game/portrait.webp",
								alt: "Drběna, černobílá koza s růžovou mašlí",
								className: "size-20 shrink-0 rounded-full border-4 border-cream bg-ink object-cover shadow-md sm:size-24"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-extrabold tracking-wide text-leaf",
								children: "Kopidlno"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
								className: "font-display text-4xl leading-none text-ink sm:text-5xl",
								children: ["Drběna", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-1 block text-2xl text-bow sm:text-3xl",
									children: "sbírá drby"
								})]
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 text-base leading-snug text-ink-soft",
							children: "Koza s růžovou mašlí běží náměstím, zámkem i parkem. Skákej přes ploty a chytej drby, než je odnese vítr."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 grid grid-cols-3 gap-2 text-center text-sm font-extrabold",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "rounded-2xl bg-cream-deep px-2 py-3",
									children: [
										"Skok",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-semibold text-ink-soft",
											children: "mezerník"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "rounded-2xl bg-cream-deep px-2 py-3",
									children: [
										"Úhyb",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-semibold text-ink-soft",
											children: "šipka dolů"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "rounded-2xl bg-cream-deep px-2 py-3",
									children: [
										"Drby",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-semibold text-ink-soft",
											children: "každých 10"
										})
									]
								})
							]
						}),
						hud.best > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-sm font-extrabold text-ink",
							children: [
								"Rekord ",
								hud.best,
								" bodů",
								hud.bestGossips > 0 ? ` · ${hud.bestGossips} drbů` : ""
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-4 flex h-14 w-full items-center justify-center rounded-full border-2 border-ink bg-bow text-xl font-extrabold text-cream",
							onClick: () => gameRef.current?.begin(),
							children: "Vyrazit na drby"
						})
					]
				})
			}),
			playing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-auto rounded-3xl border-2 border-ink bg-cream/95 px-3 py-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-3xl leading-none",
							children: hud.score
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm font-extrabold text-ink-soft",
							children: [
								hud.gossips,
								" drbů",
								hud.combo > 1 ? ` · ×${hud.combo}` : ""
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1 flex gap-1",
							"aria-hidden": "true",
							children: Array.from({ length: 10 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: i < hud.pips ? "size-1.5 rounded-full bg-gold" : "size-1.5 rounded-full bg-ink/15" }, i))
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-auto flex flex-col items-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "rounded-full border-2 border-ink bg-cream px-3 py-1 text-sm font-extrabold",
								children: hud.biome
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "flex size-11 items-center justify-center rounded-full border-2 border-ink bg-cream",
								"aria-label": hud.muted ? "Zapnout zvuk" : "Vypnout zvuk",
								onClick: () => gameRef.current?.toggleMute(),
								children: hud.muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-5" })
							}),
							hud.phase !== "over" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "flex size-11 items-center justify-center rounded-full border-2 border-ink bg-cream",
								"aria-label": hud.phase === "pause" ? "Pokračovat" : "Pauza",
								onClick: () => gameRef.current?.togglePause(),
								children: hud.phase === "pause" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-5" })
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex gap-1",
						"aria-label": `Životy: ${hud.lives}`,
						children: [
							0,
							1,
							2
						].map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heart, { className: i < hud.lives ? "size-6 fill-bow text-bow" : "size-6 text-ink/25" }, i))
					})]
				})]
			}),
			hud.fact && hud.phase === "play" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "pointer-events-none absolute inset-x-0 top-28 z-10 mx-auto w-[min(100%-1.5rem,32rem)] rounded-3xl border-2 border-ink bg-cream px-4 py-3 shadow-lg sm:top-24",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-extrabold tracking-wide text-bow",
						children: "Drb z Kopidlna"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-xl leading-tight",
						children: hud.fact.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm leading-snug text-ink-soft",
						children: hud.fact.text
					})
				]
			}),
			hud.coach && !hud.fact && hud.phase === "play" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "pointer-events-none absolute inset-x-3 top-28 text-center text-sm font-extrabold text-ink sm:top-24",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded-full border-2 border-ink bg-cream/95 px-4 py-2",
					children: "Klepni = skok. Táhni dolů = úhyb."
				})
			}),
			hud.phase === "pause" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 flex items-center justify-center bg-ink/30 p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "w-full max-w-sm rounded-3xl border-2 border-ink bg-cream p-6 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-4xl",
							children: "Pauza"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-ink-soft",
							children: "Drby počkají. Kopidlno nikam neuteče."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-bow font-extrabold text-cream",
							onClick: () => gameRef.current?.togglePause(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-5" }), " Pokračovat"]
						})
					]
				})
			}),
			hud.phase === "over" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 flex items-center justify-center bg-ink/35 p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "w-full max-w-sm rounded-3xl border-2 border-ink bg-cream p-6 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-extrabold text-bow",
							children: "Konec kola"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-1 font-display text-4xl leading-none",
							children: "Drby došly"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-ink-soft",
							children: hud.line
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 font-display text-5xl leading-none",
							children: hud.score
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 font-extrabold",
							children: [
								hud.gossips,
								" drbů",
								hud.newBest ? " · nový rekord" : hud.best > 0 ? ` · rekord ${hud.best}` : ""
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 grid grid-cols-2 gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "flex h-12 items-center justify-center gap-2 rounded-full border-2 border-ink bg-bow font-extrabold text-cream",
								onClick: () => gameRef.current?.begin(),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-4" }), " Znovu"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "flex h-12 items-center justify-center gap-2 rounded-full border-2 border-ink bg-cream font-extrabold",
								onClick: () => void share(),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Share2, { className: "size-4" }),
									" ",
									copied ? "Hotovo" : "Sdílet"
								]
							})]
						})
					]
				})
			}),
			hud.phase === "play" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute inset-x-0 bottom-3 flex items-end justify-between gap-3 px-3 sm:bottom-4 sm:justify-end",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "flex h-20 min-w-36 items-center justify-center rounded-full border-2 border-ink bg-cream px-5 text-lg font-extrabold",
					onPointerDown: (event) => {
						event.preventDefault();
						event.stopPropagation();
						event.currentTarget.setPointerCapture(event.pointerId);
						gameRef.current?.pressDuck(true);
					},
					onPointerUp: (event) => {
						event.stopPropagation();
						gameRef.current?.pressDuck(false);
					},
					onPointerCancel: () => gameRef.current?.pressDuck(false),
					children: "Úhyb"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "flex h-20 min-w-36 items-center justify-center rounded-full border-2 border-ink bg-bow px-5 text-lg font-extrabold text-cream",
					onPointerDown: (event) => {
						event.preventDefault();
						event.stopPropagation();
						event.currentTarget.setPointerCapture(event.pointerId);
						gameRef.current?.pressJump(true);
					},
					onPointerUp: (event) => {
						event.stopPropagation();
						gameRef.current?.pressJump(false);
					},
					onPointerCancel: () => gameRef.current?.pressJump(false),
					children: "Skok"
				})]
			})
		]
	});
}
var SplitComponent = GameApp;
//#endregion
export { SplitComponent as component };
