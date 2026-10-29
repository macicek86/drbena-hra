import { loadProfiles } from "./profiles.ts";

/**
 * Postup hráče mimo kroniku: kolikrát potkal bílého jelena (kapitoly příběhu) a které erbové hádanky
 * u radnice už viděl. Patří hráči, ne zařízení: každý hráč má svůj pod `drbena-postup-v1:<id>`.
 */
export type Progress = { stagMeetings: number; erbSeen: string[] };

const KEY = "drbena-postup-v1";

function slot(): string {
  const { current } = loadProfiles();
  return current ? `${KEY}:${current}` : KEY;
}

export function loadProgress(): Progress {
  try {
    const data = JSON.parse(localStorage.getItem(slot()) ?? "{}") as Partial<Progress>;
    const meetings = typeof data.stagMeetings === "number" && Number.isFinite(data.stagMeetings) ? Math.max(0, Math.floor(data.stagMeetings)) : 0;
    const seen = Array.isArray(data.erbSeen) ? data.erbSeen.filter((id): id is string => typeof id === "string").slice(0, 200) : [];
    return { stagMeetings: meetings, erbSeen: seen };
  } catch {
    return { stagMeetings: 0, erbSeen: [] };
  }
}

export function saveProgress(progress: Progress) {
  try {
    localStorage.setItem(slot(), JSON.stringify(progress));
  } catch {
    /* private mode */
  }
}
