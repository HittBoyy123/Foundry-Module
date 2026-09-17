import test from "node:test";
import assert from "node:assert/strict";
import { craftingEdgeDie, resolveCraftingEdge, normalizeMasterstrokes, lighterBulk } from "../scripts/crafting-edges.js";
import { createCraftingProject, advanceCraftingProject, normalizeCraftingProject } from "../scripts/crafting-projects.js";
import { buildCraftingRecipeFromBand } from "../scripts/recipe-catalog.js";
import { normalizeCraftingState } from "../scripts/crafting-model.js";
import { applyMasterstrokeBulk, expendMasterstroke, resonantChanges } from "../scripts/masterstrokes.js";
import { buildCompletedItemSource } from "../scripts/workbench.js";
import { MODULE_ID, cloneDefaultRulesConfig } from "../scripts/constants.js";
globalThis.game = { settings: { get: () => cloneDefaultRulesConfig() } };
const target = { name: "Sword", type: "weapon", system: { category: "martial" } };
function project(requiredProgress = 20) {
  const entry = createCraftingProject({ id: "test", recipe: buildCraftingRecipeFromBand("weapon-sword", { targetItem: target, tier: 2 }),
    coreMaterialId: "metal", coreTier: 2, requiredProgress, leadArtisanName: "Maker", leadArtisanUuid: "Actor.maker" });
  entry.status = "reserved";
  entry.reservations = [{ id: "stock", groupId: "core", materialId: "metal", tier: 2, itemName: "Steel", quantity: 4, units: 4 }];
  return entry;
}
test("Edge die switches only when critical work can finish; insufficient opportunity falls back", () => {
  assert.equal(craftingEdgeDie(project(9), 5), 3);
  assert.equal(craftingEdgeDie(project(8), 5), 4);
  const result = advanceCraftingProject(project(8), { days: 5, degree: "criticalSuccess", craftingEdge: { result: 4 } });
  assert.equal(result.currentProgress, 8);
  assert.equal(result.masterstrokes.length, 0);
  assert.equal(result.workBlocks[0].craftingEdge.fallback, true);
  assert.equal(result.workBlocks[0].craftingEdge.effectiveResult, 1);
  assert.throws(() => resolveCraftingEdge(project(9), { days: 5, result: 4 }), /Invalid/);
});
test("conservation trades speed for a non-sellable credit without altering resource quantities", () => {
  const original = project();
  const result = advanceCraftingProject(original, { days: 5, degree: "criticalSuccess", craftingEdge: { result: 2, reservationId: "stock" } });
  assert.equal(result.currentProgress, 5);
  assert.equal(result.conservationCredits[0].resourceUnitFraction, 0.1);
  assert.equal(result.conservationCredits[0].sellable, false);
  assert.equal(result.conservationCredits[0].itemName, "Steel");
  assert.equal(result.reservations[0].quantity, original.reservations[0].quantity);
  assert.equal(original.conservationCredits.length, 0);
  assert.throws(() => advanceCraftingProject(original, { degree: "criticalSuccess", craftingEdge: { result: 2, reservationId: "other" } }), /reserved resource/);
});
test("Stable Integration grants accelerated work and is expended on the next block including failure", () => {
  const stable = advanceCraftingProject(project(), { days: 3, degree: "criticalSuccess", craftingEdge: { result: 3 } });
  assert.equal(stable.currentProgress, 5);
  assert.equal(normalizeCraftingProject(stable).nextWorkBonus, 2);
  const next = advanceCraftingProject(stable, { days: 1, degree: "failure" });
  assert.equal(next.nextWorkBonus, 0);
  assert.equal(next.currentProgress, 5);
  const renewed = advanceCraftingProject(stable, { days: 1, degree: "criticalSuccess", craftingEdge: { result: 3 } });
  assert.equal(renewed.nextWorkBonus, 2);
});
test("all eight Masterstrokes survive project and item normalization without becoming Marks", () => {
  for (let result = 1; result <= 8; result++) {
    const done = advanceCraftingProject(project(5), { days: 5, degree: "criticalSuccess", craftingEdge: { result: 4, masterstrokeResult: result } });
    assert.equal(done.currentProgress, 5);
    assert.equal(done.status, "ready");
    assert.equal(done.masterstrokes[0].maker, "Maker");
    assert.equal(done.artisanMarks.length, 0);
    assert.equal(normalizeCraftingProject(done).workBlocks[0].masterstroke.result, result);
    const source = buildCompletedItemSource(done, target, cloneDefaultRulesConfig());
    assert.equal(source.flags[MODULE_ID].crafting.masterstrokes[0].result, result);
    assert.equal(normalizeCraftingState(source.flags[MODULE_ID].crafting).masterstrokes[0].result, result);
  }
});
test("team rate and carried fractional work are consistent in final-block decisions", () => {
  const entry = project(7);
  entry.contributors = Array.from({ length: 6 }, (_, i) => ({ actorUuid: `Actor.${i}` }));
  entry.teamworkRemainder = 0.5;
  assert.equal(craftingEdgeDie(entry, 3), 4);
  const fallback = advanceCraftingProject(entry, { days: 3, degree: "criticalSuccess", craftingEdge: { result: 4 } });
  assert.equal(fallback.currentProgress, 7);
  assert.equal(fallback.masterstrokes.length, 0);
});
test("ordinary successes do not gain an Edge even if a result is supplied", () => {
  const result = advanceCraftingProject(project(), { days: 5, degree: "success", craftingEdge: { result: 3 } });
  assert.equal(result.currentProgress, 5);
  assert.equal(result.nextWorkBonus, 0);
  assert.equal(result.workBlocks[0].craftingEdge, null);
});
test("Balanced Carry affects prepared carried or stowed Bulk once, never equipped armor or held weapons", () => {
  assert.deepEqual([30, 20, 10, 1, 0].map(lighterBulk), [20, 10, 1, 0, 0]);
  const item = { type: "weapon", system: { bulk: { value: 20, heldOrStowed: 20 }, equipped: { carryType: "worn" } }, flags: { [MODULE_ID]: { crafting: { masterstrokes: [{ result: 6 }] } } } };
  applyMasterstrokeBulk(item); applyMasterstrokeBulk(item);
  assert.equal(item.system.bulk.value, 10);
  for (const [type, carryType] of [["weapon", "held"], ["armor", "worn"], ["weapon", "dropped"]]) {
    const other = structuredClone(item); other.type = type; other.system.equipped.carryType = carryType; other.system.bulk.value = 20;
    applyMasterstrokeBulk(other); assert.equal(other.system.bulk.value, 20);
  }
});
test("one-use benefits require ownership and cannot be expended twice", async () => {
  const item = { isOwner: false, flags: { [MODULE_ID]: { crafting: { masterstrokes: normalizeMasterstrokes([{ id: "finish", result: 2 }]) } } },
    async update(changes) { this.flags[MODULE_ID].crafting.masterstrokes = changes[`flags.${MODULE_ID}.crafting.masterstrokes`]; return this; } };
  await assert.rejects(expendMasterstroke(item, "finish"), /own/);
  item.isOwner = true;
  await expendMasterstroke(item, "finish");
  assert.equal(item.flags[MODULE_ID].crafting.masterstrokes[0].used, true);
  await assert.rejects(expendMasterstroke(item, "finish"), /no longer/);
});
test("Resonant Tell only warns for damage, newly dormant Marks, or exhausted tracked charges", () => {
  const before = { hp: 20, dormant: [], charges: [2, null] };
  assert.equal(resonantChanges(before, { hp: 10, dormant: ["mark"], charges: [0, null] }).length, 3);
  assert.equal(resonantChanges(before, { hp: 30, dormant: [], charges: [1, null] }).length, 0);
  assert.equal(resonantChanges(before, before).length, 0);
});

test("new copies do not inherit template Masterstrokes; upgrades retain earned and expended benefits", () => {
  const source = { ...target, flags: { [MODULE_ID]: { crafting: { core: { materialId: "metal", tier: 2 }, components: [],
    masterstrokes: [{ id: "old", result: 3, used: true }] } } } };
  const entry = project();
  assert.equal(buildCompletedItemSource(entry, source, cloneDefaultRulesConfig()).flags[MODULE_ID].crafting.masterstrokes.length, 0);
  entry.upgrade = { replaced: ["core"] };
  entry.masterstrokes = normalizeMasterstrokes([{ id: "new", result: 5 }]);
  const result = buildCompletedItemSource(entry, source, cloneDefaultRulesConfig()).flags[MODULE_ID].crafting.masterstrokes;
  assert.equal(result.length, 2);
  assert.equal(result[0].used, true);
  assert.equal(result[1].result, 5);
});
