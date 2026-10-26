const endpoint = String((import.meta.env as Record<string, string | undefined>).VITE_PLAYS_URL ?? "").replace(/\/$/, "");
const NAME_KEY = "drbena-jmeno";
const PLAYER_KEY = "drbena-hrac";
const NAME_CONFIRMED_KEY = "drbena-jmeno-potvrzeno";

const ADJECTIVES = ["Zvědav", "Bystr", "Tajn", "Rychl", "Ušat", "Mlsn", "Všetečn", "Hbit", "Vesel", "Chytr", "Odvážn", "Nenápadn", "Upovídan", "Ospal"];
const FEMININE = ["Koza", "Kachna", "Sova", "Liška", "Veverka", "Kočka", "Slepice", "Husa", "Straka", "Myška"];
const MASCULINE = ["Holub", "Jelen", "Kapr", "Ježek", "Čáp", "Kohout", "Zajíc", "Bobr", "Kos", "Jezevec"];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** A playful Kopidlno-flavoured nickname such as "Zvědavá Koza", always at most 16 characters. */
export function randomName(): string {
  for (let i = 0; i < 20; i++) {
    const feminine = Math.random() < 0.5;
    const name = `${pick(ADJECTIVES)}${feminine ? "á" : "ý"} ${pick(feminine ? FEMININE : MASCULINE)}`;
    if (name.length <= 16) return name;
  }
  return "Zvědavá Koza";
}

export type BoardRow = { name: string; score: number; gossips: number };
export type Stats = { plays: number; players: number; board: BoardRow[] };

export const previewStats: Stats | null =
  import.meta.env.DEV && !endpoint
    ? {
        plays: 0,
        players: 12,
        board: [
          { name: "Drběna", score: 2480, gossips: 18 },
          { name: "Anička", score: 1960, gossips: 14 },
          { name: "Pepík", score: 1540, gossips: 9 },
          { name: "Bára", score: 1210, gossips: 7 },
          { name: "Honza", score: 860, gossips: 4 },
        ],
      }
    : null;

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

/** True until the player has picked (or accepted) a leaderboard name. Players who typed one earlier count as done. */
export function needsName(): boolean {
  try {
    return localStorage.getItem(NAME_CONFIRMED_KEY) !== "1" && !savedName().trim();
  } catch {
    return false;
  }
}

/** Store the chosen name; an empty choice gets a random nickname instead. Returns the stored name. */
export function confirmName(name: string): string {
  const chosen = name.trim().slice(0, 16) || randomName();
  saveName(chosen);
  try {
    localStorage.setItem(NAME_CONFIRMED_KEY, "1");
  } catch {
    /* private mode */
  }
  return chosen;
}

/** The name sent with a score: never empty, so the board is not full of identical defaults. */
function scoreName(): string {
  const name = savedName().trim();
  if (name) return name;
  const generated = randomName();
  saveName(generated);
  return generated;
}

async function readStats(res: Response): Promise<Stats | null> {
  if (!res.ok) return null;
  const data = (await res.json()) as { plays?: unknown; players?: unknown; board?: unknown };
  return {
    plays: typeof data.plays === "number" ? data.plays : 0,
    players: typeof data.players === "number" ? data.players : 0,
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

export function reportPlayer() {
  if (!endpoint) return;
  try {
    if (localStorage.getItem(PLAYER_KEY) === "1") return;
  } catch {
    return;
  }
  void fetch(`${endpoint}/player`, { method: "POST", keepalive: true })
    .then((res) => readStats(res))
    .then((stats) => {
      if (!stats) return;
      try {
        localStorage.setItem(PLAYER_KEY, "1");
      } catch {
        /* private mode */
      }
      publish(stats);
    })
    .catch(() => {});
}

export function submitScore(score: number, gossips: number) {
  if (!endpoint || score < 1) return;
  void fetch(`${endpoint}/score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ score, gossips, name: scoreName() }),
    keepalive: true,
  })
    .then((res) => readStats(res))
    .then((stats) => {
      if (stats) publish(stats);
    })
    .catch(() => {});
}

export function playerLabel(n: number): string {
  if (n <= 0) return "Zatím tu nehrál žádný hráč.";
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod10 === 1 && mod100 !== 11) return `Hrál ${n} hráč.`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `Hráli ${n} hráči.`;
  return `Hrálo ${n} hráčů.`;
}
