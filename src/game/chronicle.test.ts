import assert from "node:assert/strict";
import test from "node:test";
import { chronicleBookFrom, entryLine, nextFact, pageIds, parseFound } from "./chronicle.ts";

const LEGACY_IDS = [
  "urad",
  "infocentrum",
  "sousosi",
  "kostel",
  "hradby",
  "jmeno",
  "jicin",
  "medvedi",
  "stara-skola",
  "tvrz",
  "zahradnici",
  "pamatka",
  "viden",
  "palmy",
  "bazina",
  "anglicky",
  "stromy",
  "fik",
  "sluzka",
];

test("pergamen bere další stránku z místa a pak z další kapitoly", () => {
  assert.deepEqual(pageIds(), LEGACY_IDS);
  const first = nextFact("namesti", []);
  assert.equal(first?.id, "urad");
  const later = nextFact("namesti", ["urad", "infocentrum"]);
  assert.equal(later?.id, "sousosi");
  const school = nextFact("skola", ["stara-skola"]);
  assert.equal(school?.place, "zamek");
  const wrapped = nextFact("park", ["bazina", "anglicky", "stromy", "fik", "sluzka"]);
  assert.equal(wrapped?.place, "namesti");
  const afterCastle = nextFact("zamek", ["tvrz", "zahradnici", "pamatka"]);
  assert.equal(afterCastle?.place, "sklenik");
});

test("plná kronika už další stránku nemá", () => {
  assert.equal(nextFact("sklenik", LEGACY_IDS), null);
});

test("starý postup z localStorage zůstane a zamčená stránka neukáže text", () => {
  const found = parseFound(
    JSON.stringify({
      v: 1,
      found: { urad: "2026-10-25", sousosi: "2026-10-01", neznamy: "2026-01-01" },
    }),
  );
  assert.equal(found.urad, "2026-10-25");
  assert.equal(found.neznamy, "2026-01-01");
  const book = chronicleBookFrom(found);
  assert.equal(book.total, 19);
  assert.equal(book.known, 2);
  const square = book.chapters.find((chapter) => chapter.id === "namesti");
  const open = square?.pages.find((page) => page.id === "urad");
  const locked = square?.pages.find((page) => page.id === "kostel");
  assert.equal(open?.open, true);
  if (open?.open) {
    assert.equal(open.title, "Úřad na náměstí");
    assert.equal(open.page.intro.includes("Městský úřad"), true);
    assert.deepEqual(open.page.paragraphs, []);
  }
  assert.equal(locked?.open, false);
  assert.equal(locked && "title" in locked, false);
  assert.equal(locked && "page" in locked, false);
});

test("řádek po doběhu skloňuje zápisy", () => {
  assert.equal(entryLine(0), "Dnes nic nového");
  assert.equal(entryLine(1), "Do kroniky přibyl 1 zápis");
  assert.equal(entryLine(3), "Do kroniky přibyly 3 zápisy");
  assert.equal(entryLine(5), "Do kroniky přibylo 5 zápisů");
});
