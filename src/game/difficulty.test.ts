import assert from "node:assert/strict";
import { test } from "node:test";
import { hazardGap, MIN_GAP, mercyDue, mercySlow, pairChance, roadZone, speedShape, WARM_START } from "./difficulty.ts";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≈ ${b}`);

test("rozjezd roste pomalu a dlouho", () => {
  assert.equal(speedShape(0).fraction, 0);
  close(speedShape(1).fraction, 0.7);
  close(speedShape(2).fraction, 0.88);
  assert.deepEqual(speedShape(3), { fraction: 1, extra: 0 });
  close(speedShape(5).extra, 0.1);
  close(speedShape(20).extra, 0.2);
});

test("zkušený hráč má rychlejší rozjezd jen v prvním kole", () => {
  close(speedShape(0, true).fraction, WARM_START);
  close(speedShape(1, true).fraction, 0.7);
  assert.deepEqual(speedShape(2, true), speedShape(2));
});

test("mezery se zkracují po kolech, nikdy pod nejkratší", () => {
  assert.ok(hazardGap(0, 0, "mesto") > hazardGap(1, 0, "mesto"));
  assert.ok(hazardGap(1, 0, "obec") > hazardGap(1, 0, "cesta-rusna"));
  assert.equal(hazardGap(9, 3, "cesta-rusna"), MIN_GAP);
});

test("rušno je uprostřed cesty a dvojice tam přibývají", () => {
  assert.equal(roadZone(10, 0, 100), "cesta");
  assert.equal(roadZone(50, 0, 100), "cesta-rusna");
  assert.equal(roadZone(90, 0, 100), "cesta");
  assert.equal(pairChance(0, "mesto"), 0);
  assert.ok(pairChance(1, "cesta-rusna") > pairChance(0, "cesta-rusna"));
  assert.equal(pairChance(6, "cesta-rusna"), 0.3);
});

test("oddech přijde po dvou nárazech krátce za sebou a ne hned znovu", () => {
  assert.equal(mercyDue(20, 10, 0), true);
  assert.equal(mercyDue(30, 10, 0), false);
  assert.equal(mercyDue(20, 15, 40), false);
  assert.equal(mercySlow(0), 1);
  close(mercySlow(6), 0.82);
  assert.ok(mercySlow(3) > 0.82);
});

