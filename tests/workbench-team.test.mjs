import assert from "node:assert/strict";
import test from "node:test";
import { buildArtisanSlots, validateArtisanTeam, chooseSecondaryMaterials } from "../scripts/workbench-team.js";
import { buildCraftingRecipeFromBand } from "../scripts/recipe-catalog.js";
import { normalizeCraftingProject, createCraftingProject, reservationLedger } from "../scripts/crafting-projects.js";
import { getArtisanMarkDefinition } from "../content/artisan-marks.js";
import { markAppliesToItem, rulesForArtisanMark, applyMarkItemStats, buildArtisanMarkRules } from "../scripts/artisan-mark-effects.js";
import { normalizeCraftingState } from "../scripts/crafting-model.js";
import { createWorkbenchApplication } from "../scripts/workbench.js";
import { cloneDefaultRulesConfig } from "../scripts/constants.js";
import { evaluateArtisanMarkChoice, buildRecipeAnchorSlots, buildArtisanMarkAssignment } from "../scripts/artisan-marks.js";
const MODULE = "pf2e-crafting-material-tiers";
const weapon = { type: "weapon", system: { category: "martial" } };
const recipe = () => buildCraftingRecipeFromBand("weapon-sword", { targetItem: weapon, tier: 4, coreMaterialId: "metal" });
const profile = (id, material) => ({ actorUuid: id, name: id, professions: [{ name: material, materialIds: [material] }] });
const smith = profile("smith", "metal"), carpenter = profile("carpenter", "wood"), leather = profile("leather", "leather");

test("Core and secondary slots require material expertise and preserve six stable positions", () => {
  const plan = chooseSecondaryMaterials(recipe(), { grip: "wood" });
  const profiles = [smith, carpenter, leather];
  assert.equal(buildArtisanSlots(plan, [], []).length, 6);
  assert.equal(validateArtisanTeam(plan, ["smith", "carpenter"], profiles).valid, true);
  assert.equal(validateArtisanTeam(plan, ["carpenter", "smith"], profiles).valid, false);
  assert.equal(validateArtisanTeam(plan, ["smith", "leather"], profiles).valid, false);
  assert.equal(validateArtisanTeam(plan, ["smith", "carpenter", "smith"], profiles).valid, false);
  assert.equal(plan.ingredientSets[0].groups[1].options[0].materialId, "wood");
});

test("secondary coverage accounts for every required component in a multi-material recipe", () => {
  const plan = chooseSecondaryMaterials(buildCraftingRecipeFromBand("weapon-firearm", { targetItem: weapon, tier: 4 }), {});
  assert.equal(validateArtisanTeam(plan, ["smith", "carpenter"], [smith, carpenter]).valid, false);
  assert.equal(validateArtisanTeam(plan, ["smith", "carpenter", "leather"], [smith, carpenter, leather]).valid, true);
});

test("archived terminal projects keep their history but no reservations", () => {
  const project = createCraftingProject({ recipe: recipe(), contributors: [{ actorUuid: "smith", slotIndex: 4 }] });
  const archived = normalizeCraftingProject({ ...project, status: "completed", archived: true });
  assert.equal(archived.archived, true);
  assert.equal(archived.contributors[0].slotIndex, 4);
  assert.equal(reservationLedger([archived]).size, 0);
  assert.equal(normalizeCraftingProject({ ...project, status: "active", archived: true }).archived, false);
});

test("hardness-only Marks are excluded from weapons and ranged Marks from melee weapons", () => {
  const tempered = getArtisanMarkDefinition("blacksmithing-universal-tempered-construction");
  assert.equal(markAppliesToItem(tempered, "weapon"), false);
  assert.equal(markAppliesToItem(tempered, "armor"), true);
  const tension = getArtisanMarkDefinition("carpentry-specialty-1-perfected-tension");
  assert.equal(markAppliesToItem(tension, "weapon", weapon), false);
  assert.equal(markAppliesToItem(tension, "weapon", { ...weapon, system: { range: 60 } }), true);
});

test("selected elemental choices survive item normalization and generate weapon-specific damage", () => {
  const definition = getArtisanMarkDefinition("enchanting-specialty-2-elemental-essence");
  const mark = { ...definition, definitionId: definition.id, status: "completed", configuration: { choice: "cold" } };
  const state = normalizeCraftingState({ core: { tier: 4 }, artisanMarks: [mark] });
  const item = { id: "sword", type: "weapon", actor: {}, isEquipped: true, flags: { [MODULE]: { crafting: state } }, system: {} };
  const rules = buildArtisanMarkRules(item);
  assert.equal(rules[0].damageType, "cold");
  assert.equal(rules[0].diceNumber, 2);
  assert.deepEqual(rules[0].selector, ["sword-damage"]);
  item.isEquipped = false;
  assert.deepEqual(buildArtisanMarkRules(item), []);
  assert.deepEqual(rulesForArtisanMark({ ...mark, configuration: { choice: "invalid" } }, item), []);
});

