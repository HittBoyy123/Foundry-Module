/** Six stable slots: Core lead, required component specialist, four assistants. */
export function buildArtisanSlots(recipe, slotUuids = [], profiles = []) {
  const groups = recipe?.ingredientSets?.[0]?.groups ?? [];
  const core = groups.find((group) => group.id === "core");
  const secondary = groups.find((group) => group.id !== "core");
  return Array.from({ length: 6 }, (_, index) => {
    const group = index === 0 ? core : index === 1 ? secondary : null;
    const materialIds = [...new Set(group?.options?.map((option) => option.materialId) ?? [])];
    const profile = profiles.find((entry) => entry.actorUuid === slotUuids[index]);
    const qualified = !group || Boolean(profile?.professions.some((profession) => (
      profession.materialIds.some((id) => materialIds.includes(id))
    )));
    return {
      index,
      role: index === 0 ? "Core Artisan" : index === 1 && secondary ? "Component Specialist" : "Mark Artisan",
      required: index === 0 || (index === 1 && Boolean(secondary)),
      materialIds,
      requirement: group ? materialIds.join(" / ").replaceAll("-", " ") : "Any profession",
      actorUuid: profile?.actorUuid ?? "",
      name: profile?.name ?? "",
      img: profile?.img ?? "icons/svg/mystery-man.svg",
      professionSummary: profile?.professions.map((profession) => profession.name).join(" · ") ?? "",
      qualified,
    };
  });
}

export function validateArtisanTeam(recipe, slotUuids, profiles) {
  const slots = buildArtisanSlots(recipe, slotUuids, profiles);
  const reasons = slots.filter((slot) => slot.required && (!slot.actorUuid || !slot.qualified))
    .map((slot) => `${slot.role} requires an artisan qualified in ${slot.requirement}.`);
  const uuids = slotUuids.filter(Boolean);
  if (uuids.length > 6 || new Set(uuids).size !== uuids.length) {
    reasons.push("Use up to six different artisans.");
  }
  for (const group of recipe?.ingredientSets?.[0]?.groups ?? []) {
    if (group.id === "core") continue;
    const covered = profiles.some((profile) => slotUuids.includes(profile.actorUuid)
      && profile.professions.some((profession) => group.options.some((option) => (
        profession.materialIds.includes(option.materialId)
      ))));
    if (!covered) reasons.push(`${group.label} requires a qualified component artisan.`);
  }
  return { valid: reasons.length === 0, reasons, slots };
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
