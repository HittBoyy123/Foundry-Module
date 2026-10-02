import { materialRuneSlots } from "./property-runes.js";
import { calculateItemEffects, getCraftingItemType } from "./model.js";

/** Describe the same configured effects that the finished item receives. */
export function materialBenefits(item, material, tier, config, dragonScale = null) {
  if (!item || !material) return null;
  const itemType = getCraftingItemType(item);
  const result = calculateItemEffects({ itemType, itemId: "preview", itemName: item.name, flags: { material, tier, dragonScale }, config });
  if (!result.active) return null;
  const lines = [];
  const slots = materialRuneSlots({ type: item.type, name: item.name, system: item.system, flags: { ["pf2e-crafting-material-tiers"]: { material, tier } } }, config);
  if (["weapon", "armor"].includes(itemType)) lines.push(`${slots} property-rune ${slots === 1 ? "slot" : "slots"} from this material (maximum 3).`);
  for (const rule of result.rules) {
    if (rule.key === "Resistance") { lines.push(`${rule.value} resistance to ${rule.type} while equipped.`); continue; }
    if (rule.key !== "FlatModifier") continue;
    const selectors = rule.selector ?? [];
    const target = selectors.some(s => s.includes("spell")) ? "spell attack rolls and spell DCs"
      : selectors.includes("ac") ? "AC while worn"
      : selectors.some(s => s.includes("saving") || s === "all-saves" || ["fortitude", "reflex", "will"].includes(s)) ? "saving throws while worn"
      : itemType === "weapon" ? "attack rolls with this weapon" : rule.label;
    const type = rule.type === "untyped" ? "" : `${rule.type} `;
    lines.push(`${rule.value >= 0 ? "+" : ""}${rule.value} ${type}bonus to ${target}.`);
  }
  if (itemType === "shield" && result.coreProgression.attack > 0) lines.push(`+${result.coreProgression.attack * 3} Hardness and +${result.coreProgression.attack * 30} maximum HP.`);
  if (!lines.length) lines.push("No numerical Core bonus at this tier.");
  if (itemType === "weapon") lines.push("Extra weapon damage dice come from Striking runes.");
  if (material === "omnipotisium") {
    lines.push("Exceptionally rare. Awarded only by the GM; cannot be gathered and has no standard market or sale value.");
    if (itemType === "weapon") lines.push("Deals full damage against Voidborn creatures, bypassing their half-damage protection. Other resistances and immunities still apply.");
    if (itemType === "armor") lines.push("While worn, halves damage received from Voidborn attackers.");
    if (itemType === "spellFocus") lines.push("While this is your active focus, your spells bypass Voidborn half-damage protection.");
  }
  return { title: `${result.presentation.label} · Tier ${tier}`, lines };
}
