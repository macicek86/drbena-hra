import assert from "node:assert/strict";
import test from "node:test";
import { bonusAct, createUntangle, fishOffersMini, puzzleCount, puzzleSentence } from "./minigames.ts";

test("ryba nabízí minihru jen v polovině hodů", () => {
  assert.equal(fishOffersMini(() => 0), false);
  assert.equal(fishOffersMini(() => 0.49), false);
  assert.equal(fishOffersMini(() => 0.5), true);
  assert.equal(fishOffersMini(() => 0.99), true);
});

test("drby dávají složené věty a není jich míň než dvacet", () => {
  assert.ok(puzzleCount() >= 20);
  for (let i = 0; i < puzzleCount(); i += 1) {
    const sentence = puzzleSentence(i);
    assert.match(sentence, /[.!?]$/);
    assert.equal(sentence.includes("  "), false);
    assert.ok(sentence.length > 30);
  }
});

test("zamíchání nenechá větu v hotovém pořadí", () => {
  for (let i = 0; i < 40; i += 1) {
    const offer = createUntangle(Math.random, i % puzzleCount());
    assert.equal(
      offer.order.every((part, index) => part === index),
      false,
    );
  }
});

test("odmítnutí, chyba, oprava, odměna jednou a pokračování", () => {
  const offer = createUntangle(() => 0, 0);
  const declined = bonusAct(offer, { type: "decline" });
  assert.equal(declined.resume, true);
  assert.equal(declined.grant, 0);

  const playing = bonusAct(offer, { type: "play" });
  assert.equal(playing.resume, false);
  assert.equal(playing.state?.stage, "play");

  let state = playing.state!;
  const wrong = bonusAct(state, { type: "check" });
  assert.equal(wrong.state?.stage, "play");
  assert.equal(wrong.state?.wrong, true);
  assert.equal(wrong.grant, 0);

  state = wrong.state!;
  const goal = [0, 1, 2];
  let guard = 0;
  while (!state.order.every((part, index) => part === goal[index]) && guard++ < 12) {
    const from = state.order.findIndex((part, index) => part !== index);
    const to = state.order.indexOf(from);
    state = bonusAct(state, { type: "pick", index: from }).state!;
    state = bonusAct(state, { type: "pick", index: to }).state!;
  }
  assert.deepEqual(state.order, goal);

  const solved = bonusAct(state, { type: "check" });
  assert.equal(solved.state?.stage, "done");
  assert.equal(solved.grant, 50);
  assert.equal(solved.resume, false);

  const again = bonusAct({ ...solved.state!, stage: "play", rewarded: true, order: [0, 1, 2] }, { type: "check" });
  assert.equal(again.grant, 0);

  const next = bonusAct(solved.state!, { type: "continue" });
  assert.equal(next.resume, true);
  assert.equal(next.grant, 0);
});

test("přeskočení nedá body a vrátí běh", () => {
  const offer = createUntangle(() => 0, 1);
  const skipped = bonusAct(bonusAct(offer, { type: "play" }).state!, { type: "skip" });
  assert.equal(skipped.resume, true);
  assert.equal(skipped.grant, 0);
});
