import test from "node:test";
import assert from "node:assert/strict";
import { MARK_POWER, MARK_ITEM_POWER, powerRules } from "../content/mark-power.js";
import { getArtisanMarkDefinition } from "../content/artisan-marks.js";
import { applyMarkItemStats, buildArtisanMarkRules } from "../scripts/artisan-mark-effects.js";
const MODULE = "pf2e-crafting-material-tiers";
const gear = (ids, tier = 6, type = "armor") => ({
  id: "gear", type, actor: {}, isEquipped: true,
  system: { hardness: 10, hp: { max: 100, value: 70, brokenThreshold: 50 } },
  flags: { [MODULE]: { crafting: { core: { tier }, artisanMarks: ids.map(definitionId => ({ definitionId, status: "completed", name: getArtisanMarkDefinition(definitionId).name })) } } },
});
test("all power revisions remain discoverable with matching eligibility and finite values at every tier", () => {
  for (const [id, profile] of Object.entries({ ...MARK_POWER, ...MARK_ITEM_POWER })) {
    const definition = getArtisanMarkDefinition(id);
    assert.ok(definition, id);
    assert.equal(definition.effectSummary, profile.effectSummary);
    assert.deepEqual(definition.validItemGroups, profile.validItemGroups);
    assert.equal(definition.stackGroup, "");
    for (let tier = 1; tier <= 6; tier++) {
      for (const rule of powerRules(id, tier, "gear") ?? []) {
        assert.ok(Number.isFinite(rule.value ?? rule.diceNumber), id);
        assert.ok(!rule.selector?.includes("hp-temp"));
        if (rule.key === "FlatModifier") assert.equal(rule.type, "untyped");
      }
    }
  }
});
test("maximum HP sources stack without adding healing or temporary HP instructions", () => {
  const item = gear(["blacksmithing-specialty-2-aegis-of-dawn", "tailoring-specialty-1-vital-reinforcement"]);
  const rules = buildArtisanMarkRules(item);
  const hp = rules.filter(r => r.selector?.includes("hp"));
  assert.deepEqual(hp.map(r => r.value), [72, 108]);
  assert.ok(hp.every(r => r.type === "untyped"));
  assert.equal(item.system.hp.value, 70);
  item.isEquipped = false;
  assert.deepEqual(buildArtisanMarkRules(item), []);
});
test("fortified shield scales to four times base HP and retains damage deficit", () => {
  for (const [tier, expected] of [[1, 200], [4, 300], [6, 400]]) {
    const item = gear(["blacksmithing-universal-fortified-frame"], tier, "shield");
    applyMarkItemStats(item);
    applyMarkItemStats(item);
    assert.equal(item.system.hp.max, expected);
    assert.equal(item.system.hp.value, expected - 30);
    assert.equal(item.system.hp.brokenThreshold, expected / 2);
    assert.equal(item.system.hardness, 10 + 2 * tier);
  }
});
test("stacked durability uses a common base and never modifies weapons", () => {
  const ids = ["blacksmithing-universal-fortified-frame", "stonemason-universal-stonebound"];
  const item = gear(ids, 6, "shield");
  applyMarkItemStats(item);
  assert.equal(item.system.hp.max, 450);
  assert.equal(item.system.hardness, 34);
  const weapon = gear(ids, 6, "weapon");
  applyMarkItemStats(weapon);
  assert.equal(weapon.system.hp.max, 100);
  assert.equal(weapon.system.hardness, 10);
});
test("social and exploration strength scales without unconditional action bonuses", () => {
  const social = powerRules("tailoring-universal-perfect-fit", 6, "gear")[0];
  assert.equal(social.value, 8);
  assert.deepEqual(social.predicate, ["action:make-an-impression"]);
  const seek = powerRules("glassmaking-universal-hardened-glass", 6, "gear")[0];
  assert.equal(seek.value, 8);
  assert.ok(seek.predicate.includes("action:seek"));
});
