import { getActorProfessions, getProfessionGrant } from "./professions.js";

/** Only learned profession Lore associated with the actual materials is eligible.
 * Use the prepared PF2e statistic so proficiency and modifiers remain system-owned.
 */
export function professionSkillChoices(actor, defaultSkill, materialIds = []) {
  const choices = [{ id: defaultSkill, label: actor?.getStatistic?.(defaultSkill)?.label ?? defaultSkill }];
  const professions = getActorProfessions(actor).filter(profession =>
    profession.materialIds.some(materialId => materialIds.map(id => id === "omnipotisium" ? "metal" : id).includes(materialId)));
  for (const item of Array.from(actor?.items ?? [])) {
    const grant = getProfessionGrant(item);
    if (item.type !== "lore" || grant?.kind !== "lore"
      || !professions.some(profession => profession.id === grant.professionId)) continue;
    const prepared = Object.entries(actor.skills ?? {}).find(([, skill]) =>
      skill.lore && (skill.itemId === item.id || skill.item?.id === item.id));
    const slug = prepared?.[0] ?? item.slug ?? item.system?.slug;
    const statistic = slug ? actor.getStatistic?.(slug) : null;
    const rank = Number(statistic?.rank ?? item.system?.proficient?.value);
    if (!statistic?.roll || !Number.isFinite(rank) || rank < 1) continue;
    if (!choices.some(choice => choice.id === slug)) choices.push({ id: slug, label: item.name });
  }
  return [...choices.slice(1), choices[0]];
}

export function resolveProfessionStatistic(actor, defaultSkill, materialIds, selectedSkill = defaultSkill) {
  const choice = professionSkillChoices(actor, defaultSkill, materialIds).find(entry => entry.id === selectedSkill);
  if (!choice) throw new Error("That skill is no longer eligible for these materials. Select a relevant profession Lore or the standard skill.");
  const statistic = actor?.getStatistic?.(choice.id);
  if (!statistic?.roll) throw new Error("The selected skill is unavailable.");
  return { statistic, label: choice.label };
}
