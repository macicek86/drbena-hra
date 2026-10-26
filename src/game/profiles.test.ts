import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

const memory = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => (memory.has(key) ? memory.get(key)! : null),
    setItem: (key: string, value: string) => void memory.set(key, String(value)),
    removeItem: (key: string) => void memory.delete(key),
  },
});

const { addProfile, currentProfile, ensureProfile, loadProfiles, recordGame, removeProfile, renameProfile, selectProfile } = await import("./profiles.ts");

beforeEach(() => memory.clear());

test("nový telefon nemá hráče, první hra se zeptá na přezdívku", () => {
  assert.deepEqual(loadProfiles(), { current: "", list: [] });
  assert.equal(currentProfile(), null);
});

test("dosavadní přezdívka, kód a rekord se přenesou do prvního hráče", () => {
  memory.set("drbena-jmeno", "Jarda");
  memory.set("drbena-kod-hrace", "aaaaaaaa-1111-4111-8111-111111111111");
  memory.set("drbena-kopidlno-v1", JSON.stringify({ v: 1, best: 1540, gossips: 9, mute: true }));
  const player = currentProfile();
  assert.deepEqual(player, { id: "aaaaaaaa-1111-4111-8111-111111111111", name: "Jarda", best: 1540, gossips: 9 });
});

test("rekord bez přezdívky dostane náhodnou přezdívku, ať o něj hráč nepřijde", () => {
  memory.set("drbena-kopidlno-v1", JSON.stringify({ v: 1, best: 300, gossips: 2 }));
  const player = currentProfile();
  assert.equal(player?.best, 300);
  assert.ok(player && player.name.length > 0 && player.name.length <= 16);
});

test("dva hráči na jednom zařízení mají každý svůj kód a rekord", () => {
  addProfile("Jarda");
  assert.equal(recordGame(900, 6), true);
  const jarda = currentProfile()!;
  addProfile("Bára");
  assert.equal(currentProfile()!.best, 0);
  assert.equal(recordGame(500, 3), true);
  assert.equal(recordGame(400, 9), false);
  const bara = currentProfile()!;
  assert.notEqual(jarda.id, bara.id);
  assert.deepEqual([bara.best, bara.gossips], [500, 9]);
  selectProfile(jarda.id);
  assert.deepEqual([currentProfile()!.name, currentProfile()!.best], ["Jarda", 900]);
});

test("přejmenování nechá kód, odebrání vybere jiného hráče", () => {
  addProfile("Jarda");
  const id = currentProfile()!.id;
  addProfile("Bára");
  renameProfile(id, "  Jarda   Novák ");
  assert.equal(loadProfiles().list.find((p) => p.id === id)?.name, "Jarda Novák");
  removeProfile(currentProfile()!.id);
  assert.equal(currentProfile()!.id, id);
});

test("bez hráče se pro výsledek založí hráč s náhodnou přezdívkou", () => {
  const player = ensureProfile();
  assert.ok(player.name);
  assert.equal(ensureProfile().id, player.id);
});
