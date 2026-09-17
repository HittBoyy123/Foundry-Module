import { upgradeSnapshot } from "../scripts/upgrades.js";
import test from "node:test";
import assert from "node:assert/strict";
import { rollWorkBlock } from "../scripts/workbench.js";
import { createCraftingProject } from "../scripts/crafting-projects.js";
import { buildCraftingRecipeFromBand } from "../scripts/recipe-catalog.js";
import { MODULE_ID, cloneDefaultRulesConfig } from "../scripts/constants.js";
const config = cloneDefaultRulesConfig(); config.crafting.workbenchEnabled = true;
const base = { documentName: "Item", uuid: "Item.base", name: "Sword", type: "weapon", system: { category: "martial" } };
function setup({ degree = 3, dice = [3], required = 20, bonus = 0, upgrade = false, cancel = false, failSave = false } = {}) {
  const entry = createCraftingProject({ id: "project", recipe: buildCraftingRecipeFromBand("weapon-sword", { targetItem: base, tier: 2 }),
    requiredProgress: required, leadArtisanUuid: "Actor.maker", leadArtisanName: "Maker", baseItemUuid: base.uuid,
    coreMaterialId: "metal", coreTier: 2, upgrade: upgrade ? { replaced: [] } : null });
  entry.status = "reserved"; entry.nextWorkBonus = bonus;
  entry.reservations = [{ id: "stock", groupId: "core", materialId: "metal", tier: 2, quantity: 4, units: 4, itemName: "Steel" }];
  let saved = { projects: [entry] };
  const messages = [], rendered = [], formulas = [], rollCalls = [];
  const party = { id: "party", name: "Party", type: "party", items: [], canUserModify: () => true,
    getFlag: () => saved, async setFlag(_id, _key, data) { if (failSave) throw new Error("save failed"); saved = data; } };
  const artisan = { uuid: "Actor.maker", name: "Maker", items: [],
    getStatistic: () => ({ label: "Crafting", async roll(args) { rollCalls.push(args); return cancel ? null : { degreeOfSuccess: degree, total: 30 }; } }) };
  const item = { ...base, flags: { [MODULE_ID]: { crafting: { masterstrokes: [{ id: "channel", result: 3, used: false }] } } },
    toObject() { return { ...base, flags: structuredClone(this.flags) }; },
    async update(data) { this.flags[MODULE_ID].crafting.masterstrokes = data[`flags.${MODULE_ID}.crafting.masterstrokes`]; return this; } };
  if (upgrade) entry.upgrade.originalSnapshot = upgradeSnapshot(item);
  globalThis.game = { settings: { get: () => config }, user: { id: "user", name: "User" }, actors: [party],
    i18n: { localize: key => key, format: key => key }, pf2e: { Modifier: class { constructor(data) { Object.assign(this, data); } } } };
  globalThis.fromUuid = async uuid => uuid === artisan.uuid ? artisan : item;
  globalThis.renderTemplate = async (_path, data) => { rendered.push(data); return "chat"; };
  globalThis.ChatMessage = { getSpeaker: () => ({}), create: async data => { messages.push(data); } };
  globalThis.ui = { notifications: { info() {} } };
  globalThis.Roll = class { constructor(formula) { this.formula = formula; formulas.push(formula); } async evaluate() { this.total = dice.shift(); return this; } };
  return { app: { workbenchState: { partyId: "party" } }, saved: () => saved.projects[0], messages, rendered, formulas, rollCalls, item, party };
}
test("critical success rolls the Edge table and applies an existing circumstance bonus", async () => {
  const context = setup({ dice: [3], bonus: 2 });
  await rollWorkBlock(context.app, "project", 5);
  assert.deepEqual(context.formulas, ["1d3"]);
  assert.equal(context.rollCalls[0].modifiers[0].type, "circumstance");
  assert.equal(context.rollCalls[0].modifiers[0].modifier, 2);
  assert.equal(context.rollCalls[0].dc.value, 19);
  assert.equal(context.saved().nextWorkBonus, 2);
  assert.equal(context.rendered[0].craftingEdge.name, "Stable Integration");
  assert.equal(context.messages[0].rolls.length, 1);
});
test("final opportunity automatically rolls d8 and puts the Masterstroke in chat and project", async () => {
  const context = setup({ dice: [4, 5], required: 5 });
  await rollWorkBlock(context.app, "project", 5);
  assert.deepEqual(context.formulas, ["1d4", "1d8"]);
  assert.equal(context.saved().masterstrokes[0].result, 5);
  assert.equal(context.rendered[0].masterstroke.name, "Hidden Detail");
  assert.equal(context.saved().currentProgress, 5);
});
test("opportunity fallback accelerates without rolling d8", async () => {
  const context = setup({ dice: [4], required: 8 });
  await rollWorkBlock(context.app, "project", 5);
  assert.deepEqual(context.formulas, ["1d4"]);
  assert.equal(context.saved().currentProgress, 8);
  assert.equal(context.saved().masterstrokes.length, 0);
});
test("conservation records credit and ordinary success never rolls a table", async () => {
  const context = setup({ dice: [2] });
  await rollWorkBlock(context.app, "project", 5);
  assert.equal(context.saved().currentProgress, 5);
  assert.equal(context.saved().conservationCredits[0].itemName, "Steel");
  const ordinary = setup({ degree: 2 });
  await rollWorkBlock(ordinary.app, "project", 5);
  assert.deepEqual(ordinary.formulas, []);
});
test("Opened Channel is consumed on the first completed upgrade roll, not a cancelled dialog", async () => {
  const context = setup({ upgrade: true, degree: 1, bonus: 2 });
  await rollWorkBlock(context.app, "project", 1);
  assert.equal(context.rollCalls[0].modifiers.length, 2);
  assert.ok(context.rollCalls[0].modifiers.every(modifier => modifier.type === "circumstance"));
  assert.equal(context.item.flags[MODULE_ID].crafting.masterstrokes[0].used, true);
  assert.equal(context.saved().nextWorkBonus, 0);
  assert.equal(context.saved().upgrade.originalSnapshot, upgradeSnapshot(context.item));
  const cancelled = setup({ upgrade: true, cancel: true, bonus: 2 });
  await rollWorkBlock(cancelled.app, "project", 1);
  assert.equal(cancelled.item.flags[MODULE_ID].crafting.masterstrokes[0].used, false);
  assert.equal(cancelled.saved().nextWorkBonus, 2);
  assert.equal(cancelled.saved().workBlocks.length, 0);
});
test("a failed project save restores the Opened Channel benefit", async () => {
  const context = setup({ upgrade: true, failSave: true, degree: 2 });
  await assert.rejects(rollWorkBlock(context.app, "project", 1), /save failed/);
  assert.equal(context.item.flags[MODULE_ID].crafting.masterstrokes[0].used, false);
  assert.equal(context.saved().workBlocks.length, 0);
});
test("roll permissions are checked before opening the dice prompt", async () => {
  const context = setup(); context.party.canUserModify = () => false;
  await assert.rejects(rollWorkBlock(context.app, "project", 1), /NotEditable/);
  assert.equal(context.rollCalls.length, 0);
});
