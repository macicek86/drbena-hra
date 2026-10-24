import assert from "node:assert/strict";
import test from "node:test";
import { alarmAct, alarmTap, createAlarm, judgeTap, tickAlarm } from "./goatAlarm.ts";

function ready(state: NonNullable<ReturnType<typeof alarmAct>["state"]>) {
  let grant = 0;
  let guard = 0;
  while (state.stage === "play" && state.pose !== "ready" && guard++ < 40) {
    const next = tickAlarm(state, 0.05);
    state = next.state;
    grant += next.grant;
  }
  return { state, grant };
}

test("zásah ve zlatém poli je dobrý nebo perfektní, mimo něj mine", () => {
  assert.equal(judgeTap(0.55, 0.4, 0.7), "perfect");
  assert.equal(judgeTap(0.42, 0.4, 0.7), "good");
  assert.equal(judgeTap(0.02, 0.4, 0.7), "miss");
});

test("ukazatel zůstává na liště a po zásahu zrychlí", () => {
  let state = alarmAct(createAlarm(() => 0.2), { type: "play" }).state!;
  for (let i = 0; i < 80; i += 1) state = tickAlarm(state, 0.05).state;
  assert.ok(state.pointer >= 0 && state.pointer <= 1);
  const speed = state.speed;
  state = { ...state, pose: "ready", poseT: 0, pointer: (state.zoneStart + state.zoneEnd) / 2 };
  const hit = alarmTap(state);
  assert.ok(hit.state.windows === 1);
  assert.ok(hit.state.speed > speed);
});

test("čtyři dobré zásahy dají odměnu jen jednou a minuté nic", () => {
  let state = alarmAct(createAlarm(() => 0.4), { type: "play" }).state!;
  state = { ...state, pointer: 0.02, zoneStart: 0.45, zoneEnd: 0.72, pose: "ready" };
  const missed = alarmTap(state);
  assert.equal(missed.state.windows, 0);
  assert.equal(missed.state.pose, "stumble");
  state = ready(missed.state).state;
  let grant = 0;
  for (let n = 0; n < 4; n += 1) {
    state = { ...state, pose: "ready", poseT: 0, pointer: (state.zoneStart + state.zoneEnd) / 2 };
    const settled = ready(alarmTap(state).state);
    state = settled.state;
    grant += settled.grant;
  }
  assert.equal(state.stage, "done");
  assert.equal(state.failed, false);
  assert.equal(grant, 50);
  const extra = tickAlarm(state, 0.2);
  assert.equal(extra.grant, 0);
});

test("po vypršení času není odměna a hru lze přeskočit", () => {
  let state = alarmAct(createAlarm(() => 0.1), { type: "play" }).state!;
  let guard = 0;
  while (state.stage === "play" && guard++ < 700) state = tickAlarm(state, 0.05).state;
  assert.equal(state.stage, "done");
  assert.equal(state.failed, true);
  assert.equal(tickAlarm(state, 0.2).grant, 0);
  const skipped = alarmAct(alarmAct(createAlarm(() => 0.3), { type: "play" }).state!, { type: "skip" });
  assert.equal(skipped.resume, true);
  assert.equal(skipped.grant, 0);
  const declined = alarmAct(createAlarm(() => 0.3), { type: "decline" });
  assert.equal(declined.resume, true);
});
