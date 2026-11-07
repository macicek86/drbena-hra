import { lerpRgb, type RGB } from "./content.ts";

export type ColorKey = "skyTop" | "skyBot" | "hillFar" | "hill" | "grass" | "grassDark" | "path" | "pathDark";

type Day = { y: number; m: number; d: number };

/** První adventní neděle: čtvrtá neděle před Štědrým dnem, tedy neděle 27. 11.–3. 12. */
export function firstAdvent(year: number): Day {
  const christmas = new Date(Date.UTC(year, 11, 25, 12));
  const dow = christmas.getUTCDay();
  const back = dow === 0 ? 7 : dow;
  const fourth = new Date(Date.UTC(year, 11, 25 - back, 12));
  const first = new Date(fourth);
  first.setUTCDate(fourth.getUTCDate() - 21);
  return { y: first.getUTCFullYear(), m: first.getUTCMonth() + 1, d: first.getUTCDate() };
}

function pragueDay(now: Date): Day {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const n = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { y: n("year"), m: n("month"), d: n("day") };
}

function stamp(day: Day): number {
  return day.y * 10000 + day.m * 100 + day.d;
}

/** Vánoční období v Česku: od 1. adventu včetně do 6. ledna (Tři králové) včetně. */
export function inChristmasSeason(now = new Date()): boolean {
  const day = pragueDay(now);
  if (day.m === 1) return day.d <= 6;
  if (day.m < 11) return false;
  return stamp(day) >= stamp(firstAdvent(day.y));
}

/**
 * Vánoční vzhled. V ostré hře jen v adventním okně.
 * V náhledu (dev) je zapnutý pořád, ať se dá ladit i před adventem.
 */
export function christmasLook(now = new Date()): boolean {
  if (import.meta.env.DEV) return true;
  return inChristmasSeason(now);
}

const WINTER: Record<ColorKey, { to: RGB; t: number }> = {
  skyTop: { to: [36, 68, 122], t: 0.82 },
  skyBot: { to: [214, 196, 208], t: 0.7 },
  hillFar: { to: [226, 234, 242], t: 0.86 },
  hill: { to: [186, 206, 220], t: 0.8 },
  grass: { to: [236, 242, 246], t: 0.9 },
  grassDark: { to: [198, 214, 224], t: 0.78 },
  path: { to: [232, 228, 220], t: 0.74 },
  pathDark: { to: [186, 198, 210], t: 0.62 },
};

export function winterTint(key: ColorKey, color: RGB): RGB {
  const mix = WINTER[key];
  return lerpRgb(color, mix.to, mix.t);
}
