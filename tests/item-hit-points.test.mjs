import test from "node:test";
import assert from "node:assert/strict";
import { MODULE_ID, cloneDefaultRulesConfig } from "../scripts/constants.js";
import { applyPreparedItemPresentation, registerPreparedItemHooks } from "../scripts/integration.js";
import { preserveItemHitPointUpdate } from "../scripts/item-hit-points.js";
import { normalizeItemFlags } from "../scripts/model.js";
const config = cloneDefaultRulesConfig();
function shield({ value = 20, marks = [], mode, type = "shield" } = {}) {
  const item = { type, id: "shield", name: "Steel Shield",
    _source: { name: "Steel Shield", system: { category: "shield", hardness: 5, hp: { value, max: 20, brokenThreshold: 10 },
      traits: { rarity: "common" }, price: { value: {} }, runes: { reinforcing: 0 } },
      flags: { [MODULE_ID]: { material: "metal", tier: 3, crafting: { core: { materialId: "metal", tier: 3 }, artisanMarks: marks,
        ...(mode ? { hpValueMode: mode } : {}) } } } } };
  prepare(item);
  return item;
}
function prepare(item, clampNative = false) {
  item.system = structuredClone(item._source.system);
  item.flags = structuredClone(item._source.flags);
  if (clampNative) item.system.hp.value = Math.min(item.system.hp.value, item.system.hp.max);
  applyPreparedItemPresentation(item, config);
}
function persistHP(item, value, flattened = false) {
  const changes = flattened ? { "system.hp.value": value } : { system: { hp: { value } } };
  assert.equal(preserveItemHitPointUpdate(item, changes), true);
  item._source.system.hp.value = value;
  item._source.flags[MODULE_ID].crafting.hpValueMode = changes.flags[MODULE_ID].crafting.hpValueMode;
  prepare(item);
}
test("Shield Block full and half damage persist after hardness and repeated data preparation", () => {
  for (const multiplier of [1, 0.5]) {
    const item = shield();
    assert.equal(item.system.hp.max, 80);
    assert.equal(item.system.hp.value, 80);
    assert.equal(item.system.hardness, 11);
    const blockedDamage = Math.max(0, Math.floor(50 * multiplier) - item.system.hardness);
    const remaining = 80 - blockedDamage;
    persistHP(item, remaining);
    for (let refresh = 0; refresh < 3; refresh++) prepare(item);
    assert.equal(item.system.hp.value, remaining);
    assert.equal(item.system.hp.max, 80);
    assert.equal(item.system.hp.brokenThreshold, 40);
    assert.equal(item.system.hardness, 11);
    assert.equal(item._source.system.hp.max, 20);
  }
});
test("shield HP can cross its broken threshold and reach zero without gaining bonus HP again", () => {
  const item = shield();
  for (const value of [40, 20, 1, 0]) {
    persistHP(item, value);
    prepare(item);
    assert.equal(item.system.hp.value, value);
    assert.ok(item.system.hp.value <= item.system.hp.brokenThreshold);
  }
  persistHP(item, 15, true);
  assert.equal(item.system.hp.value, 15);
  persistHP(item, 80);
  assert.equal(item.system.hp.value, 80);
});
test("Core and Artisan Mark HP bonuses use one saved current-HP value", () => {
  const item = shield({ marks: [{ definitionId: "blacksmithing-universal-fortified-frame", status: "completed" }] });
  const { max } = item.system.hp;
  const hardness = item.system.hardness;
  assert.ok(max > 80);
  persistHP(item, max - 13);
  assert.equal(item.system.hp.value, max - 13);
  assert.equal(item.system.hp.max, max);
  persistHP(item, 7);
  assert.equal(item.system.hp.value, 7);
  assert.equal(item.system.hardness, hardness);
  assert.equal(item.system.hp.brokenThreshold, Math.floor(max / 2));
});
test("old full shields initialize at full durability; zero and saved values above base max are not inflated", () => {
  assert.equal(shield().system.hp.value, 80);
  assert.equal(shield({ value: 0 }).system.hp.value, 0);
  assert.equal(shield({ value: 61 }).system.hp.value, 61);
  assert.equal(shield({ value: 10, mode: "absolute" }).system.hp.value, 10);
  assert.equal(shield({ type: "armor" }).system.hp.value, 80);
});
test("unowned-item base clamping does not erase saved HP, and flags survive material editing", () => {
  const item = shield();
  persistHP(item, 65);
  prepare(item, true);
  assert.equal(item.system.hp.value, 65);
  const flags = normalizeItemFlags(item.flags[MODULE_ID], config);
  assert.equal(flags.crafting.hpValueMode, "absolute");
});
test("unrelated changes and ordinary unmodified shields are not rewritten", () => {
  const item = shield();
  assert.equal(preserveItemHitPointUpdate(item, { name: "New name" }), false);
  const plain = { system: { hp: { value: 20, max: 20 } }, flags: {} };
  const change = { system: { hp: { value: 12 } } };
  assert.equal(preserveItemHitPointUpdate(plain, change), false);
  assert.deepEqual(change, { system: { hp: { value: 12 } } });
});
test("Foundry pre-update hook marks HP writes without vetoing unrelated updates", () => {
  const hooks = {};
  globalThis.Hooks = { on(name, callback) { (hooks[name] ??= []).push(callback); } };
  registerPreparedItemHooks(() => config);
  const item = shield();
  const changes = { system: { hp: { value: 30 } } };
  for (const hook of hooks.preUpdateItem) assert.notEqual(hook(item, changes, {}), false);
  assert.equal(changes.flags[MODULE_ID].crafting.hpValueMode, "absolute");
  for (const hook of hooks.preUpdateItem) assert.notEqual(hook(item, { name: "New name" }, {}), false);
});
