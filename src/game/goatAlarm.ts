export type AlarmGrade = "miss" | "weak" | "good" | "perfect";
export type AlarmPose = "ready" | "hit" | "stumble";
export type AlarmEvent = "thud" | "bleat" | "honk" | "keeper" | "fanfare" | "stumble" | "cricket";

export type AlarmState = {
  id: "alarm";
  stage: "offer" | "play" | "done";
  title: string;
  prompt: string;
  reward: number;
  success: string;
  rewarded: boolean;
  failed: boolean;
  t: number;
  limit: number;
  pointer: number;
  dir: 1 | -1;
  speed: number;
  zoneStart: number;
  zoneEnd: number;
  windows: number;
  goal: number;
  pose: AlarmPose;
  poseT: number;
  shake: number;
  grade: AlarmGrade | "";
  note: string;
  salt: number;
  hits: number;
};

const TITLE = "Kozlí poplach";
const REWARD = 50;
const GOAL = 4;
const LIMIT = 26;
const SUCCESS = "Kozlí poplach! Kopidlno je zachráněno!";
const FAIL = "Kozel si jen odfrkl a usnul. Kopidlno se dneska neprobudilo.";

const INVITES = [
  "Drběno, tohle není o tobě. Jeden starej střapatý kozel kdysi v noci probudil rohy celý hostinec a zachránil Kopidlno. Zkusíš ten poplach?",
  "Pššt. Před dřevěným hostincem stál přivázaný kozel s vousy. Nebyla to tvoje prateta. Ťukneš, když rohy míří do zdi?",
  "Za dávných časů zachránilo městečko kozlí dupnutí. Chceš ten noční poplach spustit ty?",
  "Mám pro tebe pověst, ne drb. Starý kozel, kůl, hostinec a správná chvíle. Dáš se do toho?",
] as const;

const MISSES = [
  "Kozel zavrávoral a kouká, jako by za to mohla zeď.",
  "Vedle. I tvrdohlavý kozel musí znovu nabrat rohy.",
  "Tma je veliká a rána žádná. Ještě jednou!",
];

let lastInvite = -1;

function pickInvite(rng: () => number) {
  let index = Math.floor(rng() * INVITES.length);
  if (INVITES.length > 1 && index === lastInvite) index = (index + 1) % INVITES.length;
  lastInvite = index;
  return INVITES[index]!;
}

export function zoneFor(hits: number, salt: number) {
  const width = Math.max(0.16, 0.3 - hits * 0.028);
  const span = Math.max(0.05, 1 - width - 0.1);
  const shift = ((Math.abs(salt) * 3 + hits * 17) % 100) / 100;
  const start = 0.05 + shift * span;
  return { start, end: Math.min(0.95, start + width) };
}

export function judgeTap(pointer: number, start: number, end: number): AlarmGrade {
  const mid = (start + end) / 2;
  const half = Math.max(0.001, (end - start) / 2);
  const distance = Math.abs(pointer - mid);
  if (distance <= half * 0.38) return "perfect";
  if (distance <= half) return "good";
  if (distance <= half * 1.45) return "weak";
  return "miss";
}

export function createAlarm(rng: () => number = Math.random): AlarmState {
  const salt = Math.floor(rng() * 1000);
  const zone = zoneFor(0, salt);
  return {
    id: "alarm",
    stage: "offer",
    title: TITLE,
    prompt: pickInvite(rng),
    reward: REWARD,
    success: SUCCESS,
    rewarded: false,
    failed: false,
    t: 0,
    limit: LIMIT,
    pointer: 0,
    dir: 1,
    speed: 0.52,
    zoneStart: zone.start,
    zoneEnd: zone.end,
    windows: 0,
    goal: GOAL,
    pose: "ready",
    poseT: 0,
    shake: 0,
    grade: "",
    note: "Klepni, když je růžek ve zlatém poli.",
    salt,
    hits: 0,
  };
}

function finish(state: AlarmState, failed: boolean): { state: AlarmState; events: AlarmEvent[]; grant: number } {
  const grant = !failed && !state.rewarded ? state.reward : 0;
  return {
    state: {
      ...state,
      stage: "done",
      failed,
      rewarded: failed ? state.rewarded : true,
      success: failed ? FAIL : SUCCESS,
      pose: "ready",
      poseT: 0,
      note: failed ? FAIL : SUCCESS,
      windows: failed ? state.windows : state.goal,
    },
    events: failed ? [] : ["fanfare", "honk", "keeper"],
    grant,
  };
}

