import test from "node:test";
import assert from "node:assert/strict";
import { resolveMarkText, markDescriptionHtml } from "../scripts/mark-formulas.js";
import { markConfigurationChoices, rulesForArtisanMark } from "../scripts/artisan-mark-effects.js";
test("tier arithmetic resolves without changing tier thresholds", () => {
  assert.equal(resolveMarkText("Deal 2 × Core Tier d8 fire damage and gain Core Tier + 2. At Core Tier 5+, use 3 × Core Tier.", { tier: 4 }),
    "Deal 8d8 fire damage and gain 6. At Core Tier 5+, use 12.");
  assert.equal(resolveMarkText("Core Tier d6", { tier: 3 }), "3d6");
  assert.equal(resolveMarkText("8 × your level HP", { tier: 2 }), "8 × your level HP");
});
test("damage and known DCs use native clickable PF2e syntax without unsafe HTML", () => {
  const text = markDescriptionHtml("<b>2 × Core Tier d8 fire damage, basic Reflex save against your higher class or spell DC.</b>", { tier: 4, dc: 28 });
  assert.match(text, /@Damage\[8d8\[fire\]\]/);
  assert.match(text, /@Check\[type:reflex\|dc:28\|basic:true\]/);
  assert.match(text, /&lt;b&gt;/);
});
test("additional native passive adapters require valid fixed choices", () => {
  const item = { id: "test", type: "armor", flags: {} };
  assert.ok(markConfigurationChoices("enchanting-specialty-1-twin-empowerment").includes("acrobatics,arcana"));
  assert.equal(rulesForArtisanMark({ definitionId: "enchanting-specialty-1-twin-empowerment", configuration: { choice: "acrobatics,arcana" } }, item).length, 2);
  assert.equal(rulesForArtisanMark({ definitionId: "enchanting-specialty-2-predatory-essence", configuration: { choice: "climb" } }, item)[0].key, "BaseSpeed");
  assert.deepEqual(rulesForArtisanMark({ definitionId: "enchanting-specialty-2-predatory-essence", configuration: { choice: "invalid" } }, item), []);
});
