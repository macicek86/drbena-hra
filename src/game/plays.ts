const endpoint = String((import.meta.env as Record<string, string | undefined>).VITE_PLAYS_URL ?? "").replace(/\/$/, "");
const NAME_KEY = "drbena-jmeno";

export type BoardRow = { name: string; score: number; gossips: number };
export type Stats = { plays: number; board: BoardRow[] };

function rows(value: unknown): BoardRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row) => row && typeof row.score === "number")
    .slice(0, 10)
    .map((row) => ({
      name: String(row.name || "Drběna").slice(0, 16),
      score: row.score,
      gossips: typeof row.gossips === "number" ? row.gossips : 0,
    }));
}

export function savedName(): string {
  try {
    return localStorage.getItem(NAME_KEY)?.slice(0, 16) ?? "";
  } catch {
    return "";
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name.slice(0, 16));
  } catch {
    /* private mode */
  }
}

async function readStats(res: Response): Promise<Stats | null> {
  if (!res.ok) return null;
  const data = (await res.json()) as { plays?: unknown; board?: unknown };
  return {
    plays: typeof data.plays === "number" ? data.plays : 0,
    board: rows(data.board),
  };
}

function publish(stats: Stats) {
  window.dispatchEvent(new CustomEvent<Stats>("drbena-plays", { detail: stats }));
}

export async function fetchStats(): Promise<Stats | null> {
  if (!endpoint) return null;
  try {
    const res = await fetch(`${endpoint}/plays`);
    return await readStats(res);
  } catch {
    return null;
  }
}

export function reportLongPlay(seconds: number) {
  if (!endpoint || seconds < 20) return;
  void fetch(`${endpoint}/plays`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ seconds: Math.round(seconds) }),
    keepalive: true,
  })
    .then((res) => readStats(res))
    .then((stats) => {
      if (stats) publish(stats);
    })
    .catch(() => {});
}

export function submitScore(score: number, gossips: number) {
  if (!endpoint || score < 1) return;
  void fetch(`${endpoint}/score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ score, gossips, name: savedName() }),
    keepalive: true,
  })
    .then((res) => readStats(res))
    .then((stats) => {
      if (stats) publish(stats);
    })
    .catch(() => {});
}

export function playLabel(n: number): string {
  if (n <= 0) return "Zatím žádná hra netrvala déle než 20 vteřin.";
  const mod100 = n % 100;
  const mod10 = n % 10;
  const word = mod100 >= 11 && mod100 <= 14 ? "her" : mod10 === 1 ? "hra" : mod10 >= 2 && mod10 <= 4 ? "hry" : "her";
  const verb = word === "hra" ? "trvala" : word === "hry" ? "trvaly" : "trvalo";
  return `Už ${n} ${word} ${verb} déle než 20 vteřin.`;
}
