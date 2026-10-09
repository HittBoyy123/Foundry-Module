import test from "node:test";
import assert from "node:assert/strict";
import { MODULE_ID } from "../scripts/constants.js";
import { masterstrokeActionSource, syncMasterstrokeActions } from "../scripts/masterstroke-actions.js";
import { masterstrokeReady, usageKey } from "../scripts/masterstroke-rules.js";
function setup(result = 7, category = "weapon") {
 const gm = { id: "gm", isGM: true, active: true };
 globalThis.game = { user: gm, users: [gm], time: { worldTime: 0 }, settings: { get: () => 0 }, combat: { id: "combat", started: true, round: 1, turn: 0 } };
 const actor = { uuid: "Actor.owner", type: "character", isOwner: true, items: [] };
 const item = { id: "weapon", name: "Sword", actor, isEquipped: true, system: {}, flags: { [MODULE_ID]: { crafting: { masterstrokes: [{ id: "stroke", edition: "chad", category, result }] } } } };
 actor.items.push(item);
 actor.createEmbeddedDocuments = async (_type, sources) => { actor.items.push(...sources.map((s, i) => ({ ...s, id: `action${i}` }))); };
 actor.updateEmbeddedDocuments = async (_type, changes) => { for (const patch of changes) Object.assign(actor.items.find(i => i.id === patch._id), patch); };
 actor.deleteEmbeddedDocuments = async (_type, ids) => { actor.items = actor.items.filter(i => !ids.includes(i.id)); };
 return { actor, item, state: item.flags[MODULE_ID].crafting };
}
test("chosen actions arm without spending and expire on period or owner change", () => {
 const { item, state } = setup();
 assert.equal(masterstrokeReady(item), false);
 assert.equal(masterstrokeActionSource(item).system.actionType.value, "free");
 state.masterstrokeArmed = { instanceId: "stroke", actorUuid: item.actor.uuid, key: usageKey("day") };
 assert.equal(masterstrokeReady(item), true);
 assert.match(masterstrokeActionSource(item).system.description.value, /Armed/);
 assert.ok(!masterstrokeActionSource(item).name.includes("Sword"));
 assert.match(masterstrokeActionSource(item).system.description.value, /<strong>Frequency<\/strong> once per day/);
 assert.match(masterstrokeActionSource(item).system.description.value, /before rolling a Strike/);
 state.masterstrokeUses = { day: usageKey("day") };
 assert.equal(masterstrokeActionSource(item).system.frequency.value, 0);
 game.time.worldTime = 86400;
 assert.ok(masterstrokeActionSource(item));
 assert.equal(masterstrokeReady(item), false);
 state.masterstrokeArmed.key = usageKey("day");
 item.actor = { uuid: "Actor.other" };
 assert.equal(masterstrokeReady(item), false);
});
test("passive and mixed benefits remain automatic and visible appropriately", () => {
 const { item } = setup(1);
 assert.equal(masterstrokeActionSource(item).system.actionType.value, "passive");
 assert.equal(masterstrokeReady(item), true);
 const mixed = setup(4, "equipment");
 mixed.state.masterstrokeUses = { encounter: usageKey("encounter") };
 assert.equal(masterstrokeActionSource(mixed.item).system.actionType.value, "free");
 assert.match(masterstrokeActionSource(mixed.item).system.description.value, /passive benefit remains/);
 item.isEquipped = false;
 assert.equal(masterstrokeActionSource(item), null);
});
test("granted actions synchronize without duplicates and remain visible when spent and disappear on unequipping", async () => {
 const { item, actor, state } = setup();
 await syncMasterstrokeActions(actor); await syncMasterstrokeActions(actor);
 assert.equal(actor.items.length, 2);
 state.masterstrokeUses = { day: usageKey("day") };
 await syncMasterstrokeActions(actor); assert.equal(actor.items.length, 2);
 assert.equal(actor.items[1].system.frequency.value, 0);
 game.time.worldTime = 86400;
 await syncMasterstrokeActions(actor); assert.equal(actor.items.length, 2);
 item.isEquipped = false;
 await syncMasterstrokeActions(actor); assert.equal(actor.items.length, 1);
 assert.equal(state.masterstrokeUses.day, "day-0");
});

test("native frequency field order and prepared descriptions do not cause repeated writes", async () => {
 const { actor } = setup();
 await syncMasterstrokeActions(actor);
 const action = actor.items[1];
 action.system.frequency = { per: "day", value: 1, max: 1 };
 action._source = structuredClone(action);
 action.system.description.value += "<p>Prepared native addendum</p>";
 let writes = 0;
 actor.updateEmbeddedDocuments = async () => { writes++; };
 for (let i = 0; i < 5; i++) await syncMasterstrokeActions(actor);
 assert.equal(writes, 0);
});

test("all sixteen current Masterstrokes share the default action description format", async () => {
 for (const category of ["weapon", "equipment"]) for (let result = 1; result <= 8; result++) {
  const { item, actor, state } = setup(result, category);
  const source = masterstrokeActionSource(item);
  assert.ok(source);
  assert.ok(!source.name.includes(item.name));
  assert.match(source.system.description.value, /<strong>Requirements<\/strong>/);
  assert.match(source.system.description.value, /<strong>Effect<\/strong>/);
  assert.ok(!source.system.description.value.includes(" · Sword"));
  await syncMasterstrokeActions(actor);
  actor.items[1].name = "Old format — Sword";
  actor.items[1].system.description.value = "Legacy description";
  await syncMasterstrokeActions(actor);
  assert.equal(actor.items[1].name, source.name);
  assert.equal(actor.items[1].system.description.value, source.system.description.value);
  assert.equal(state.masterstrokes[0].result, result);
 }
});
