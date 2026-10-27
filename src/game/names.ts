const ADJECTIVES = ["Zvědav", "Bystr", "Tajn", "Rychl", "Ušat", "Mlsn", "Všetečn", "Hbit", "Vesel", "Chytr", "Odvážn", "Nenápadn", "Upovídan", "Ospal"];
const FEMININE = ["Koza", "Kachna", "Sova", "Liška", "Veverka", "Kočka", "Slepice", "Husa", "Straka", "Myška"];
const MASCULINE = ["Holub", "Jelen", "Kapr", "Ježek", "Čáp", "Kohout", "Zajíc", "Bobr", "Kos", "Jezevec"];

export const NAME_MAX = 16;

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** A playful Kopidlno-flavoured nickname such as "Zvědavá Koza", always at most 16 characters. */
export function randomName(): string {
  for (let i = 0; i < 20; i++) {
    const feminine = Math.random() < 0.5;
    const name = `${pick(ADJECTIVES)}${feminine ? "á" : "ý"} ${pick(feminine ? FEMININE : MASCULINE)}`;
    if (name.length <= NAME_MAX) return name;
  }
  return "Zvědavá Koza";
}

/** Trimmed nickname; empty input gets a random one. */
export function cleanNickname(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, NAME_MAX) || randomName();
}
