/** Public file URL. On GitHub Pages the site lives under `/repo/`, so bare `/game/...` would 404. */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}${path.replace(/^\//, "")}`;
}
