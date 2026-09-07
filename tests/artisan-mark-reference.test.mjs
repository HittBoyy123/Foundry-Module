import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ARTISAN_MARK_DEFINITIONS, assertSingleFreeMark } from "../content/artisan-marks.js";
import { ARTISAN_MARK_JOURNAL_SOURCES } from "../content/artisan-mark-journals.js";
import { evaluateArtisanMarkChoice, buildRecipeAnchorSlots } from "../scripts/artisan-marks.js";
import { buildCraftingRecipeFromBand } from "../scripts/recipe-catalog.js";
import { buildGMItemSource, gmItemPlan } from "../scripts/gm-item-model.js";
import { cloneDefaultRulesConfig } from "../scripts/constants.js";
import { createCraftingProject } from "../scripts/crafting-projects.js";
import { markConfigurationChoices } from "../scripts/artisan-mark-effects.js";

test("all 253 Marks have searchable source names and a description in the reference pack", async () => {
  assert.equal(ARTISAN_MARK_JOURNAL_SOURCES.length, 253);
  const serialized = (await readFile(new URL("../packs/artisan-marks.db", import.meta.url), "utf8")).trim().split("\n").map(JSON.parse);
  assert.deepEqual(serialized.slice(0, 253), ARTISAN_MARK_JOURNAL_SOURCES);
  assert.equal(new Set(serialized.map(entry => entry._id)).size, 254);
  assert.equal(serialized[253].pages.length, 254);
  for (const [index, entry] of serialized.slice(0, 253).entries()) {
    const mark = ARTISAN_MARK_DEFINITIONS[index];
    assert.match(entry._id, /^[A-Za-z0-9]{16}$/);
    assert.ok(entry.name.includes(mark.name));
    assert.ok(entry.name.includes(mark.profession));
    assert.ok(entry.name.includes(mark.specialisation || "Universal"));
    assert.match(entry.pages[0].text.content, /Source:/);
    assert.match(entry.pages[0].text.content, /Minimum Anchor Tier/);
    assert.ok(entry.pages[0].text.content.length > mark.effectSummary.length);
  }
});

test("only one free Mark across all contributors, even with a Capacity override", () => {
  const base = { name: "Sword", type: "weapon", system: { category: "martial", group: "sword", quantity: 1 } };
  const recipe = buildCraftingRecipeFromBand("weapon-sword", { targetItem: base, tier: 4 });
  const options = { itemGroup: "weapon", coreTier: 4, targetItem: base, anchorSlots: buildRecipeAnchorSlots(recipe), ignoreCapacity: true };
  const free = ARTISAN_MARK_DEFINITIONS.filter(mark => mark.capacityCost === 0 && evaluateArtisanMarkChoice(mark, options).eligible);
  assert.ok(free.length > 1);
  const blocked = evaluateArtisanMarkChoice(free[1], { ...options, selectedDefinitionIds: [free[0].id] });
  assert.equal(blocked.eligible, false);
  assert.match(blocked.reason, /one zero-Capacity/);
  assert.throws(() => assertSingleFreeMark(free.slice(0, 2)), /one zero-Capacity/);
  assert.throws(() => createCraftingProject({ recipe, artisanMarks: free.slice(0, 2) }), /one zero-Capacity/);
  const config = cloneDefaultRulesConfig();
  const draft = { name: "Test", materialId: "metal", tier: 4, marks: free.slice(0, 2).map(mark => ({
    id: mark.id, maker: "Smith", choice: markConfigurationChoices(mark.id)[0],
  })) };
  assert.throws(() => buildGMItemSource(base, draft, config, { isGM: true, allowOverCapacity: true }), /one zero-Capacity/);
});

test("GM catalogue includes specialisation Marks, not only universal sources", () => {
  const base = { type: "weapon", system: { category: "martial", group: "sword" } };
  const plan = gmItemPlan(base, { tier: 4, materialId: "metal", marks: [] }, cloneDefaultRulesConfig());
  assert.ok(plan.available.some(entry => entry.mark.specialisation));
});
