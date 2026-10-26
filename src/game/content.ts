export type RGB = [number, number, number];

export type BiomeId = "namesti" | "zamek" | "sklenik" | "park";
export type Landmark = "houses" | "castle" | "greenhouse" | "pond";

export type Biome = {
  id: BiomeId;
  name: string;
  skyTop: RGB;
  skyBot: RGB;
  hillFar: RGB;
  hill: RGB;
  grass: RGB;
  grassDark: RGB;
  path: RGB;
  pathDark: RGB;
  landmark: Landmark;
};

export const BIOMES: Biome[] = [
  {
    id: "namesti",
    name: "Náměstí",
    skyTop: [121, 199, 242],
    skyBot: [246, 226, 184],
    hillFar: [169, 201, 138],
    hill: [122, 176, 92],
    grass: [103, 168, 74],
    grassDark: [78, 140, 56],
    path: [196, 180, 150],
    pathDark: [168, 152, 120],
    landmark: "houses",
  },
  {
    id: "zamek",
    name: "Zámek",
    skyTop: [110, 180, 234],
    skyBot: [217, 240, 250],
    hillFar: [143, 176, 122],
    hill: [96, 150, 78],
    grass: [92, 154, 64],
    grassDark: [63, 122, 48],
    path: [226, 210, 174],
    pathDark: [196, 176, 132],
    landmark: "castle",
  },
  {
    id: "sklenik",
    name: "Palmový skleník",
    skyTop: [103, 192, 228],
    skyBot: [231, 246, 201],
    hillFar: [135, 181, 108],
    hill: [86, 154, 72],
    grass: [98, 162, 70],
    grassDark: [70, 133, 52],
    path: [215, 196, 160],
    pathDark: [176, 156, 118],
    landmark: "greenhouse",
  },
  {
    id: "park",
    name: "Zámecký park",
    skyTop: [126, 200, 238],
    skyBot: [229, 244, 212],
    hillFar: [121, 168, 120],
    hill: [74, 138, 82],
    grass: [79, 148, 68],
    grassDark: [55, 118, 52],
    path: [205, 184, 146],
    pathDark: [168, 146, 108],
    landmark: "pond",
  },
];

// Scény Kopidlna jsou blízko sebe, mezi místními částmi patří delší krajina.
export const CYCLE_LEN = 28000;
export const STAGE_OFFSETS = [0, 3200, 6400, 9600] as const;

export function stageStart(index: number): number {
  const cycle = Math.floor(index / 4);
  const part = ((index % 4) + 4) % 4;
  return cycle * CYCLE_LEN + STAGE_OFFSETS[part]!;
}

export function stageIndex(x: number): number {
  const cycle = Math.floor(x / CYCLE_LEN);
  const local = x - cycle * CYCLE_LEN;
  const part = local < STAGE_OFFSETS[1] ? 0
    : local < STAGE_OFFSETS[2] ? 1
    : local < STAGE_OFFSETS[3] ? 2 : 3;
  return cycle * 4 + part;
}

export type PlaceId = "namesti" | "skola" | "zamek" | "sklenik" | "park" | "mlynec" | "ledkov" | "drahoraz" | "pseves";

export function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

export function rgbCss(c: RGB): string {
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function biomeMix(camera: number): { biome: Biome; tint: Biome; t: number; name: string } {
  const i = stageIndex(camera);
  const a = BIOMES[((i % 4) + 4) % 4]!;
  const b = BIOMES[(((i + 1) % 4) + 4) % 4]!;
  const end = stageStart(i + 1);
  // Přechod barev má stejnou krátkou délku u všech etap, i v dlouhé krajině mezi vesnicemi.
  const fade = Math.min(900, (end - stageStart(i)) * 0.22);
  const t = Math.max(0, Math.min(1, (camera - (end - fade)) / fade));
  return { biome: a, tint: b, t, name: t > 0.55 ? b.name : a.name };
}
