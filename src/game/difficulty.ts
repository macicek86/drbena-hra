/**
 * Obtížnost hry na jednom místě. Hra je laskavá: neroste strmě hned na začátku, ale pomalu a dlouho,
 * má rytmus (klid ve městě a v obcích, rušnější úseky na cestách mezi obcemi) a po dvou nárazech
 * krátce za sebou dá hráči chvilku oddechu. Všechno se týká všech hráčů stejně, žebříček zůstává fér.
 *
 * „Kolo“ je jedna cesta Kopidlno → vesnice → zpět do Kopidlna (CYCLE_LEN v content.ts).
 */

/** Kolik z rozdílu mezi počáteční a plnou rychlostí je na konci kola: 1. kolo 72 %, 2. kolo 100 %. */
const SPEED_KNOTS: readonly [number, number][] = [
  [0, 0],
  [1, 0.72],
  [2, 1],
];
/** Od třetího kola hra přidává o 10 % za kolo, nejvýš o 40 % (od šestého kola). */
const SPEED_EXTRA_PER_LOOP = 0.1;
const SPEED_EXTRA_MAX = 0.4;
const SPEED_EXTRA_FROM = 2;

/**
 * Rychlejší rozjezd pro hráče, kteří už aspoň jednou došli na konec prvního kola: začnou na téhle
 * části rozjezdu místo od nuly, ať je začátek nenudí. Body to nepřidává, jen začátek trochu ztíží.
 */
export const WARM_START = 0.3;
/** Rekord, od kterého hráč dostane rychlejší rozjezd: konec prvního kola (CYCLE_LEN × 0,05 bodu). */
export const WARM_BEST = 1400;

/** Násobek plné rychlosti podle uběhnutých kol (může být i desetinné číslo). */
export function speedShape(loops: number, warm = false): { fraction: number; extra: number } {
  const p = Math.max(0, loops);
  let fraction = 1;
  for (let i = 1; i < SPEED_KNOTS.length; i += 1) {
    const [x1, y1] = SPEED_KNOTS[i]!;
    if (p <= x1) {
      const [x0, y0] = SPEED_KNOTS[i - 1]!;
      fraction = y0 + ((y1 - y0) * (p - x0)) / (x1 - x0);
      break;
    }
  }
  if (warm && p < 1) fraction = Math.max(fraction, WARM_START + (SPEED_KNOTS[1]![1] - WARM_START) * p);
  const extra = Math.min(SPEED_EXTRA_MAX, Math.max(0, p - SPEED_EXTRA_FROM) * SPEED_EXTRA_PER_LOOP);
  return { fraction, extra };
}

export type Zone = "mesto" | "obec" | "cesta" | "cesta-rusna";

/**
 * Část cesty mezi obcemi, kde je rušno: prostřední 60 % úseku. Začátek a konec cesty jsou klidné,
 * ať hráč na okraji obce stihne vidět ceduli a stavby.
 */
export function roadZone(x: number, from: number, to: number): Zone {
  const t = (x - from) / Math.max(1, to - from);
  return t > 0.2 && t < 0.8 ? "cesta-rusna" : "cesta";
}

/** Základní mezera mezi překážkami v sekundách běhu: v prvním kole po částech Kopidlna, pak po kolech. */
function baseGap(loop: number, part: number): number {
  if (loop <= 0) return [1.45, 1.32, 1.22, 1.14][Math.max(0, Math.min(3, part))]!;
  if (loop === 1) return 1.02;
  if (loop === 2) return 0.94;
  return 0.88;
}

const ZONE_GAP: Record<Zone, number> = {
  mesto: 1.08,
  obec: 1.1,
  cesta: 1,
  "cesta-rusna": 0.9,
};

/**
 * Nejkratší mezera od konce překážky k začátku další: koza je ve vzduchu 0,92 s, ale skok začíná
 * před překážkou a končí za ní, takže mezi dvěma stačí asi 0,8 s. Kousek rezervy na reakci.
 */
export const MIN_GAP = 0.86;

/** Mezera za překážkou v sekundách běhu (násobí se rychlostí). */
export function hazardGap(loop: number, part: number, zone: Zone): number {
  return Math.max(MIN_GAP, baseGap(loop, part) * ZONE_GAP[zone]);
}

/** Šance, že za překážkou hned přijde druhá (dvojice): hlavně v rušných úsecích cest a v dalších kolech. */
export function pairChance(loop: number, zone: Zone): number {
  if (zone === "cesta-rusna") return [0.12, 0.3, 0.42][loop] ?? 0.5;
  if (zone === "cesta") return [0, 0.15, 0.25][loop] ?? 0.3;
  if (zone === "obec") return 0;
  return [0, 0.08, 0.15, 0.2][loop] ?? 0.25;
}

/** Rozestup dvojice překážek v sekundách běhu: v dalších kolech jsou blíž u sebe. */
export function pairGap(loop: number): number {
  return [1.5, 1.4, 1.25][loop] ?? 1.1;
}

/** Volno za cyklistou v sekundách běhu (jede naproti, proto víc než za stojící překážkou). */
export function cyclistGap(loop: number): number {
  return [1.3, 1.2, 1.1][loop] ?? 1.0;
}

/** Volno za svitkem kroniky v sekundách běhu (od, do). */
export function scrollGap(loop: number): [number, number] {
  return loop <= 0 ? [0.7, 1.15] : loop === 1 ? [0.6, 0.95] : [0.5, 0.8];
}

/** Šance, že místo překážky přijde řada drbů. V dalších kolech je drbů míň a překážek víc. */
export function gossipChance(loop: number, part: number): number {
  if (loop <= 0) return part >= 2 ? 0.28 : part === 0 ? 0.24 : 0.22;
  return loop === 1 ? 0.22 : 0.17;
}

/** Mezera za řadou drbů v sekundách běhu. */
export function gossipGap(loop: number, part: number): number {
  if (loop <= 0) return part === 0 ? 0.7 : 0.55;
  return loop === 1 ? 0.5 : 0.42;
}

/** Chvilka oddechu: druhý náraz do této doby po prvním. */
export const MERCY_WINDOW = 12;
/** Jak dlouho oddech trvá a o kolik hra zpomalí (na začátku oddechu, pak plynule zpět). */
export const MERCY_SECONDS = 6;
export const MERCY_SLOW = 0.18;
/** Další oddech nejdřív po této době, ať se z něj nedá udělat trvalé zpomalení. */
export const MERCY_COOLDOWN = 25;

/** Zpomalení během oddechu: na začátku plné, ke konci plynule mizí. `left` je zbývající čas oddechu. */
export function mercySlow(left: number): number {
  if (left <= 0) return 1;
  const t = Math.min(1, left / MERCY_SECONDS);
  return 1 - MERCY_SLOW * t * t * (3 - 2 * t);
}

/** Zda druhý náraz spustí oddech. */
export function mercyDue(now: number, lastHit: number, cooldownUntil: number): boolean {
  return now - lastHit <= MERCY_WINDOW && now >= cooldownUntil;
}
