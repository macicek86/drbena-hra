import assert from "node:assert/strict";
import test from "node:test";
import { entryLine, nextFact } from "./chronicle.ts";

test("pergamen bere další větu z místa a pak z další kapitoly", () => {
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

test("plná kronika už další větu nemá", () => {
  const all = [
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
  assert.equal(nextFact("sklenik", all), null);
});

test("řádek po doběhu skloňuje zápisy", () => {
  assert.equal(entryLine(0), "Dnes nic nového");
  assert.equal(entryLine(1), "Do kroniky přibyl 1 zápis");
  assert.equal(entryLine(3), "Do kroniky přibyly 3 zápisy");
  assert.equal(entryLine(5), "Do kroniky přibylo 5 zápisů");
});
