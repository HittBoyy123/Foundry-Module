import test from "node:test";
import assert from "node:assert/strict";
import { MODULE_ID, cloneDefaultRulesConfig } from "../scripts/constants.js";
import { normalizeRulesConfig } from "../scripts/model.js";
import { applyPreparedItemPresentation, buildItemRuleElements, installRuleElementBridge } from "../scripts/integration.js";
import { listCraftingRecipeBands } from "../content/crafting-recipes.js";
import { CRAFTING_RESOURCE_SOURCES } from "../content/crafting-resources.js";
import { VOIDBORN_TRAIT, voidDamageAdjustment } from "../scripts/void-protection.js";
import { retireProjectMarks } from "../scripts/retired-marks.js";
const config = normalizeRulesConfig(cloneDefaultRulesConfig());

test("all weapon and armour recipes accept the Omni family, including wood and leather cores", () => {
  for (const band of listCraftingRecipeBands().filter(band => ["weapon", "armor"].includes(band.group))) {
    assert.ok(band.coreMaterialIds.includes("omnipotisium"), band.id);
  }
  assert.deepEqual(CRAFTING_RESOURCE_SOURCES.filter(item => item.flags[MODULE_ID].resource.materialId === "omnipotisium").map(item => item.name),
    ["Omni Iron Ingots", "Omni Steel Ingots", "Creation Steel Ingots", "Fate Steel Ingots", "Eternal Steel Ingots", "Iron's Blood Ingots"]);
});

test("each Omni tier bypasses Voidborn protection and protects its wearer", () => {
  const creature = { system: { traits: { value: [VOIDBORN_TRAIT] } }, items: [] };
  for (let tier = 1; tier <= 6; tier++) {
    const flags = { [MODULE_ID]: { material: "omnipotisium", tier } };
    const weapon = { type: "weapon", flags };
    assert.deepEqual(voidDamageAdjustment(creature, { item: weapon, damage: 20 }, config), []);
    const armor = { type: "armor", flags, isEquipped: true };
    assert.equal(voidDamageAdjustment({ items: [armor] }, { item: { type: "melee", actor: creature }, damage: 20 }, config).length, 1);
    armor.isEquipped = false;
    assert.equal(voidDamageAdjustment({ items: [armor] }, { item: { type: "melee", actor: creature }, damage: 20 }, config).length, 0);
  }
});

test("material preparation preserves Striking and adds only an attack rule", () => {
  for (let tier = 1; tier <= 6; tier++) {
    const item = { id: "sword", name: "Sword", type: "weapon", actor: {}, flags: { [MODULE_ID]: { material: "metal", tier } },
      system: { runes: { potency: 3, striking: 3 }, damage: { dice: 4, die: "d8" }, rules: [] } };
    applyPreparedItemPresentation(item, config);
    assert.equal(item.system.runes.striking, 3);
    assert.equal(item.system.damage.dice, 4);
    const rules = buildItemRuleElements(item, config);
    assert.ok(rules.every(rule => rule.key === "FlatModifier"));
    assert.equal(rules.length, tier === 1 ? 0 : 1);
  }
});

test("saved timed Mark effects remain stored but no longer contribute rules", () => {
  class Item { prepareRuleElements() { return this.system.rules; } }
  globalThis.CONFIG = { Item: { documentClass: Item } };
  installRuleElementBridge(() => config);
  const item = new Item();
  item.flags = { [MODULE_ID]: { timedMark: { definitionId: "old-mark" } } };
  item.system = { rules: [{ key: "DamageDice", diceNumber: 2 }] };
  assert.deepEqual(item.prepareRuleElements(), []);
  assert.equal(item.system.rules.length, 1);
});

test("legacy active projects release Mark stock and work once, preserving audit and structural costs", () => {
  const project = { status: "active", coreTier: 3, currentProgress: 4, requiredProgress: 10,
    artisanMarks: [{ grade: "minor" }], audit: [],
    recipe: { ingredientSets: [{ groups: [{ id: "core" }, { id: "mark-test" }] }] },
    reservations: [{ groupId: "core", state: "reserved" }, { groupId: "mark-test", state: "reserved" }] };
  retireProjectMarks(project);
  assert.equal(project.requiredProgress, 9);
  assert.equal(project.currentProgress, 4);
  assert.equal(project.reservations.length, 1);
  assert.equal(project.recipe.ingredientSets[0].groups.length, 1);
  assert.equal(project.audit[0].details.marks.length, 1);
  assert.deepEqual(project.artisanMarks, []);
  retireProjectMarks(project);
  assert.equal(project.requiredProgress, 9);
  assert.equal(project.audit.length, 1);
});
