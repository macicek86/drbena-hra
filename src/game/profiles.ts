import { cleanNickname } from "./names.ts";

/**
 * Players on this device. Several people can share one phone: each player has an anonymous id (the newsroom
 * tells players apart by it), a nickname and a personal record. The Chronicle stays shared for the device.
 * Everything lives in localStorage; nothing about the player leaves the device except id, nickname and scores.
 */
export type Profile = { id: string; name: string; best: number; gossips: number };
export type Profiles = { current: string; list: Profile[] };

const KEY = "drbena-hraci-v1";
// Before profiles: one nickname, one id and one record per device (moved into the first player).
const LEGACY_NAME = "drbena-jmeno";
const LEGACY_ID = "drbena-kod-hrace";
const LEGACY_SAVE = "drbena-kopidlno-v1";

export const MAX_PROFILES = 8;

const ID = /^[a-z0-9-]{8,64}$/;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const whole = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0);

function parse(raw: string | null): Profiles | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { v?: number; current?: unknown; list?: unknown };
    if (data.v !== 1 || !Array.isArray(data.list)) return null;
    const list = data.list
      .filter((p): p is Profile => Boolean(p) && typeof p.id === "string" && ID.test(p.id) && typeof p.name === "string")
      .slice(0, MAX_PROFILES)
      .map((p) => ({ id: p.id, name: p.name.slice(0, 16), best: whole(p.best), gossips: whole(p.gossips) }));
    const current = list.some((p) => p.id === data.current) ? String(data.current) : (list[0]?.id ?? "");
    return { current, list };
  } catch {
    return null;
  }
}

function legacy(): Profiles {
  const name = (localStorage.getItem(LEGACY_NAME) ?? "").trim().slice(0, 16);
  let best = 0;
  let gossips = 0;
  try {
    const save = JSON.parse(localStorage.getItem(LEGACY_SAVE) ?? "{}") as { best?: number; gossips?: number };
    best = whole(save.best);
    gossips = whole(save.gossips);
  } catch {
    /* broken save */
  }
  // Nobody played or named themselves yet: start with no player, the first game asks for a nickname.
  if (!name && !best) return { current: "", list: [] };
  const storedId = localStorage.getItem(LEGACY_ID) ?? "";
  const id = ID.test(storedId) ? storedId : newId();
  return { current: id, list: [{ id, name: cleanNickname(name), best, gossips }] };
}

export function loadProfiles(): Profiles {
  try {
    return parse(localStorage.getItem(KEY)) ?? store(legacy());
  } catch {
    return { current: "", list: [] };
  }
}

function store(profiles: Profiles): Profiles {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, ...profiles }));
  } catch {
    /* private mode */
  }
  return profiles;
}

export function currentProfile(profiles = loadProfiles()): Profile | null {
  return profiles.list.find((p) => p.id === profiles.current) ?? null;
}

/** New player on this device, selected right away. */
export function addProfile(name: string): Profiles {
  const profiles = loadProfiles();
  if (profiles.list.length >= MAX_PROFILES) return profiles;
  const profile = { id: newId(), name: cleanNickname(name), best: 0, gossips: 0 };
  return store({ current: profile.id, list: [...profiles.list, profile] });
}

export function selectProfile(id: string): Profiles {
  const profiles = loadProfiles();
  return profiles.list.some((p) => p.id === id) ? store({ ...profiles, current: id }) : profiles;
}

/** Rename keeps the id, so the newsroom shows the player's earlier results under the new nickname. */
export function renameProfile(id: string, name: string): Profiles {
  const profiles = loadProfiles();
  return store({ ...profiles, list: profiles.list.map((p) => (p.id === id ? { ...p, name: cleanNickname(name) } : p)) });
}

/** Forget a player on this device. Their results stay in the leaderboard. */
export function removeProfile(id: string): Profiles {
  const profiles = loadProfiles();
  const list = profiles.list.filter((p) => p.id !== id);
  return store({ current: profiles.current === id ? (list[0]?.id ?? "") : profiles.current, list });
}

/** The player who is about to play; without one (name dialog skipped) a player with a random nickname. */
export function ensureProfile(): Profile {
  const existing = currentProfile();
  if (existing) return existing;
  return currentProfile(addProfile(""))!;
}

/** Store a finished game for the current player. Returns whether it beat their record. */
export function recordGame(score: number, gossips: number): boolean {
  const profiles = loadProfiles();
  const player = currentProfile(profiles);
  if (!player) return false;
  const newBest = score > player.best;
  store({
    ...profiles,
    list: profiles.list.map((p) => (p.id === player.id ? { ...p, best: Math.max(p.best, score), gossips: Math.max(p.gossips, gossips) } : p)),
  });
  return newBest;
}
