import test from "node:test";
import assert from "node:assert/strict";
import { MODULE_ID, cloneDefaultRulesConfig } from "../scripts/constants.js";
import { normalizeRulesConfig } from "../scripts/model.js";
import { gmItemPlan, buildGMItemSource } from "../scripts/gm-item-model.js";
import { markConfigurationChoices } from "../scripts/artisan-mark-effects.js";

const config = normalizeRulesConfig(cloneDefaultRulesConfig());
const base = { _id: "base", name: "Longsword", type: "weapon", system: { category: "martial", group: "sword", quantity: 3, containerId: "old" } };
const state = () => ({ name: "The King's Blade", maker: "Edrin the Smith", tier: 4, materialId: "metal", marks: [] });

test("GM source creates fresh gear without resources, actors, or inherited project provenance", () => {
  const draft = state();
  const plan = gmItemPlan(base, draft, config);
  const mark = plan.available.find(result => result.mark.capacityCost === 1);
  draft.marks.push({ id: mark.mark.id, anchorId: mark.anchors[0].id, maker: "A Lost Dwarven Smith" });
  const source = buildGMItemSource(base, draft, config, { isGM: true });
  assert.equal(source._id, undefined);
  assert.equal(source.name, draft.name);
  assert.equal(source.system.quantity, 1);
  assert.equal(source.system.containerId, null);
  const crafting = source.flags[MODULE_ID].crafting;
  assert.equal(crafting.artisanMarks[0].maker.name, "A Lost Dwarven Smith");
  assert.equal(crafting.artisanMarks[0].maker.actorUuid, "");
  assert.equal(crafting.artisanMarks[0].status, "completed");
  assert.ok(crafting.artisanMarks[0].effects.length);
  assert.equal(crafting.core.contributor.name, "Edrin the Smith");
  assert.equal(crafting.provenance.length, 0);
  assert.equal(base.system.quantity, 3);
});

test("world creation remains GM-only and independent of the Workbench switch", () => {
  assert.equal(config.crafting.workbenchEnabled, false);
  assert.throws(() => buildGMItemSource(base, state(), config), /Only a GM/);
  assert.ok(buildGMItemSource(base, state(), config, { isGM: true }));
});

test("Capacity override requires explicit approval and preserves the over-cap readout", () => {
  const draft = state();
  for (let count = 0; count < 10 && !gmItemPlan(base, draft, config).capacity.overCapacity; count++) {
    const result = gmItemPlan(base, draft, config).available.find(result => result.mark.capacityCost > 0 && !result.mark.name.includes("Elemental"));
    assert.ok(result);
    draft.marks.push({ id: result.mark.id, anchorId: result.anchors[0].id, maker: "Nameless Maker" });
  }
  assert.equal(gmItemPlan(base, draft, config).capacity.overCapacity, true);
  assert.throws(() => buildGMItemSource(base, draft, config, { isGM: true }), /Capacity override/);
  const source = buildGMItemSource(base, draft, config, { isGM: true, allowOverCapacity: true });
  assert.equal(source.flags[MODULE_ID].gmCreated.capacityOverride, true);
  assert.equal(source.flags[MODULE_ID].crafting.artisanMarks.length, draft.marks.length);
});

test("override never bypasses duplicates, unknown Marks, or invalid Anchors", () => {
  const draft = state();
  const mark = gmItemPlan(base, draft, config).available[0];
  const selected = { id: mark.mark.id, anchorId: mark.anchors[0].id, maker: "Smith", choice: markConfigurationChoices(mark.mark.id)[0] };
  draft.marks = [selected, selected];
  assert.throws(() => buildGMItemSource(base, draft, config, { isGM: true, allowOverCapacity: true }), /already supplied/);
  draft.marks = [{ ...selected, anchorId: "missing" }];
  assert.throws(() => gmItemPlan(base, draft, config), /compatible Anchor/);
  draft.marks = [{ ...selected, id: "invented" }];
  assert.throws(() => gmItemPlan(base, draft, config), /Unknown/);
});

test("invalid material and tier choices cannot create items", () => {
  assert.throws(() => gmItemPlan(base, { ...state(), materialId: "herbs" }, config), /compatible Core/);
  assert.throws(() => gmItemPlan(base, { ...state(), tier: 7 }, config), /Tier from 1/);
  assert.throws(() => gmItemPlan(base, { ...state(), components: { grip: { tier: 1, materialId: "wood" } } }, config), /Secondary materials/);
});
