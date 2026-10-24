import assert from "node:assert/strict";
import test from "node:test";
import { bonusAct, createOfferedMini, createUntangle, fishOffersMini, puzzleCount, puzzleSentence, type AnyBonus, type BonusState } from "./minigames.ts";

function untangle(state: AnyBonus | null | undefined): BonusState {
  if (!state || state.id !== "untangle") throw new Error("expected untangle");
  return state;
}

test("ryba u každého rybníka nabídne minihru a střídá obě", () => {
  assert.equal(fishOffersMini(() => 0), true);
  assert.equal(fishOffersMini(() => 0.99), true);
  const ids = [createOfferedMini(() => 0), createOfferedMini(() => 0)].map((game) => game.id);
  assert.deepEqual(ids, ["untangle", "alarm"]);
});

test("drby dávají složené věty a není jich míň než dvacet", () => {
  assert.equal(puzzleCount(), 20);
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

  let state = untangle(playing.state);
  const wrong = bonusAct(state, { type: "check" });
  assert.equal(wrong.state?.stage, "play");
  const missed = untangle(wrong.state);
  assert.ok(missed.wrong.length > 10);
  assert.equal(wrong.grant, 0);

  state = missed;
  const goal = [0, 1, 2];
  let guard = 0;
  while (!state.order.every((part, index) => part === goal[index]) && guard++ < 12) {
    const from = state.order.findIndex((part, index) => part !== index);
    const to = state.order.indexOf(from);
    state = untangle(bonusAct(state, { type: "pick", index: from }).state);
    state = untangle(bonusAct(state, { type: "pick", index: to }).state);
  }
  assert.deepEqual(state.order, goal);

  const solved = bonusAct(state, { type: "check" });
  assert.equal(solved.state?.stage, "done");
  assert.equal(solved.grant, 50);
  assert.equal(solved.resume, false);

  const again = bonusAct({ ...untangle(solved.state), stage: "play", rewarded: true, order: [0, 1, 2] }, { type: "check" });
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
