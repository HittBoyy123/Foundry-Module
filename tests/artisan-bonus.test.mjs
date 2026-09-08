import test from "node:test";
import assert from "node:assert/strict";
import { asArtisanBonus, toPF2eArtisanRule, ARTISAN_BONUS_TAG } from "../scripts/artisan-bonus.js";
import { ARTISAN_MARK_DEFINITIONS } from "../content/artisan-marks.js";
import { rulesForArtisanMark } from "../scripts/artisan-mark-effects.js";
import { installRuleElementBridge } from "../scripts/integration.js";
import { cloneDefaultRulesConfig } from "../scripts/constants.js";
test("Artisan category is Mark-only, labelled and translated without touching native bonuses", () => {
  const original = { key: "FlatModifier", type: "untyped", value: 2, selector: ["attack"], predicate: ["eligible"] };
  const artisan = asArtisanBonus(original, "Test Mark");
  assert.equal(artisan.type, "artisan");
  assert.equal(artisan.label, "Test Mark — Artisan Bonus");
  assert.ok(artisan.tags.includes(ARTISAN_BONUS_TAG));
  const native = toPF2eArtisanRule(artisan);
  assert.equal(native.type, "untyped");
  assert.deepEqual(native.predicate, ["eligible"]);
  assert.equal(native.force, undefined);
  for (const type of ["circumstance", "item", "status", "untyped"]) {
    const rule = { ...original, type };
    assert.equal(toPF2eArtisanRule(rule), rule);
  }
  assert.equal(original.type, "untyped");
  assert.equal(artisan.type, "artisan");
});
test("Mark definitions and generated modifiers present Artisan rather than untyped", () => {
  for (const mark of ARTISAN_MARK_DEFINITIONS) assert.doesNotMatch(mark.effectSummary, /untyped/i, mark.id);
  const item = { id: "focus", type: "equipment", system: {}, flags: {} };
  const rules = rulesForArtisanMark({ definitionId: "glassmaking-specialty-1-crown-prism" }, item);
  assert.ok(rules.every(rule => rule.type === "artisan"));
  assert.match(rules.find(rule => rule.value < 0).label, /Artisan Penalty/);
  assert.match(rules.find(rule => rule.value > 0).label, /Artisan Bonus/);
});
test("separate Artisan bonuses retain separate additive carriers alongside native types", () => {
  const native = ["circumstance", "item", "status"].map(type => ({ key: "FlatModifier", type, value: 1 }));
  const marks = [2, 3].map((value, i) => asArtisanBonus({ key: "FlatModifier", value, slug: "mark-" + i }, "Mark " + i));
  const prepared = [...native, ...marks].map(toPF2eArtisanRule);
  assert.deepEqual(prepared.map(rule => rule.type), ["circumstance", "item", "status", "untyped", "untyped"]);
  assert.equal(prepared.reduce((total, rule) => total + rule.value, 0), 8);
  assert.notEqual(prepared[3].slug, prepared[4].slug);
});

test("real integration boundary sends valid additive rules to PF2e and restores stored rules", () => {
  class Item {
    prepareRuleElements() {
      assert.ok(this.system.rules.every(rule => rule.type !== "artisan"));
      return structuredClone(this.system.rules);
    }
  }
  globalThis.CONFIG = { Item: { documentClass: Item } };
  installRuleElementBridge(() => cloneDefaultRulesConfig());
  const flags = { material: "metal", tier: 3, crafting: { core: { tier: 3 }, artisanMarks: [
    { definitionId: "enchanting-specialty-1-overlord-matrix", name: "Overlord Matrix", status: "completed" },
  ] } };
  const item = Object.assign(new Item(), { id: "sword", actor: {}, type: "weapon", name: "Sword",
    flags: { "pf2e-crafting-material-tiers": flags }, getFlag: () => flags,
    system: { rules: [], damage: { dice: 1 } },
  });
  const result = item.prepareRuleElements();
  const mark = result.find(rule => rule.tags?.includes(ARTISAN_BONUS_TAG));
  assert.ok(mark);
  assert.equal(mark.type, "untyped");
  assert.equal(mark.value, 2);
  assert.equal(mark.label, "Overlord Matrix — Artisan Bonus");
  assert.deepEqual(item.system.rules, []);
});
