import { currentProfile, ensureProfile } from "@/game/profiles";

const endpoint = String((import.meta.env as Record<string, string | undefined>).VITE_PLAYS_URL ?? "").replace(/\/$/, "");
const PLAYER_KEY = "drbena-hrac";

// Nicknames moved to names.ts and players on the device to profiles.ts; kept here for older imports.
export { randomName } from "@/game/names";

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

/** True until this device has a player, so the first game asks for a nickname. */
export function needsName(): boolean {
  return !currentProfile();
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

/** A player renamed themselves on this device: the leaderboard shows the new nickname right away. */
export function announceName(player: { id: string; name: string }) {
  if (!endpoint) return;
  void fetch(`${endpoint}/name`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ player: player.id, name: player.name }),
    keepalive: true,
  })
    .then((res) => readStats(res))
    .then((stats) => {
      if (stats) publish(stats);
    })
    .catch(() => {});
}

export function submitScore(score: number, gossips: number, seconds: number) {
  if (!endpoint || score < 1) return;
  // Every score belongs to a player on this device (a random nickname if the name dialog was skipped).
  const player = ensureProfile();
  void fetch(`${endpoint}/score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ score, gossips, seconds: Math.round(seconds), name: player.name, player: player.id }),
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
