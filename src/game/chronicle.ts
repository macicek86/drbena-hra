import bookData from "./chronicle.json" with { type: "json" };

const KEY = "drbena-kronika-v1";

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

export type ChronicleLink = { label: string; href: string };

export type ChroniclePage = {
  id: string;
  place: string;
  title: string;
  intro: string;
  paragraphs: string[];
  curiosities: string[];
  sources: string[];
  link: ChronicleLink | null;
};

export type ShelfPage =
  | { id: string; open: false }
  | { id: string; open: true; title: string; on: string; fresh: boolean; page: ChroniclePage };

export type ShelfChapter = {
  id: string;
  name: string;
  known: number;
  total: number;
  pages: ShelfPage[];
};

export type ChronicleShelf = { known: number; total: number; chapters: ShelfChapter[]; opened: ShelfPage[] };

type Saved = Record<string, string>;

const pages = normalizePages(bookData);
const chapters = normalizeChapters(bookData, pages);

export function pageIds(): string[] {
  return pages.map((page) => page.id);
}

const VILLAGE_PREFIXES: Record<string, string> = {
  mlynec: "mlynec-",
  ledkov: "ledkov-",
  drahoraz: "drahoraz-",
  pseves: "pseves-",
};

export function nextFact(place: string, known: readonly string[]): ChroniclePage | null {
  const have = new Set(known);
  const prefix = VILLAGE_PREFIXES[place];
  if (prefix) {
    // Místní stránky zůstávají společně v kapitole „Okolní vesnice“,
    // ale pergamen sebraný v konkrétní vsi nejprve odemyká příběhy odtud.
    const local = pages.find((item) => item.place === "vsi" && item.id.startsWith(prefix) && !have.has(item.id));
    if (local) return local;
  }
  const order = chapters.map((chapter) => chapter.id);
  const chapterId = prefix ? "vsi" : place;
  const start = Math.max(0, order.indexOf(chapterId));
  for (let step = 0; step < Math.max(order.length, 1); step += 1) {
    const id = order.length ? order[(start + step) % order.length]! : chapterId;
    const page = pages.find((item) => item.place === id && !have.has(item.id));
    if (page) return page;
    if (!order.length) break;
  }
  return null;
}

export function rememberFact(place: string, today = todayStamp()): ChroniclePage | null {
  const page = nextFact(place, knownIds());
  if (!page) return null;
  const saved = load();
  saved[page.id] = today;
  store(saved);
  return page;
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

export function parseFound(raw: string | null): Saved {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw) as { found?: unknown };
    return foundMap(data?.found);
  } catch {
    return {};
  }
}

export function chronicleBook(): ChronicleShelf {
  return chronicleBookFrom(load());
}

export function chronicleBookFrom(found: Saved, today = todayStamp()): ChronicleShelf {
  const known = pages.filter((page) => found[page.id]).length;
  const order = new Map(Object.keys(found).map((id, index) => [id, index]));
  const chaptersOut = chapters.map((chapter) => {
    const inChapter = pages.filter((page) => page.place === chapter.id);
    const slots: ShelfPage[] = inChapter.map((page) => openSlot(page, found[page.id], today));
    return {
      id: chapter.id,
      name: chapter.name,
      known: slots.filter((slot) => slot.open).length,
      total: slots.length,
      pages: slots,
    };
  });
  const opened = chaptersOut
    .flatMap((chapter) => chapter.pages)
    .filter((slot) => slot.open)
    .sort((a, b) => (order.get(b.id) ?? 0) - (order.get(a.id) ?? 0));
  return { known, total: pages.length, chapters: chaptersOut, opened };
}

function openSlot(page: ChroniclePage, on: string | undefined, today: string): ShelfPage {
  if (!on) return { id: page.id, open: false };
  return { id: page.id, open: true, title: page.title, on: czechDate(on), fresh: on === today, page };
}

function normalizeChapters(raw: unknown, list: ChroniclePage[]): { id: string; name: string }[] {
  const data = raw as { chapters?: unknown };
  const declared = Array.isArray(data.chapters) ? data.chapters : [];
  const chapters: { id: string; name: string }[] = [];
  const seen = new Set<string>();
  for (const item of declared) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; name?: unknown };
    if (typeof row.id !== "string" || !row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    chapters.push({ id: row.id, name: typeof row.name === "string" && row.name ? row.name : row.id });
  }
  for (const page of list) {
    if (seen.has(page.place)) continue;
    seen.add(page.place);
    chapters.push({ id: page.place, name: page.place });
  }
  return chapters;
}

function normalizePages(raw: unknown): ChroniclePage[] {
  const data = raw as { pages?: unknown };
  if (!Array.isArray(data.pages)) return [];
  const pages: ChroniclePage[] = [];
  const seen = new Set<string>();
  for (const item of data.pages) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || !row.id || seen.has(row.id)) continue;
    if (typeof row.place !== "string" || !row.place) continue;
    if (typeof row.title !== "string") continue;
    seen.add(row.id);
    pages.push({
      id: row.id,
      place: row.place,
      title: row.title,
      intro: typeof row.intro === "string" ? row.intro : "",
      paragraphs: stringList(row.paragraphs),
      curiosities: stringList(row.curiosities),
      sources: stringList(row.sources),
      link: linkOf(row.link),
    });
  }
  return pages;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function linkOf(value: unknown): ChronicleLink | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { label?: unknown; href?: unknown };
  if (typeof row.href !== "string" || !row.href) return null;
  const label = typeof row.label === "string" && row.label ? row.label : row.href;
  return { label, href: row.href };
}

function foundMap(value: unknown): Saved {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const found: Saved = {};
  for (const [id, date] of Object.entries(value)) {
    if (typeof date === "string" && date) found[id] = date;
  }
  return found;
}

function todayStamp() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function load(): Saved {
  try {
    return parseFound(localStorage.getItem(KEY));
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
