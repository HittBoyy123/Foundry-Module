import test from "node:test";
import assert from "node:assert/strict";
import { ARTISAN_MARK_DEFINITIONS as marks } from "../content/artisan-marks.js";
import { MARK_REVISIONS } from "../content/mark-revisions.js";
import { CATALOGUE_REVISIONS } from "../content/mark-catalogue-pass.js";
import { buildArtisanMarkRules, applyMarkItemStats, markConfigurationChoices, artisanMarkStackGroup } from "../scripts/artisan-mark-effects.js";
import { markActionSources } from "../scripts/mark-actions.js";
import { normalizeCraftingState } from "../scripts/crafting-model.js";
const MODULE = "pf2e-crafting-material-tiers";
function itemFor(mark, tier, type = mark.validItemGroups[0] ?? "armor") {
  return { id: "source", name: "Test gear", type, isEquipped: true, actor: {},
    system: { quantity: 1, damage: { dice: 1, die: "d8" }, range: type === "weapon" ? 30 : null, equipped: { carryType: "held" } },
    flags: { [MODULE]: { dragonScale: { color: "red" }, crafting: { core: { tier }, artisanMarks: [{
      ...mark, definitionId: mark.id, status: "completed", configuration: { choice: markConfigurationChoices(mark.id)[0] },
    }] } } },
  };
}
test("complete review covers exactly 23 Marks per profession and six per specialisation", () => {
  assert.equal(marks.length, 253);
  assert.deepEqual(Object.keys(MARK_REVISIONS).sort(), marks.map(m => m.id).sort());
  const professions = [...new Set(marks.map(m => m.professionId))];
  assert.equal(professions.length, 11);
  for (const profession of professions) {
    const entries = marks.filter(m => m.professionId === profession);
    assert.equal(entries.length, 23, profession);
    assert.equal(entries.filter(m => !m.specializationId).length, 5);
    for (const specialty of ["specialty-1", "specialty-2", "specialty-3"]) assert.equal(entries.filter(m => m.specializationId === specialty).length, 6);
  }
  for (const mark of marks) {
    assert.equal(mark.revision, 2);
    assert.ok(mark.effectSummary.length > 50, mark.id);
    assert.equal(artisanMarkStackGroup(mark), "", mark.id);
    assert.doesNotMatch(mark.effectSummary, /does not stack with another (Over-Potency|Artisan AC)/i);
  }
});
test("all revised numerical adapters remain finite at all tiers and manual effects do not invent rules", () => {
  for (const mark of marks) for (let tier = 1; tier <= 6; tier++) {
    const item = itemFor(mark, tier);
    for (const rule of buildArtisanMarkRules(item, item.type)) {
      if (["FlatModifier", "Resistance", "DamageAlteration"].includes(rule.key)) assert.ok(Number.isFinite(rule.value), `${mark.id}: ${rule.key}`);
      if (rule.key === "DamageDice") assert.ok(Number.isInteger(rule.diceNumber) && rule.diceNumber > 0);
      if (rule.key === "FlatModifier") assert.equal(rule.type, "artisan");
      assert.notEqual(rule.key, "TempHP");
    }
    if (mark.categories.some(c => ["structure", "project"].includes(c))) {
      assert.deepEqual(buildArtisanMarkRules(item), [], mark.id);
      assert.deepEqual(markActionSources(item), [], mark.id);
    }
  }
});
test("every declared activation produces its revised native action entry without auto-spending uses", () => {
  const active = marks.filter(m => m.activation);
  assert.equal(active.length, 72);
  for (const mark of active) {
    const item = itemFor(mark, 6);
    const [action] = markActionSources(item);
    assert.ok(action, mark.id);
    assert.equal(action.system.actionType.value, mark.activation.type);
    assert.equal(action.system.actions.value, mark.activation.value);
    assert.deepEqual(action.system.rules, []);
    assert.match(action.system.description.value, /does not spend uses/);
    assert.ok(mark.activation.type !== "action" || [1, 2, 3].includes(mark.activation.value));
  }
});
test("different Over-Striking Marks add to base dice and remain item-scoped", () => {
  const id = "glassmaking-specialty-3-arcane-conductor";
  const mark = marks.find(m => m.id === id);
  const item = itemFor(mark, 6, "weapon");
  item.flags[MODULE].crafting.artisanMarks.push({ definitionId: "carpentry-specialty-1-warbow-overdraw", name: "Warbow Overdraw", status: "completed" });
  const dice = buildArtisanMarkRules(item).filter(r => r.key === "DamageAlteration");
  assert.equal(dice.reduce((sum, rule) => sum + rule.value, 0), 5);
  for (const rule of dice) {
    assert.equal(rule.mode, "add");
    assert.deepEqual(rule.selectors, ["source-damage"]);
    assert.deepEqual(rule.predicate, ["dice:slug:base"]);
  }
});
test("updated item stats agree with ceramic, range and mobility descriptions without repeated preparation growth", () => {
  const ceramic = itemFor(marks.find(m => m.id === "pottery-specialty-1-ceramic-plate"), 6, "shield");
  ceramic.system.hp = { max: 100, value: 80, brokenThreshold: 50 };
  ceramic.system.hardness = 10;
  applyMarkItemStats(ceramic); applyMarkItemStats(ceramic);
  assert.equal(ceramic.system.hp.max, 340);
  assert.equal(ceramic.system.hp.value, 320);
  assert.equal(ceramic.system.hardness, 40);
  const bow = itemFor(marks.find(m => m.id === "carpentry-specialty-1-longshot-construction"), 6, "weapon");
  bow.flags[MODULE].crafting.artisanMarks.push({ definitionId: "glassmaking-specialty-1-focusing-lens", status: "completed" });
  applyMarkItemStats(bow); applyMarkItemStats(bow);
  assert.equal(bow.system.range, 75);
  const armor = itemFor(marks.find(m => m.id === "weaving-specialty-2-flexible-weave"), 6, "armor");
  Object.assign(armor.system, { speedPenalty: -10, dexCap: 2 });
  applyMarkItemStats(armor); applyMarkItemStats(armor);
  assert.equal(armor.system.speedPenalty, 0);
  assert.equal(armor.system.dexCap, 5);
});
test("all reviewed snapshots keep maker and recorded configuration while refreshing obsolete text", () => {
  for (const id of Object.keys(CATALOGUE_REVISIONS)) {
    const result = normalizeCraftingState({ artisanMarks: [{ definitionId: id, name: "Old", effectSummary: "Old", effects: [{ kind: "rules-text", text: "Old" }], maker: { name: "Ada" }, status: "completed", configuration: { choice: "cold" } }] });
    assert.equal(result.artisanMarks[0].effectSummary, MARK_REVISIONS[id].effectSummary);
    assert.equal(result.artisanMarks[0].maker.name, "Ada");
    assert.equal(result.artisanMarks[0].configuration.choice, "cold");
    assert.equal(result.artisanMarks[0].effects[0].text, MARK_REVISIONS[id].effectSummary);
  }
});
