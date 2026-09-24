import test from "node:test";
import assert from "node:assert/strict";
import { equipmentSlot, visibleEquipment, equipPanelItem, equipmentMarkup, injectEquipmentPanel, registerEquipmentPanel, refreshEquipmentPreview } from "../scripts/equipment-panel.js";
import { MODULE_ID } from "../scripts/constants.js";

test("equipment classification follows usage and physical item types", () => {
  assert.equal(equipmentSlot({ type: "armor" }), "body");
  assert.equal(equipmentSlot({ type: "backpack" }), "pack");
  assert.equal(equipmentSlot({ type: "equipment", system: { usage: { type: "worn", where: "boots" } } }), "feet");
  assert.equal(equipmentSlot({ type: "feat", name: "Wings" }), null);
});
test("equipment display tracks native carrying, containers, slots, and preview removal", () => {
  const make = (id, equipped, extras = {}) => ({ id, type: "equipment", system: { equipped, ...extras } });
  const items = [make("worn", { carryType: "worn" }), make("held", { carryType: "held", handsHeld: 1 }), make("bag", { carryType: "worn" }, { containerId: "bag" }), make("off", { carryType: "worn", inSlot: false }, { usage: { where: "boots" } }), make("dropped", { carryType: "dropped" })];
  assert.deepEqual(visibleEquipment({ items }).map(i => i.id), ["worn", "held"]);
  items[0].flags = { [MODULE_ID]: { equipmentPanel: { carried: true } } };
  assert.deepEqual(visibleEquipment({ items }).map(i => i.id), ["held"]);
});
test("equipping uses native carry API, retains ownership, rejects mismatches and supports two hands", async () => {
  globalThis.game = { settings: { get: () => true } };
  const calls = [];
  const actor = { uuid: "Actor.a", isOwner: true, changeCarryType: async (_item, data) => calls.push(data) };
  const item = { parent: actor, type: "weapon", system: { usage: { type: "held", hands: 2 } }, update: async data => calls.push(data) };
  await equipPanelItem(actor, item, "held");
  assert.deepEqual(calls[0], { carryType: "held", handsHeld: 2, inSlot: true });
  await assert.rejects(() => equipPanelItem(actor, item, "feet"), /belongs/);
  await assert.rejects(() => equipPanelItem({ ...actor, uuid: "Actor.b" }, item, "held"), /inventory/);
  await equipPanelItem(actor, item, null, { remove: true });
  assert.deepEqual(calls[2], { carryType: "worn", handsHeld: 0, inSlot: false });
  assert.equal(calls[3][`flags.${MODULE_ID}.equipmentPanel`].carried, true);
});
test("read-only panel escapes item names and omits equip controls", () => {
  const html = equipmentMarkup({ isOwner: false, items: [{ id: "a", name: "<script>", type: "armor", system: { equipped: { carryType: "worn" } } }] });
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("data-equipment-choose="));
});


test("experimental switch is GM-controlled, world-wide and off by default", async () => {
  let setting;
  globalThis.game = { settings: { register: (_module, key, options) => { assert.equal(key, "equipmentPanel"); setting = options; }, get: () => false } };
  globalThis.Hooks = { on: () => {} };
  registerEquipmentPanel();
  assert.equal(setting.scope, "world");
  assert.equal(setting.restricted, true);
  assert.equal(setting.default, false);
  assert.equal(setting.onChange, refreshEquipmentPreview);
  await assert.rejects(() => equipPanelItem({}, {}, "head"), /disabled/);
  let removed = 0;
  globalThis.document = { querySelectorAll: () => [{ remove: () => removed++ }] };
  await setting.onChange(false);
  assert.equal(removed, 1);
});


test("multiple worn rings appear together and obsolete wing placements fall back to usage", () => {
  const rings = ["Ruby ring", "Silver ring"].map((name, index) => ({ id: String(index), name, type: "equipment", system: { usage: { where: "ring" }, equipped: { carryType: "worn", inSlot: true } } }));
  rings[0].flags = { [MODULE_ID]: { equipmentPanel: { slot: "wings" } } };
  assert.equal(equipmentSlot(rings[0]), "rings");
  const html = equipmentMarkup({ items: rings, isOwner: true });
  const ringSection = html.split('data-equipment-slot="rings"')[1].split('</section>')[0];
  assert.ok(ringSection.includes("Ruby ring"));
  assert.ok(ringSection.includes("Silver ring"));
  assert.ok(html.includes("Worn rings"));
  assert.ok(!html.includes("Worn wings"));
});


test("party sheets remove the preview rather than exposing member equipment", () => {
 let removed = false;
 const root = { querySelector: selector => { assert.equal(selector, ".cmt-equipment-panel"); return { remove: () => { removed = true; } }; } };
 injectEquipmentPanel({ actor: { type: "party" } }, root);
 assert.equal(removed, true);
});
