import { MODULE_ID } from "./constants.js";
import { propertyRuneChoices, chooseRuneDialog } from "./enchanting.js";
import { MANA_RUNE_LEVELS } from "./property-runes.js";

export function plannedEquipment(base, state, runes = []) {
  const existing = [...(base._source?.system?.runes?.property ?? base.system?.runes?.property ?? [])];
  for (const rune of runes) {
    const index = existing.indexOf(rune.replaced);
    if (index >= 0) existing[index] = rune.slug;
    else existing.push(rune.slug);
  }
  return { type: base.type, name: base.name, sheet: base.sheet, isMelee: base.isMelee, isRanged: base.isRanged,
    system: { ...base.system, runes: { ...base.system?.runes, property: existing } },
    _source: { system: { runes: { property: existing } } },
    flags: { [MODULE_ID]: { material: state.materialId, tier: state.tier } } };
}

export async function validateCraftingEnchantments(base, state, profiles) {
  const runes = state.enchantments ?? [];
  if (!runes.length) return;
  if (state.tab === "upgrade") throw new Error("Use Enchant on the finished equipment after upgrading.");
  if (!profiles.some(profile => profile.professions.some(p => p.id === "enchanting")))
    throw new Error("Assign an Enchanting artisan to craft the selected property runes.");
  const accepted = [];
  for (const rune of runes) {
    const choices = await propertyRuneChoices(plannedEquipment(base, state, accepted), rune.tier);
    const match = choices.find(choice => choice.slug === rune.slug);
    if (!match || (match.replaced ?? "") !== (rune.replaced ?? ""))
      throw new Error("A selected rune no longer fits this material, tier or equipment. Remove it and choose again.");
    accepted.push(rune);
  }
}

/** Add after equipment size scaling: each rune always costs exactly one unit. */
export function addEnchantmentCosts(recipe, runes = []) {
  for (const [index, rune] of runes.entries()) recipe.ingredientSets[0].groups.push({
    id: `enchantment-${index}`, label: `Property Rune: ${rune.name}`,
    options: [{ materialId: "mana-crystals", tier: rune.tier, tierMode: "minimum", maximumTier: rune.tier, units: 1 }],
  });
  return recipe;
}

export async function selectCraftingRune(base, state, party) {
  const tier = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Craft with a Property Rune" },
    content: `<p>Reserve one Mana Gem unit with the project. It is consumed when crafting completes.</p><label>Mana Gem tier<select name="manaTier">${MANA_RUNE_LEVELS.map((level, index) => `<option value="${index + 1}">Tier ${index + 1} — runes up to level ${level}</option>`).join("")}</select></label>`,
    ok: { label: "Choose Rune", callback: (_event, button) => Number(button.form.elements.namedItem("manaTier").value) }, rejectClose: false,
  });
  if (!tier) return null;
  const item = plannedEquipment(base, state, state.enchantments);
  const choices = (await propertyRuneChoices(item, tier)).filter(choice => !state.enchantments?.some(rune => rune.slug === choice.replaced));
  if (!choices.length) throw new Error("No eligible runes at this Mana Gem tier, or all rune slots are occupied.");
  const slug = await chooseRuneDialog(item, choices, `Tier ${tier} Mana Gem (on completion)`, party.name, { planning: true });
  const rune = choices.find(choice => choice.slug === slug);
  return rune ? { ...rune, tier } : null;
}
