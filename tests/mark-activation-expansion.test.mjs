import test from "node:test";
import assert from "node:assert/strict";
import { MARK_ACTIVATION_EXPANSIONS } from "../content/mark-activation-expansion.js";
import { ARTISAN_MARK_DEFINITIONS as marks, getArtisanMarkDefinition as get } from "../content/artisan-marks.js";
import { buildArtisanMarkRules, markConfigurationChoices } from "../scripts/artisan-mark-effects.js";
import { markActionSources } from "../scripts/mark-actions.js";
const MODULE = "pf2e-crafting-material-tiers";
const id = "bookmaking-specialty-1-archmage-codex";
const make = (choice, tier = 6) => ({ id: "grimoire", name: "Grimoire", type: "equipment", actor: {}, isEquipped: true,
  system: { quantity: 1 }, flags: { [MODULE]: { crafting: { core: { tier }, artisanMarks: [{
    definitionId: id, name: "Archmage Codex", status: "completed", configuration: { choice },
  }] } } },
});
test("new activations cover weapons, shields, armor and focuses without extra catalogue entries", () => {
  assert.equal(marks.length, 253);
  assert.equal(marks.filter(mark => mark.activation).length, 72);
  for (const group of ["weapon", "shield", "armor", "spellFocus"]) {
    assert.ok(Object.keys(MARK_ACTIVATION_EXPANSIONS).some(id => get(id).validItemGroups.includes(group)));
  }
  for (const [id, expansion] of Object.entries(MARK_ACTIVATION_EXPANSIONS)) {
    assert.deepEqual(get(id).activation, expansion.activation);
    assert.ok(get(id).activationLabel[0] === get(id).activationLabel[0].toUpperCase());
  }
});
test("grimoire elemental dice are spell-only, conditional and mutually exclusive", () => {
  for (const choice of markConfigurationChoices(id)) for (const tier of [1, 4, 6]) {
    const rules = buildArtisanMarkRules(make(choice, tier), "spellFocus");
    const toggles = rules.filter(rule => rule.key === "RollOption");
    const dice = rules.filter(rule => rule.key === "DamageDice");
    assert.equal(toggles.length, 2);
    assert.ok(toggles.every(toggle => toggle.value === false));
    assert.deepEqual(dice.map(rule => rule.diceNumber), [tier === 6 ? 3 : 2, tier + 2]);
    for (const rule of dice) {
      assert.deepEqual(rule.selector, ["spell-damage"]);
      assert.equal(rule.damageType, choice);
      assert.equal(rule.dieSize, undefined); // Inherit the spell component, never force d8.
      assert.ok(rule.predicate.includes("item:trait:" + choice));
      assert.ok(rule.predicate.includes("wrathmaker:initial-spell-damage:grimoire"));
    }
    assert.deepEqual(dice[0].predicate.at(-1), { not: "wrathmaker:ascendant-thesis:grimoire" });
    assert.equal(dice[1].predicate.at(-1), "wrathmaker:ascendant-thesis:grimoire");
    assert.notEqual(dice[0].slug, dice[1].slug);
  }
  assert.deepEqual(buildArtisanMarkRules(make("invalid"), "spellFocus"), []);
  const stowed = make("fire"); stowed.isEquipped = false;
  assert.deepEqual(buildArtisanMarkRules(stowed, "spellFocus"), []);
});
test("action readout shows selected element and all display labels are capitalised", () => {
  const [action] = markActionSources(make("fire"));
  assert.equal(action.system.actions.value, 2);
  assert.match(action.system.description.value, /Activation:<\/strong> 2 Actions/);
  assert.match(action.system.description.value, /Effect choice:<\/strong> Fire/);
  for (const mark of marks) {
    for (const label of [mark.gradeLabel, mark.activationLabel, ...mark.categoryLabels, ...mark.itemTraitLabels]) {
      assert.ok(/^[A-Z0-9]/.test(label), mark.id + ": " + label);
    }
  }
});

test("additional action costs and spell formula instructions remain explicit", () => {
  assert.equal(get("glassmaking-universal-shatter-safe").activationLabel, "Reaction");
  assert.equal(get("pottery-universal-nested-chamber").activationLabel, "1 Action");
  assert.equal(get("glassmaking-universal-perfect-clarity").activationLabel, "3 Actions");
  assert.match(get(id).effectSummary, /Flat-only components provide no bonus dice/);
  assert.match(get(id).effectSummary, /2d6 passively or 6d6/);
  assert.doesNotMatch(get(id).effectSummary, /d8/);
});
