import test from "node:test";
import assert from "node:assert/strict";
import { MODULE_ID } from "../scripts/constants.js";
import { activateTimedMark } from "../scripts/mark-activation-runtime.js";
import { activationFrequency, activationPeriodKey } from "../scripts/mark-activation-effects.js";
const id = "blacksmithing-specialty-1-hellfire-channel";
function fixture() {
  const actor = { uuid: "Actor.test", type: "character", isOwner: true, items: [],
    async createEmbeddedDocuments(_type, sources) { this.items.push(...sources); return sources; } };
  const item = { id: "weapon", actor, name: "Test Sword", type: "weapon", isEquipped: true, system: { quantity: 1 },
    flags: { [MODULE_ID]: { tier: 4, crafting: { artisanMarks: [{ definitionId: id, status: "completed" }] }, markUses: {} } },
    async update(changes) { this.flags[MODULE_ID].markUses[id] = changes[`flags.${MODULE_ID}.markUses.${id}`]; } };
  return { actor, item, context: { user: {}, worldTime: 500, combat: { id: "encounter", started: true, round: 1 } } };
}
test("timed activation applies tier dice and records its spent encounter use", async () => {
  const { item, actor, context } = fixture();
  await activateTimedMark(item, id, context);
  assert.equal(actor.items[0].system.rules[0].diceNumber, 4);
  assert.equal(actor.items[0].system.duration.value, 1);
  assert.equal(item.flags[MODULE_ID].markUses[id].count, 1);
  await assert.rejects(activateTimedMark(item, id, context), /no uses/);
});
test("failed effect creation refunds the use; stowed items cannot activate", async () => {
  const { item, actor, context } = fixture();
  actor.createEmbeddedDocuments = async () => { throw new Error("write failed"); };
  await assert.rejects(activateTimedMark(item, id, context), /write failed/);
  assert.equal(item.flags[MODULE_ID].markUses[id], null);
  item.isEquipped = false;
  await assert.rejects(activateTimedMark(item, id, context), /Wield or wear/);
});
test("frequency keys do not refresh daily uses at midnight or permit encounter uses outside combat", () => {
  const daily = activationFrequency("Two actions, once per day.");
  assert.equal(activationPeriodKey(daily, { worldTime: 0 }), activationPeriodKey(daily, { worldTime: 999999 }));
  assert.throws(() => activationPeriodKey(activationFrequency("Once per encounter"), { worldTime: 0 }), /Start an encounter/);
});
