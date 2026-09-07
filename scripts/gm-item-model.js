import { MODULE_ID } from "./constants.js";
import { normalizeItemFlags } from "./model.js";
import { compatibleRecipeBands, buildCraftingRecipeFromBand } from "./recipe-catalog.js";
import { ARTISAN_MARK_DEFINITIONS, getArtisanMarkDefinition } from "../content/artisan-marks.js";
import { buildRecipeAnchorSlots, buildArtisanMarkAssignment, evaluateArtisanMarkChoice, selectedMarkCapacity } from "./artisan-marks.js";
import { markConfigurationChoices } from "./artisan-mark-effects.js";

export function gmItemPlan(base, state, config, { legacyDisassembly = false } = {}) {
  const bands = compatibleRecipeBands(base);
  const band = bands.find(entry => entry.id === state.bandId) ?? bands[0];
  if (!band) throw new Error("Drop a weapon, armor, shield, or Wrathmaker Spell Focus.");
  const tier = Number(state.tier);
  if (!Number.isInteger(tier) || tier < 1 || tier > 6) throw new Error("Choose a Tier from 1 to 6.");
  const materialId = state.materialId || band.coreMaterialIds[0];
  if (!band.coreMaterialIds.includes(materialId)) throw new Error("Choose a compatible Core Material.");
  const recipe = buildCraftingRecipeFromBand(band.id, { targetItem: base, tier, coreMaterialId: materialId });
  for (const group of recipe.ingredientSets[0].groups.filter(entry => entry.id !== "core")) {
    const choice = state.components?.[group.id];
    const selected = group.options.find(entry => entry.materialId === (choice?.materialId ?? group.options[0].materialId));
    const selectedTier = Number(choice?.tier ?? tier);
    if (!selected || !Number.isInteger(selectedTier) || selectedTier < Math.max(1, tier - 2) || selectedTier > tier) {
      throw new Error("Secondary materials must match the recipe and be between Core Tier − 2 and Core Tier.");
    }
    group.options = [{ ...selected, tier: selectedTier, maximumTier: selectedTier, tierMode: "exact" }];
  }
  const anchors = buildRecipeAnchorSlots(recipe);
  const assignments = [];
  const evaluate = mark => evaluateArtisanMarkChoice(mark, {
    targetItem: base, itemGroup: band.group, coreTier: tier, anchorSlots: anchors,
    // Capacity is separately confirmed, never bypass compatibility/duplicate/stacking checks.
    ignoreCapacity: true,
    ignoreFreeMarkLimit: legacyDisassembly,
    selectedDefinitionIds: assignments.map(entry => entry.definitionId),
    selectedStackGroups: assignments.map(entry => entry.stackGroup).filter(Boolean),
  });
  for (const selected of state.marks ?? []) {
    const definition = getArtisanMarkDefinition(selected.id);
    if (!definition) throw new Error("Unknown Artisan Mark.");
    const result = evaluate(definition);
    if (!result.eligible) throw new Error(result.reason);
    const anchor = result.anchors.find(entry => entry.id === selected.anchorId) ?? (!selected.anchorId ? result.anchors[0] : null);
    if (!anchor) throw new Error("Choose a compatible Anchor for " + definition.name);
    const maker = String(selected.maker ?? "").trim();
    if (!maker) throw new Error("Enter a maker name for " + definition.name);
    const assignment = buildArtisanMarkAssignment(definition, { name: maker }, anchor, tier);
    assignment.status = "completed";
    assignment.effectiveMarkTier = Math.min(tier, anchor.minimumTier);
    const choices = markConfigurationChoices(definition.id);
    if (choices.length && !choices.includes(selected.choice)) throw new Error("Choose an effect for " + definition.name);
    assignment.configuration = { choice: selected.choice ?? "" };
    assignments.push(assignment);
  }
  return {
    band, bands, recipe, anchors, materialId, tier, assignments,
    capacity: selectedMarkCapacity(assignments, tier),
    available: ARTISAN_MARK_DEFINITIONS.map(mark => evaluate(mark)).filter(result => result.eligible),
  };
}

export function buildGMItemSource(base, state, config, { isGM = false, allowOverCapacity = false } = {}) {
  if (!isGM) throw new Error("Only a GM can create custom world items.");
  const plan = gmItemPlan(base, state, config);
  if (plan.capacity.overCapacity && !allowOverCapacity) throw new Error("Confirm the Capacity override before creating this item.");
  const name = String(state.name ?? "").trim();
  if (!name) throw new Error("Enter an item name.");
  const source = typeof base.toObject === "function" ? base.toObject() : structuredClone(base);
  for (const key of ["_id", "id", "uuid", "folder", "ownership", "_stats"]) delete source[key];
  source.name = name;
  source.system.quantity = 1;
  source.system.containerId = null;
  source.flags ??= {};
  source.flags[MODULE_ID] = normalizeItemFlags({
    material: plan.materialId, tier: plan.tier,
    crafting: {
      core: { materialId: plan.materialId, tier: plan.tier, contributor: { name: String(state.maker ?? "").trim() } },
      components: plan.recipe.ingredientSets[0].groups.filter(group => group.id !== "core").map(group => ({
        id: group.id, name: group.label, slotType: group.id, classification: "required-secondary",
        materialId: group.options[0].materialId, tier: group.options[0].tier, structural: true,
      })),
      artisanMarks: plan.assignments,
    },
  }, config);
  source.flags[MODULE_ID].gmCreated = { createdAt: Date.now(), recipeBandId: plan.band.id, capacityOverride: plan.capacity.overCapacity && allowOverCapacity };
  return source;
}