test("durability prepares once without cumulative HP or source changes", () => {
  const definitionId = "blacksmithing-universal-fortified-frame";
  const item = { type: "armor", system: { hardness: 5, hp: { max: 40, value: 30, brokenThreshold: 20 } },
    flags: { [MODULE]: { crafting: { core: { tier: 4 }, artisanMarks: [{ definitionId, status: "completed" }] } } } };
  applyMarkItemStats(item);
  applyMarkItemStats(item);
  assert.equal(item.system.hp.max, 48);
  assert.equal(item.system.hp.value, 38);
  assert.equal(item.system.hardness, 7);
});

test("Blood Temper remains conditional and Core-tier HP bonuses are numerical", () => {
  const item = { id: "blade", flags: { [MODULE]: { crafting: { core: { tier: 5 } } } }, system: {} };
  const blood = rulesForArtisanMark({ id: "blacksmithing-specialty-1-blood-temper" }, item)[0];
  assert.equal(blood.value, 4);
  assert.deepEqual(blood.predicate, [{ lte: ["hp-percent", 50] }]);
  assert.equal(rulesForArtisanMark({ id: "stonemason-specialty-3-mountain-plate" }, item)[0].value, 20);
});

test("equivalent non-stacking effects share a group and Crown Prism requires a T5 anchor", () => {
  const silk = getArtisanMarkDefinition("weaving-specialty-2-silken-steel");
  const war = getArtisanMarkDefinition("tailoring-specialty-1-war-skin");
  const anchor = { id: "core", minimumTier: 4 };
  assert.equal(buildArtisanMarkAssignment(silk, { name: "Artisan" }, anchor, 4).stackGroup,
    buildArtisanMarkAssignment(war, { name: "Artisan" }, anchor, 4).stackGroup);
  const crown = getArtisanMarkDefinition("glassmaking-specialty-1-crown-prism");
  const result = evaluateArtisanMarkChoice(crown, {
    itemGroup: "spellFocus", coreTier: 4,
    anchorSlots: [{ id: "core", slotType: "core", minimumTier: 4, maximumTier: 4 }],
  });
  assert.equal(result.eligible, false);
});

test("Workbench prepares six qualified slots, Mark choices, and embedded Gathering", async () => {
  const config = cloneDefaultRulesConfig();
  const makeActor = (id, professionId) => ({
    id, uuid: "Actor." + id, documentName: "Actor", type: "character", name: id, level: 10,
    items: [{ type: "feat", flags: { [MODULE]: { profession: { id: professionId } } } }],
  });
  const a = makeActor("smith", "blacksmithing"), b = makeActor("wood", "carpentry");
  const base = { ...weapon, id: "blade", uuid: "Item.blade", documentName: "Item", name: "Sword", system: { ...weapon.system, group: "sword" } };
  const party = { id: "party", name: "Party", type: "party", items: [], members: [a, b], getFlag: () => ({}), canUserModify: () => true };
  const actors = [party, a, b]; actors.party = party;
  globalThis.game = { actors, user: { isGM: true }, scenes: {}, i18n: { localize: key => key, format: key => key }, settings: { get: () => JSON.stringify(config) } };
  globalThis.fromUuid = async uuid => [a, b, base].find(doc => doc.uuid === uuid);
  globalThis.foundry = { applications: { api: {
    ApplicationV2: class { async _prepareContext() { return {}; } },
    HandlebarsApplicationMixin: Base => Base,
  } } };
  globalThis.renderTemplate = async (path, data) => JSON.stringify({ path, ...data });
  const App = createWorkbenchApplication();
  const app = new App({ baseItemUuid: base.uuid, tier: 4, contributorUuids: [a.uuid, b.uuid] });
  app.workbenchState.secondaryMaterials = { grip: "wood" };
  const context = await app._prepareContext({});
  assert.equal(context.artisanSlots.length, 6);
  assert.deepEqual(context.teamReasons, []);
  assert.equal(context.artisanSlots[0].qualified, true);
  assert.equal(context.artisanSlots[1].qualified, true);
  assert.ok(context.markTrays[0].availableMarks.length);
  app.workbenchState.tab = "gather";
  const gathering = JSON.parse((await app._prepareContext({})).gatheringHtml);
  assert.equal(gathering.embedded, true);
  assert.equal(gathering.rewardRecipientName, "Party");
});
