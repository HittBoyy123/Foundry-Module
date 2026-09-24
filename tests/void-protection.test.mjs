import test from "node:test";
import assert from "node:assert/strict";
import { MODULE_ID, cloneDefaultRulesConfig } from "../scripts/constants.js";
import { normalizeRulesConfig, normalizeItemFlags } from "../scripts/model.js";
import { VOIDBORN_TRAIT, registerVoidbornTrait, VOID_PROTECTION_SOURCE, hasVoidProtection, voidDamageAdjustment, installVoidDamageBridge } from "../scripts/void-protection.js";
import { CRAFTING_RESOURCE_SOURCES } from "../content/crafting-resources.js";
import { buildCraftingRecipeFromBand } from "../scripts/recipe-catalog.js";
import { buildArtisanSlots } from "../scripts/workbench-team.js";
const config = normalizeRulesConfig(cloneDefaultRulesConfig());
const actor = (entries = []) => ({ items: entries });
const omni = (type = "weapon") => ({ type, isEquipped: true, flags: { [MODULE_ID]: { material: "omnipotisium", tier: 6 } } });
const protectedActor = () => actor([structuredClone(VOID_PROTECTION_SOURCE)]);

test("Void Protection halves ordinary weapons and spells but not Omnipotassium weapons or healing", () => {
 const target = protectedActor();
 assert.equal(hasVoidProtection(target), true);
 for (const type of ["weapon", "melee", "spell"]) assert.equal(voidDamageAdjustment(target, { item: { type }, damage: 21 }, config).length, 1);
 assert.equal(voidDamageAdjustment(target, { item: omni(), damage: 21 }, config).length, 0);
 assert.equal(voidDamageAdjustment(target, { item: { type: "weapon" }, damage: -21 }, config).length, 0);
 assert.equal(voidDamageAdjustment(target, { item: { type: "weapon" }, damage: 21, final: true }, config).length, 0);
 assert.equal(voidDamageAdjustment(actor(), { item: { type: "weapon" }, damage: 21 }, config).length, 0);
 target.items[0].isExpired = true;
 assert.equal(hasVoidProtection(target), false);
});

test("worn Omnipotassium armour reduces damage from void creatures only", () => {
 const armor = omni("armor"); const target = actor([armor]);
 assert.equal(voidDamageAdjustment(target, { item: { type: "melee", actor: protectedActor() }, damage: 30 }, config).length, 1);
 assert.equal(voidDamageAdjustment(target, { item: { type: "melee", actor: actor() }, damage: 30 }, config).length, 0);
 armor.isEquipped = false;
 assert.equal(voidDamageAdjustment(target, { item: { type: "melee", actor: protectedActor() }, damage: 30 }, config).length, 0);
});

test("ring focus with an Omnipotassium frame bypasses protection only while active", () => {
 const focus = { id: "focus", type: "equipment", isEquipped: true, flags: { [MODULE_ID]: { material: "mana-crystals", tier: 6, crafting: { omnipotisiumFrame: true } } }, system: { traits: { otherTags: ["spell-focus"] }, usage: { type: "worn", value: "wornring" }, equipped: { carryType: "worn", inSlot: true } } };
 const caster = actor([focus]); focus.actor = caster;
 const attack = { item: { type: "spell", actor: caster }, damage: 40 };
 assert.equal(voidDamageAdjustment(protectedActor(), attack, config).length, 0);
 focus.system.containerId = "backpack";
 assert.equal(voidDamageAdjustment(protectedActor(), attack, config).length, 1);
 delete focus.system.containerId;
 focus.flags[MODULE_ID].crafting = { components: [{ materialId: "omnipotisium", tier: 6, quantityCommitted: 1, slotType: "frame", classification: "required-secondary" }] };
 assert.equal(voidDamageAdjustment(protectedActor(), attack, config).length, 0);
});

test("damage bridge preserves typed rolls, native IWR and shield options without mutating shared rolls", async () => {
 globalThis.game = { settings: { get: () => JSON.stringify(cloneDefaultRulesConfig()) } };
 class Actor { async applyDamage(options) { return options; } }
 assert.equal(installVoidDamageBridge(Actor), true);
 assert.equal(installVoidDamageBridge(Actor), false);
 const target = new Actor(); target.items = protectedActor().items;
 const roll = { total: 21, alter(multiplier, addend) { assert.equal(addend, 0); return { total: Math.floor(this.total * multiplier), typed: true }; } };
 const options = { damage: roll, item: { type: "weapon" }, shieldBlockRequest: true, skipIWR: false, breakdown: ["Save: half damage"] };
 const result = await target.applyDamage(options);
 assert.equal(result.damage.total, 10); assert.equal(result.damage.typed, true);
 assert.equal(result.shieldBlockRequest, true); assert.equal(result.skipIWR, false);
 assert.equal(roll.total, 21); assert.equal(options.breakdown.length, 1);
 const bypass = await target.applyDamage({ ...options, item: omni() });
 assert.equal(bypass.damage, roll);
});