export function tickAlarm(state: AlarmState, dt: number): { state: AlarmState; events: AlarmEvent[]; grant: number } {
  if (state.stage !== "play") return { state, events: [], grant: 0 };
  const step = Math.max(0, Math.min(0.05, dt));
  let pointer = state.pointer;
  let dir = state.dir;
  if (state.pose === "ready") {
    pointer += dir * state.speed * step;
    if (pointer >= 1) {
      pointer = 1;
      dir = -1;
    } else if (pointer <= 0) {
      pointer = 0;
      dir = 1;
    }
  }
  const poseT = Math.max(0, state.poseT - step);
  let pose = state.pose;
  if (pose !== "ready" && poseT === 0) pose = "ready";
  const t = state.t + step;
  const events: AlarmEvent[] = [];
  if (Math.floor(t / 1.8) !== Math.floor(state.t / 1.8)) events.push("cricket");
  const length = state.grade === "perfect" ? 0.85 : state.grade === "weak" ? 0.5 : state.pose === "hit" ? 0.7 : 0;
  const before = length - state.poseT;
  const after = length - poseT;
  let shake = Math.max(0, state.shake - step * 2.4);
  if (state.pose === "hit" && before < 0.26 && after >= 0.26) {
    shake = state.grade === "perfect" ? 1 : state.grade === "good" ? 0.7 : 0.3;
    events.push("thud");
    if (state.grade === "perfect") events.push("bleat");
    if (state.windows === 2) events.push("keeper");
    if (state.windows === 3) events.push("honk");
  }
  let next: AlarmState = {
    ...state,
    t,
    pointer,
    dir,
    pose,
    poseT,
    shake,
  };
  if (pose === "ready" && state.windows >= state.goal) return finish(next, false);
  if (pose === "ready" && t >= state.limit && state.windows < state.goal) return finish(next, true);
  return { state: next, events, grant: 0 };
}

export function alarmTap(state: AlarmState): { state: AlarmState; events: AlarmEvent[] } {
  if (state.stage !== "play" || state.pose !== "ready") return { state, events: [] };
  const grade = judgeTap(state.pointer, state.zoneStart, state.zoneEnd);
  if (grade === "miss") {
    const note = MISSES[state.hits % MISSES.length]!;
    return {
      state: { ...state, pose: "stumble", poseT: 0.56, grade, note, shake: 0 },
      events: ["stumble"],
    };
  }
  if (grade === "weak") {
    return {
      state: {
        ...state,
        pose: "hit",
        poseT: 0.5,
        grade,
        note: "Skoro! Kozel jen škrábl ostěním.",
        shake: 0,
      },
      events: [],
    };
  }
  const windows = Math.min(state.goal, state.windows + 1);
  const hits = state.hits + 1;
  const zone = zoneFor(hits, state.salt);
  const events: AlarmEvent[] = [];
  return {
    state: {
      ...state,
      windows,
      hits,
      speed: Math.min(0.92, state.speed + 0.07),
      zoneStart: zone.start,
      zoneEnd: zone.end,
      pose: "hit",
      poseT: grade === "perfect" ? 0.85 : 0.7,
      grade,
      shake: 0,
      note: grade === "perfect" ? "Přesně mezi rohy! Hostinec se otřásl." : "Třesk! Rohy našly dřevo.",
    },
    events,
  };
}

export function alarmAct(
  state: AlarmState,
  action: { type: string },
): { state: AlarmState | null; grant: number; resume: boolean; events: AlarmEvent[] } {
  if (action.type === "skip") return { state: null, grant: 0, resume: true, events: [] };
  if (action.type === "decline" && state.stage === "offer") return { state: null, grant: 0, resume: true, events: [] };
  if (action.type === "continue" && state.stage === "done") return { state: null, grant: 0, resume: true, events: [] };
  if (action.type === "play" && state.stage === "offer") {
    const fresh = createAlarm(() => state.salt / 1000);
    return {
      state: { ...fresh, prompt: state.prompt, salt: state.salt, stage: "play", zoneStart: state.zoneStart, zoneEnd: state.zoneEnd },
      grant: 0,
      resume: false,
      events: [],
    };
  }
  if (action.type === "tap" && state.stage === "play") {
    const tapped = alarmTap(state);
    return { state: tapped.state, grant: 0, resume: false, events: tapped.events };
  }
  return { state, grant: 0, resume: false, events: [] };
}
