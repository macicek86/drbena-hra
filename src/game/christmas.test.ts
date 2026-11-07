import assert from "node:assert/strict";
import { test } from "node:test";
import { firstAdvent, inChristmasSeason } from "./christmas.ts";

const prague = (y: number, m: number, d: number, hh = 12) => new Date(Date.UTC(y, m - 1, d, hh - 1));

test("první advent sedí na známé roky", () => {
  assert.deepEqual(firstAdvent(2022), { y: 2022, m: 11, d: 27 });
  assert.deepEqual(firstAdvent(2023), { y: 2023, m: 12, d: 3 });
  assert.deepEqual(firstAdvent(2024), { y: 2024, m: 12, d: 1 });
  assert.deepEqual(firstAdvent(2026), { y: 2026, m: 11, d: 29 });
});

test("vánoce začínají až první adventní nedělí", () => {
  assert.equal(inChristmasSeason(prague(2026, 11, 28)), false);
  assert.equal(inChristmasSeason(prague(2026, 11, 29)), true);
  assert.equal(inChristmasSeason(prague(2024, 11, 30)), false);
  assert.equal(inChristmasSeason(prague(2024, 12, 1)), true);
  assert.equal(inChristmasSeason(prague(2023, 12, 2)), false);
  assert.equal(inChristmasSeason(prague(2023, 12, 3)), true);
});

test("vánoce drží přes Štědrý den až do Tří králů", () => {
  assert.equal(inChristmasSeason(prague(2026, 12, 24)), true);
  assert.equal(inChristmasSeason(prague(2027, 1, 1)), true);
  assert.equal(inChristmasSeason(prague(2027, 1, 6)), true);
  assert.equal(inChristmasSeason(prague(2027, 1, 7)), false);
  assert.equal(inChristmasSeason(prague(2026, 7, 15)), false);
});
