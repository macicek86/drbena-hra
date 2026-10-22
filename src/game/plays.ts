const endpoint = String((import.meta.env as Record<string, string | undefined>).VITE_PLAYS_URL ?? "").replace(/\/$/, "");

export async function fetchPlays(): Promise<number | null> {
  if (!endpoint) return null;
  try {
    const res = await fetch(`${endpoint}/plays`);
    if (!res.ok) return null;
    const data = (await res.json()) as { plays?: unknown };
    return typeof data.plays === "number" ? data.plays : null;
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
    .then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as { plays?: unknown };
      if (typeof data.plays === "number") {
        window.dispatchEvent(new CustomEvent("drbena-plays", { detail: data.plays }));
      }
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
