import test from "node:test";
import assert from "node:assert/strict";
import { rulesForArtisanMark } from "../scripts/artisan-mark-effects.js";
import { getArtisanMarkDefinition } from "../content/artisan-marks.js";
test("Over-Potency contributions cap at two at every tier without changing other bonuses", () => {
  for (let tier = 1; tier <= 6; tier++) {
    for (const [id, type] of [
      ["enchanting-specialty-1-overlord-matrix", "weapon"],
      ["enchanting-specialty-1-overlord-matrix", "equipment"],
      ["carpentry-specialty-1-perfected-tension", "weapon"],
      ["glassmaking-specialty-1-crown-prism", "equipment"],
    ]) {
      const rules = rulesForArtisanMark({ definitionId: id }, { id: "gear", type, system: {}, flags: { "pf2e-crafting-material-tiers": { crafting: { core: { tier } } } } });
      const potency = rules.filter(r => r.selector?.some(s => ["gear-attack", "spell-attack", "spell-dc"].includes(s)));
      assert.ok(potency.length);
      assert.ok(potency.every(r => r.value <= 2));
      assert.equal(getArtisanMarkDefinition(id).stackGroup, "");
      if (id.includes("crown-prism")) assert.equal(rules.find(r => r.selector.includes("arcana")).value, tier);
    }
  }
  assert.match(getArtisanMarkDefinition("enchanting-specialty-1-overcharged-matrix").effectSummary, /Cannot improve Over-Potency/);
});
