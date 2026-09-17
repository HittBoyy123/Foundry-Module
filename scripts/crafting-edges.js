/** Crafting table results are separate from Artisan Marks and their capacity. */
export const CRAFTING_EDGES = Object.freeze([
  { name: "Accelerated Work", description: "Generate 150% of committed days as work, rounded up. No additional effect." },
  { name: "Material Conservation", description: "Generate 100% work. Preserve workshop consumables worth up to 10% of one selected Resource Unit used by this contribution. This credit cannot be sold or converted into fractional Resource Units." },
  { name: "Stable Integration", description: "Generate 150% work, rounded up. Gain a +2 circumstance bonus to the next Work Block for this contribution." },
  { name: "Masterstroke Opportunity", description: "Generate 100% work. If this completes the contribution, roll a Masterstroke; otherwise, use Accelerated Work." },
]);
export const MASTERSTROKES = Object.freeze([
  { name: "Maker’s Signature", description: "A harmless visual, audible, or tactile maker motif appears when the item is readied or activated. While its provenance remains intact, the item can be authenticated as that artisan’s work." },
  { name: "Resilient Finish", description: "Gain a +2 circumstance bonus to the first future Repair check made on this item, then expend this benefit.", singleUse: true },
  { name: "Opened Channel", description: "Gain a +2 circumstance bonus to the first Work Block check of this item’s next upgrade project, then expend this benefit.", singleUse: true },
  { name: "Efficient Maintenance", description: "The first future repair or maintenance contribution requires 1 fewer artisan-day, to a minimum of 1, then expend this benefit.", singleUse: true },
  { name: "Hidden Detail", description: "The item can conceal one object of negligible Bulk. Finding it requires a Search or Perception check against the item’s current Crafting DC." },
  { name: "Balanced Carry", description: "While carried or stowed, the item counts as one Bulk step lighter, to a minimum of negligible. This does not alter wielding, usage, armor category, damage, value, or recipe requirements." },
  { name: "Resonant Tell", description: "The current bearer receives a harmless sensory warning when the item becomes damaged, one of its Marks becomes Dormant, or its tracked charges are exhausted." },
  { name: "Storied Presence", description: "Gain a +1 circumstance bonus to Make an Impression or Request when this item’s documented maker or provenance is directly relevant. This does not stack with another circumstance bonus." },
]);

export function normalizeMasterstrokes(entries) {
  return (Array.isArray(entries) ? entries : []).filter(e => MASTERSTROKES[Number(e?.result) - 1]).map(e => ({
    id: String(e.id ?? `${e.projectId ?? "legacy"}-${e.result}`), result: Number(e.result),
    ...MASTERSTROKES[Number(e.result) - 1], maker: String(e.maker ?? ""), projectId: String(e.projectId ?? ""),
    used: e.used === true,
  }));
}

export function workYield(project, days, multiplier = 1) {
  const count = Math.max(1, new Set((project.contributors ?? []).map(e => e.actorUuid).filter(Boolean)).size);
  const rate = count >= 6 ? 1.5 : count >= 3 ? 1.25 : 1;
  const committed = Math.min(5, Math.max(1, Math.trunc(Number(days) || 1)));
  return Math.floor(Math.ceil(committed * multiplier) * rate + (project.teamworkRemainder || 0));
}

export function craftingEdgeDie(project, days) {
  return project.currentProgress + workYield(project, days, 1.5) >= project.requiredProgress ? 4 : 3;
}

export function resolveCraftingEdge(project, { days, result, masterstrokeResult, reservationId, maker = "" }) {
  if (!Number.isInteger(result) || result < 1 || result > craftingEdgeDie(project, days)) throw new Error("Invalid Crafting Edge roll.");
  const completes = project.currentProgress + workYield(project, days) >= project.requiredProgress;
  const effectiveResult = result === 4 && !completes ? 1 : result;
  const edge = { result, effectiveResult, ...CRAFTING_EDGES[effectiveResult - 1], fallback: result !== effectiveResult };
  let masterstroke = null;
  let conservationCredit = null;
  if (effectiveResult === 4) {
    if (!Number.isInteger(masterstrokeResult) || !MASTERSTROKES[masterstrokeResult - 1]) throw new Error("Roll a d8 for the Masterstroke.");
    masterstroke = normalizeMasterstrokes([{ id: `${project.id}-masterstroke-${project.workBlocks.length + 1}`, result: masterstrokeResult, projectId: project.id, maker }])[0];
  }
  if (effectiveResult === 2) {
    const material = project.reservations.find(e => e.id === reservationId && e.units > 0);
    if (!material) throw new Error("Choose a reserved resource for the conservation credit.");
    conservationCredit = {
      id: `${project.id}-conservation-${project.workBlocks.length + 1}`,
      materialId: material.materialId, tier: material.tier, variantId: material.variantId,
      itemName: material.itemName, resourceUnitFraction: 0.1, sellable: false, used: false,
    };
  }
  return { edge, masterstroke, conservationCredit, progressDegree: [2, 4].includes(effectiveResult) ? "success" : "criticalSuccess", nextWorkBonus: effectiveResult === 3 ? 2 : 0 };
}

/** PF2e bulk is measured in tenths: 2 Bulk -> 1 Bulk -> Light -> negligible. */
export function lighterBulk(value) {
  const bulk = Math.max(0, Number(value) || 0);
  return bulk > 10 ? Math.max(10, bulk - 10) : bulk > 1 ? 1 : 0;
}
