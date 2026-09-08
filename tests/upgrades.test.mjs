import test from "node:test";
import assert from "node:assert/strict";
import { buildUpgradePlan, validateUpgradeItem, upgradeSnapshot, retainedUpgradeMarks, selectUpgradeComponentTiers } from "../scripts/upgrades.js";
import { buildCraftingRecipeFromBand } from "../scripts/recipe-catalog.js";
import { createCraftingProject, normalizeCraftingProject, releaseCraftingProject } from "../scripts/crafting-projects.js";
import { buildCompletedItemSource } from "../scripts/workbench.js";
import { cloneDefaultRulesConfig } from "../scripts/constants.js";
import { getArtisanMarkDefinition } from "../content/artisan-marks.js";
import { buildArtisanMarkAssignment, buildRecipeAnchorSlots } from "../scripts/artisan-marks.js";
const MODULE = "pf2e-crafting-material-tiers";
const item = () => ({ uuid: "Actor.pc.Item.sword", isOwner: true, type: "weapon", name: "Old Friend",
  system: { quantity: 1, category: "martial", equipped: { carryType: "stowed" } },
  flags: { [MODULE]: { material: "metal", tier: 2, crafting: {
    core: { materialId: "metal", tier: 2, quantityCommitted: 8 },
    components: [{ id: "grip", slotType: "grip", materialId: "leather", tier: 2, quantityCommitted: 2 }],
    artisanMarks: [],
  } } },
});
const recipe = (target) => buildCraftingRecipeFromBand("weapon-sword", { targetItem: target, tier: 4, coreMaterialId: "metal" });
test("upgrade discounts only replacement chassis materials and work", () => {
  const target = item(), full = recipe(target);
  full.ingredientSets[0].groups = [
    { id: "core", label: "Core", options: [{ materialId: "metal", tier: 4, tierMode: "exact", maximumTier: 4, units: 8 }] },
    { id: "grip", label: "Grip", options: [{ materialId: "leather", tier: 2, tierMode: "minimum", maximumTier: 4, units: 2 }] },
    { id: "mark-extra", label: "New Mark", options: [{ materialId: "metal", tier: 4, tierMode: "exact", maximumTier: 4, units: 4 }] },
  ];
  const plan = buildUpgradePlan(target, full);
  assert.deepEqual(plan.replaced, ["core"]);
  assert.deepEqual(plan.recipe.ingredientSets[0].groups.map(g => g.options[0].units), [6, 4]);
  assert.equal(plan.requiredProgress, 6);
  assert.equal(target.flags[MODULE].crafting.core.tier, 2);
});
test("upgrades persist through project normalisation and cancellation", () => {
  const target = item(), plan = buildUpgradePlan(target, recipe(target));
  const project = createCraftingProject({ recipe: plan.recipe, upgrade: plan, baseItemUuid: target.uuid });
  assert.deepEqual(normalizeCraftingProject(project).upgrade, plan);
  assert.equal(releaseCraftingProject(project).status, "cancelled");
});
test("reject stacks, held items, missing ownership and concurrent upgrades", () => {
  const target = item();
  validateUpgradeItem(target);
  assert.throws(() => validateUpgradeItem({ ...target, isOwner: false }), /own/);
  target.system.quantity = 2;
  assert.throws(() => validateUpgradeItem(target), /stack/);
  target.system.quantity = 1;
  target.system.equipped.carryType = "held";
  assert.throws(() => validateUpgradeItem(target), /Stow/);
  target.system.equipped.carryType = "stowed";
  assert.throws(() => validateUpgradeItem(target, [{ baseItemUuid: target.uuid, upgrade: {}, status: "active" }]), /already/);
});
test("snapshot ignores lock bookkeeping but detects actual item edits", () => {
  const target = item(), snapshot = upgradeSnapshot(target);
  target.flags[MODULE].upgradeProject = "project";
  target._stats = { modifiedTime: 123 };
  assert.equal(upgradeSnapshot(target), snapshot);
  target.name = "Changed";
  assert.notEqual(upgradeSnapshot(target), snapshot);
});
test("explicit secondary tier changes and unknown Marks cannot silently disappear", () => {
  const target = item(), full = recipe(target);
  selectUpgradeComponentTiers(full, { grip: 4 });
  const grip = full.ingredientSets[0].groups.find(g => g.id === "grip");
  assert.ok(grip.options.every(o => o.tier === 4 && o.maximumTier === 4));
  target.flags[MODULE].crafting.artisanMarks = [{ definitionId: "unknown", anchorSlotIds: ["core"] }];
  assert.throws(() => retainedUpgradeMarks(target, full, "weapon", 4), /unknown/);
});

test("completed upgrade preserves original item identity, retained components and maker records", () => {
  globalThis.game = { settings: { get: () => cloneDefaultRulesConfig() } };
  const target = item();
  target._id = "sword";
  const full = recipe(target), plan = buildUpgradePlan(target, full);
  const current = createCraftingProject({ recipe: plan.recipe, upgrade: plan, baseItemUuid: target.uuid,
    coreMaterialId: "metal", coreTier: 4, artisanMarks: [] });
  current.reservations = [{ groupId: "core", units: 6, tier: 4, materialId: "metal" }];
  const source = buildCompletedItemSource(current, target, cloneDefaultRulesConfig());
  assert.equal(source.name, "Old Friend");
  assert.equal(source._id, undefined);
  assert.equal(source.flags[MODULE].crafting.core.tier, 4);
  assert.equal(source.flags[MODULE].crafting.components.find(c => c.id === "grip").tier, 2);
  assert.equal(source.flags[MODULE].crafting.provenance.at(-1).projectId, current.id);
});

test("retained compatible Marks keep maker and configuration without being charged again", () => {
  const target = item(), full = recipe(target);
  const definition = getArtisanMarkDefinition("blacksmithing-universal-reinforced-edge");
  const anchor = buildRecipeAnchorSlots(full).find(a => a.id === "core");
  const mark = buildArtisanMarkAssignment(definition, { actorUuid: "Actor.original", name: "Original Smith" }, anchor, 2);
  mark.status = "completed";
  mark.configuration = { choice: "custom" };
  target.flags[MODULE].crafting.artisanMarks = [mark];
  const retained = retainedUpgradeMarks(target, full, "weapon", 4);
  assert.equal(retained[0].maker.name, "Original Smith");
  assert.deepEqual(retained[0].configuration, { choice: "custom" });
  assert.equal(retained[0].status, "completed");
});
