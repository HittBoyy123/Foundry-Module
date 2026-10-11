import { specializationsEnabled } from "./profession-options.js";
import { PROFESSION_DEFINITIONS } from "../content/professions.js";

export function materialDisplayName(id) {
  return ({ leather: "Leather / Hide", herbs: "Herbs / Mushrooms", "mana-crystal": "Mana Crystals" })[id]
    ?? String(id).replaceAll("-", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

/** Six slots: qualified lead, named structural supports, then general assistants. */
export function buildArtisanSlots(recipe, slotUuids = [], profiles = [], { armor = false, dragonResistance = false } = {}) {
  const groups = recipe?.ingredientSets?.[0]?.groups ?? [];
  const core = groups.find((group) => group.id === "core");
  const supports = groups.filter(group => group.id !== "core" && group.id !== "dragon-scale" && group.id !== "magic-catalyst" && !group.id.startsWith("enchantment") && !group.id.startsWith("mark-"));
  const consumable = recipe?.categoryId?.startsWith("consumable.");
  const leatherGroupIndex = [core, ...supports].findIndex(group => group?.options?.some(option => option.materialId === "leather"));
  const wyrmIndex = leatherGroupIndex >= 0 ? leatherGroupIndex : Math.min(5, Math.max(2, supports.length + 1));
  return Array.from({ length: 6 }, (_, index) => {
    const group = index === 0 ? core : supports[index - 1] ?? null;
    const materialIds = [...new Set(group?.options?.map((option) => option.materialId === "omnipotisium" ? "metal" : option.materialId) ?? [])];
    const profile = profiles.find((entry) => entry.actorUuid === slotUuids[index]);
    const wyrmSlot = armor && dragonResistance && index === wyrmIndex;
    const professionIds = recipe?.categoryId === "consumable.scroll" && index === 0 ? ["bookmaking"] : consumable && index === 0 ? ["alchemy"] : consumable && group?.id === "container" ? ["glassmaking"] : [];
    const qualified = professionIds.length ? Boolean(profile?.professions.some(p => professionIds.includes(p.id))) : wyrmSlot ? hasWyrmcraft(profile) : !group || Boolean(profile?.professions.some((profession) => (
      profession.materialIds.some((id) => materialIds.includes(id))
    )));
    return {
      index,
      role: wyrmSlot && index > 1 ? (specializationsEnabled() ? "Wyrmcraft Specialist" : "Leatherwork Specialist") : index === 0 ? "Core Artisan" : group ? "Component Specialist" : "Assistant Artisan",
      required: index === 0 || (wyrmSlot && dragonResistance),
      materialIds,
      professionIds,
      allowsSpellContributor: recipe?.categoryId === "consumable.scroll" && !group && !wyrmSlot,
      namedRole: Boolean(group || wyrmSlot),
      requiresWyrmcraft: wyrmSlot,
      requirement: professionIds.length ? professionIds.map(id => PROFESSION_DEFINITIONS.find(p => p.id === id)?.name ?? id).join(" / ") : wyrmSlot ? "Leatherwork · Wyrmcraft (dragon-scale resistance)" : group ? PROFESSION_DEFINITIONS.filter(profession => profession.materialIds.some(id => materialIds.includes(id)))
        .map(profession => profession.name).join(" / ") || "Qualified Artisan" : recipe?.categoryId === "consumable.scroll" ? "Any Profession or Spell Contributor" : "Any Profession",
      actorUuid: profile?.actorUuid ?? "",
      name: profile?.name ?? "",
      img: profile?.img ?? "icons/svg/mystery-man.svg",
      professionSummary: profile?.professions.map((profession) => profession.name).join(" · ") ?? "",
      specializationSummary: profile?.specializations?.map(specialty => specialty.name).filter(Boolean).join(" · ") ?? "",
      qualified,
    };
  });
}

export function hasWyrmcraft(profile) {
  if (!specializationsEnabled()) return profile?.professions?.some(p => p.id === "leatherwork" || p.materialIds?.includes("leather")) === true;
  return profile?.specializations?.some(s => s.professionId === "leatherwork" && s.specializationId === "specialty-1") === true;
}

export function validateArtisanTeam(recipe, slotUuids, profiles, options = {}) {
  const slots = buildArtisanSlots(recipe, slotUuids, profiles, options);
  const reasons = slots[0].actorUuid ? [] : ["Choose a lead artisan. Additional artisans can assist with the work."];
  if (options.dragonResistance && !profiles.some(hasWyrmcraft)) {
    reasons.push(specializationsEnabled() ? "Add a Leatherwork artisan with Wyrmcraft to apply dragon-scale resistance." : "Add a Leatherwork artisan to apply dragon-scale resistance.");
  }
  for (const slot of slots) if (slot.actorUuid && !slot.qualified) reasons.push(`${slot.role} requires ${slot.requirement}.`);
  const uuids = slotUuids.filter(Boolean);
  if (uuids.length > 6 || new Set(uuids).size !== uuids.length) {
    reasons.push("Use up to six different artisans.");
  }
  const named = slots.filter(slot => slot.namedRole);
  const workRate = named.length > 1 && named.every(slot => slot.actorUuid && slot.qualified) && new Set(uuids).size === uuids.length ? 1.25 : 1;
  return { valid: reasons.length === 0, reasons, slots, workRate };
}

export function chooseSecondaryMaterials(recipe, selections = {}) {
  for (const group of recipe.ingredientSets[0].groups) {
    if (group.id === "core") continue;
    const chosen = group.options.find((option) => option.materialId === selections[group.id]) ?? group.options[0];
    selections[group.id] = chosen.materialId;
    group.options = [chosen];
  }
  return recipe;
}