test("Omni resources support every tier while preserving Dark Iron and metal professions", () => {
 const resource = CRAFTING_RESOURCE_SOURCES.find(item => item.name === "Iron's Blood Ingots");
 assert.equal(resource.system.traits.rarity, "unique");
 assert.equal(resource.flags[MODULE_ID].resource.tier, 6);
 assert.equal(config.materials.metal.tierLabels[6], "Dark Iron");
 assert.equal(normalizeItemFlags({ material: "omnipotisium", tier: 1 }, config).tier, 1);
 const targetItem = { type: "weapon", system: { category: "martial", group: "sword", traits: { value: [] } } };
 const recipe = buildCraftingRecipeFromBand("weapon-sword", { targetItem, tier: 6, coreMaterialId: "omnipotisium" });
 assert.equal(recipe.ingredientSets[0].groups[0].options[0].materialId, "omnipotisium");
 assert.ok(buildArtisanSlots(recipe)[0].materialIds.includes("metal"));
 for (let tier = 1; tier <= 6; tier++) {
  assert.ok(buildCraftingRecipeFromBand("weapon-sword", { targetItem, tier, coreMaterialId: "omnipotisium" }));
  assert.ok(CRAFTING_RESOURCE_SOURCES.some(item => item.flags[MODULE_ID].resource.materialId === "omnipotisium" && item.flags[MODULE_ID].resource.tier === tier));
 }
});


test("Voidborn is a selectable distinct trait driving both damage directions", () => {
 const registry = { creatureTraits: { void: "Void" }, traitsDescriptions: {} };
 registerVoidbornTrait(registry);
 assert.equal(registry.creatureTraits[VOIDBORN_TRAIT], "Voidborn");
 assert.equal(registry.creatureTraits.void, "Void");
 const creature = { items: [], system: { traits: { value: [VOIDBORN_TRAIT] } } };
 assert.equal(hasVoidProtection(creature), true);
 assert.equal(voidDamageAdjustment(creature, { item: { type: "weapon" }, damage: 20 }, config).length, 1);
 assert.equal(voidDamageAdjustment(creature, { item: omni(), damage: 20 }, config).length, 0);
 assert.equal(voidDamageAdjustment(actor([omni("armor")]), { item: { type: "melee", actor: creature }, damage: 20 }, config).length, 1);
 assert.equal(voidDamageAdjustment(actor(), { item: { type: "melee", actor: creature }, damage: 20 }, config).length, 0);
 creature.system.traits.value = ["void", "undead"];
 assert.equal(hasVoidProtection(creature), false);
 assert.equal(voidDamageAdjustment(actor([omni("armor")]), { item: { type: "melee", actor: creature }, damage: 20 }, config).length, 0);
});


test("Omnipotassium ingots reserve and consume as a separate Tier 6 weapon core", async () => {
 const { createCraftingProject, reserveCraftingProject, advanceCraftingProject, buildConsumptionPlan } = await import("../scripts/crafting-projects.js");
 const { buildCompletedItemSource } = await import("../scripts/workbench.js");
 const base = { name: "Longsword", type: "weapon", system: { category: "martial", group: "sword", traits: { value: [] } } };
 const recipe = buildCraftingRecipeFromBand("weapon-sword", { targetItem: base, tier: 6, coreMaterialId: "omnipotisium" });
 const project = createCraftingProject({ id: "omni-sword", name: "Omnipotassium Longsword", recipe, coreMaterialId: "omnipotisium", coreTier: 6, requiredProgress: 1 });
 const stack = (id, materialId, quantity) => ({ id, type: "equipment", system: { quantity }, flags: { [MODULE_ID]: { resource: { materialId, tier: 6, unitsPerItem: 1 } } } });
 const inventory = [stack("omni", "omnipotisium", 10), stack("dark", "metal", 10), stack("hide", "leather", 10)];
 const reserved = reserveCraftingProject(project, { inventoryItems: inventory });
 assert.equal(reserved.reservations.find(row => row.groupId === "core").itemId, "omni");
 assert.throws(() => reserveCraftingProject(project, { inventoryItems: inventory.slice(1) }), /unreserved/);
 const ready = advanceCraftingProject(reserved, { days: 1, degree: "success" });
 const consumption = buildConsumptionPlan(ready, inventory);
 assert.equal(consumption.find(row => row.itemId === "omni").afterQuantity, 7);
 assert.ok(!consumption.some(row => row.itemId === "dark"));
 const output = buildCompletedItemSource(reserved, base, config);
 assert.equal(output.flags[MODULE_ID].material, "omnipotisium");
 assert.equal(output.flags[MODULE_ID].tier, 6);
 assert.equal(voidDamageAdjustment(protectedActor(), { item: output, damage: 20 }, config).length, 0);
});
