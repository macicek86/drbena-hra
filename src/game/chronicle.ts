import { FACTS, type Fact, type PlaceId } from "./content.ts";

const KEY = "drbena-kronika-v1";

const CHAPTERS: { id: PlaceId; name: string; of: string }[] = [
  { id: "namesti", name: "Náměstí", of: "z náměstí" },
  { id: "skola", name: "Stará škola", of: "ze staré školy" },
  { id: "zamek", name: "Zámek", of: "ze zámku" },
  { id: "sklenik", name: "Palmový skleník", of: "z palmového skleníku" },
  { id: "park", name: "Zámecký park", of: "ze zámeckého parku" },
];

const MONTHS = [
  "ledna",
  "února",
  "března",
  "dubna",
  "května",
  "června",
  "července",
  "srpna",
  "září",
  "října",
  "listopadu",
  "prosince",
];

export type ChronicleEntry = { title: string; text: string; on: string };

export type ChronicleChapter = {
  name: string;
  line: string;
  entries: ChronicleEntry[];
};

type Saved = Record<string, string>;

export function nextFact(place: PlaceId, known: readonly string[]): Fact | null {
  const have = new Set(known);
  const order = CHAPTERS.map((chapter) => chapter.id);
  const start = Math.max(0, order.indexOf(place));
  for (let step = 0; step < order.length; step += 1) {
    const id = order[(start + step) % order.length]!;
    const fact = FACTS.find((item) => item.place === id && !have.has(item.id));
    if (fact) return fact;
  }
  return null;
}

export function rememberFact(place: PlaceId, today = todayStamp()): Fact | null {
  const fact = nextFact(place, knownIds());
  if (!fact) return null;
  const saved = load();
  saved[fact.id] = today;
  store(saved);
  return fact;
}

export function knownIds(): string[] {
  return Object.keys(load());
}

export function entryLine(count: number): string {
  if (count <= 0) return "Dnes nic nového";
  if (count === 1) return "Do kroniky přibyl 1 zápis";
  if (count < 5) return `Do kroniky přibyly ${count} zápisy`;
  return `Do kroniky přibylo ${count} zápisů`;
}

export function czechDate(iso = todayStamp()): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d}. ${MONTHS[m - 1] ?? ""} ${y}`;
}

export function chronicleBook(): { known: number; total: number; chapters: ChronicleChapter[] } {
  const saved = load();
  const chapters = CHAPTERS.map((chapter) => {
    const facts = FACTS.filter((fact) => fact.place === chapter.id);
    const entries = facts
      .filter((fact) => saved[fact.id])
      .map((fact) => ({ title: fact.title, text: fact.text, on: czechDate(saved[fact.id]) }));
    return {
      name: chapter.name,
      line: `${chapter.of} zná ${entries.length} z ${facts.length}`,
      entries,
    };
  }).filter((chapter) => chapter.entries.length > 0);
  return { known: Object.keys(saved).length, total: FACTS.length, chapters };
}

function todayStamp() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as { found?: Saved };
    const found = data.found;
    if (!found || typeof found !== "object") return {};
    return found;
  } catch {
    return {};
  }
}

function store(found: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, found }));
  } catch {
    /* kronika zůstane aspoň do konce běhu */
  }
}
