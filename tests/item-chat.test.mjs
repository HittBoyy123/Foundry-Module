import test from "node:test";
import assert from "node:assert/strict";
import { cloneDefaultRulesConfig, MODULE_ID } from "../scripts/constants.js";
import { makeAndMarksChatSummary } from "../scripts/item-chat.js";

const config = cloneDefaultRulesConfig();
const item = {
  id: "shield", type: "shield", name: "Fortress Shield", isIdentified: true,
  flags: { [MODULE_ID]: { material: "metal", tier: 6, crafting: {
    core: { materialId: "metal", tier: 6 }, artisanMarks: [
      { id: "mark", name: "Tempered Construction", status: "completed", effectSummary: "Secret full effect description", maker: { name: "Malion" } },
      { id: "hidden", name: "Suppressed", status: "suppressed", maker: { name: "Other" } },
    ],
  } } },
};

test("chat summary contains material and Mark names/makers without effect descriptions", () => {
  const summary = makeAndMarksChatSummary(item, config);
  assert.equal(summary.material, "Dark Iron");
  assert.equal(summary.tier, 6);
  assert.equal(summary.itemType, "shield");
  assert.deepEqual(summary.marks, [{ name: "Tempered Construction", maker: "Malion" }]);
  assert.doesNotMatch(JSON.stringify(summary), /Secret|effectSummary|Suppressed/);
});

test("chat summary respects identification, disabled rules, and unmodified items", () => {
  assert.equal(makeAndMarksChatSummary({ ...item, isIdentified: false }, config), null);
  assert.equal(makeAndMarksChatSummary({ ...item, flags: {} }, config), null);
  assert.equal(makeAndMarksChatSummary(item, { ...config, crafting: { enabled: false } }), null);
  assert.equal(makeAndMarksChatSummary(null, config), null);
});
