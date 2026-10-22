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

export const BIOME_LEN = 2700;

export type PlaceId = "namesti" | "skola" | "zamek" | "sklenik" | "park";

export const FACTS: { title: string; text: string; place: PlaceId }[] = [
  {
    title: "Úřad na náměstí",
    text: "Městský úřad stojí na kopidlnském náměstí, v řadě domů nad cestou.",
    place: "namesti",
  },
  {
    title: "Informační centrum",
    text: "Turistické informační centrum je hned na začátku, těsně před městským úřadem. Je zhruba o polovinu nižší.",
    place: "namesti",
  },
  {
    title: "Mariánské sousoší",
    text: "Sousoší stojí na náměstí kousek dál od úřadu. Drběna ho mine dřív, než doběhne ke kostelu.",
    place: "namesti",
  },
  {
    title: "Kostel na náměstí",
    text: "Kostel s věží a hodinami je pořád ještě na náměstí, až za sousoším.",
    place: "namesti",
  },
  {
    title: "Město bez hradeb",
    text: "Městská práva získalo Kopidlno roku 1514. Místo hradeb spoléhalo na bažiny a okolní krajinu.",
    place: "namesti",
  },
  {
    title: "Odkud je jméno",
    text: "Jméno Kopidlno se tradicí váže k léčivé bylině zvané kopidlo. Jiná pověst ho odvozuje od kopí.",
    place: "namesti",
  },
  {
    title: "Kousek od Jičína",
    text: "Město leží asi 13 kilometrů jihozápadně od Jičína a žije v něm zhruba 2 200 lidí. Kousek je to i do Rumcajsova kraje.",
    place: "namesti",
  },
  {
    title: "Medvědí dědeček",
    text: "Kopidlno znají i diváci večerníčku Pojďte pane, budeme si hrát. Prý tu bydlel dědeček medvídků.",
    place: "namesti",
  },
  {
    title: "Stará škola",
    text: "Za kostelem, už mimo náměstí, stojí stará škola a bývalé muzeum. Dnes je z ní komunitní a vzdělávací centrum.",
    place: "skola",
  },
  {
    title: "Z tvrze zámek",
    text: "Zámek Kopidlno stojí na místě středověké vodní tvrze. První známý pán, Petr z Kopidlna, je v pramenech k roku 1322.",
    place: "zamek",
  },
  {
    title: "Škola v zámku",
    text: "Od roku 1948 sídlí v zámku zahradnická škola. Vzácné dřeviny v parku mají na starosti její studenti a učitelé.",
    place: "zamek",
  },
  {
    title: "Kdo zámek hlídá",
    text: "Zámek je kulturní památkou od roku 1958. Patří Královéhradeckému kraji a park za ním je otevřený na procházku.",
    place: "zamek",
  },
  {
    title: "Skleník jako z Vídně",
    text: "Palmový skleník v zámeckém parku stavěli v letech 1893–1894 podle návrhu Josefa Podhajského. Je to zmenšenina slavného skleníku v schönbrunnském parku.",
    place: "sklenik",
  },
  {
    title: "Palmy do nebe",
    text: "Uprostřed skleníku rostou palmy vysoké kolem deseti metrů. Skleněná kopule i dnes patří k technickým památkám, které se dají navštívit.",
    place: "sklenik",
  },
  {
    title: "Rybník z bažiny",
    text: "Zámecký rybník vznikl v polovině 16. století tam, kde dřív byla bažina. Leží v parku až za zámkem a skleníkem.",
    place: "park",
  },
  {
    title: "Anglický park",
    text: "Kolem zámku je přírodně krajinářský park o ploše asi 7,7 hektaru. Dnešní podoba pochází z úprav na konci 19. století.",
    place: "park",
  },
  {
    title: "Stoleté stromy",
    text: "V parku rostou metasekvoje čínská, tisovec dvouřadý nebo dub velkoplodý. Řada stromů pamatuje stejnou dobu jako skleník.",
    place: "park",
  },
  {
    title: "Fíkovna a oranžérie",
    text: "V parku kdysi stály i fíkovna a oranžérie. Dnes parku vévodí palmový skleník.",
    place: "park",
  },
  {
    title: "Socha služky",
    text: "V zámeckém parku připomíná místní pověst takzvaná socha služky. Drbů je tu víc než záhonů.",
    place: "park",
  },
];

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
  const f = camera / BIOME_LEN;
  const i = Math.floor(f);
  const frac = f - i;
  const a = BIOMES[((i % 4) + 4) % 4]!;
  const b = BIOMES[(((i + 1) % 4) + 4) % 4]!;
  const t = frac < 0.78 ? 0 : (frac - 0.78) / 0.22;
  return { biome: a, tint: b, t, name: t > 0.55 ? b.name : a.name };
}
