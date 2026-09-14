import test from "node:test";
import assert from "node:assert/strict";
import { cloneDefaultRulesConfig } from "../scripts/constants.js";
import { normalizeRulesConfig } from "../scripts/model.js";
import { buildItemRuleElements } from "../scripts/integration.js";
import { CRAFTING_RECIPE_BANDS } from "../content/crafting-recipes.js";
import { addDisassemblyItems, processDisassemblyBatch } from "../scripts/disassembly-batch.js";
import { synchronizeActorProfession } from "../scripts/professions.js";

test("existing worlds gain Mana Gem focus eligibility without losing custom tier values", () => {
  const source = cloneDefaultRulesConfig();
  source.schemaVersion = 17;
  source.materials["mana-crystals"].itemTypes = ["weapon", "armor", "shield"];
  source.materials["mana-crystals"].label = "Mana Crystals";
  source.materials["mana-crystals"].effects = source.materials["mana-crystals"].effects.filter(effect => effect.id !== "spell-focus-potency");
  source.materials["mana-crystals"].tierPricesGp[4] = 123;
  const config = normalizeRulesConfig(source);
  assert.equal(config.materials["mana-crystals"].label, "Mana Gems");
  assert.equal(config.materials["mana-crystals"].tierPricesGp[4], 123);
  const actor = { items: [] };
  const focus = { actor, id: "held", type: "equipment", name: "Focus", isEquipped: true,
    system: { traits: { otherTags: ["spell-focus"] }, equipped: { carryType: "held", handsHeld: 1 } },
    getFlag: () => ({ material: "mana-crystals", tier: 4 }) };
  const stowed = { ...focus, id: "stowed", system: { ...focus.system, equipped: { carryType: "worn" } },
    getFlag: () => ({ material: "mana-crystals", tier: 6 }) };
  actor.items = [focus, stowed];
  const rules = buildItemRuleElements(focus, config);
  assert.equal(rules[0].value, 3);
  assert.deepEqual(rules[0].selector, ["spell-attack", "spell-dc"]);
  assert.deepEqual(buildItemRuleElements(stowed, config), []);
});

test("every new spell focus recipe uses Mana Gems as its core", () => {
  for (const recipe of CRAFTING_RECIPE_BANDS.filter(recipe => recipe.group === "spellFocus")) {
    assert.deepEqual(recipe.coreMaterialIds, ["mana-crystals"], recipe.id);
  }
});

test("batch disassembly deduplicates items and retains failed and unprocessed entries", async () => {
  assert.deepEqual(addDisassemblyItems(["a"], ["a", "b"]), ["a", "b"]);
  assert.throws(() => addDisassemblyItems([], Array.from({ length: 51 }, (_, i) => String(i))));
  const pending = ["a", "b", "c"];
  const attempted = [];
  await assert.rejects(processDisassemblyBatch([...pending], async id => {
    attempted.push(id);
    if (id === "b") throw new Error("Changed item");
  }, id => pending.splice(pending.indexOf(id), 1)), /Changed item/);
  assert.deepEqual(attempted, ["a", "b"]);
  assert.deepEqual(pending, ["b", "c"]);
});

test("profession synchronization does not race the active GM from a player client", async () => {
  const original = globalThis.game;
  globalThis.game = { user: { id: "player", isGM: false }, users: [
    { id: "gm", active: true, isGM: true }, { id: "player", active: true, isGM: false },
  ] };
  try {
    assert.equal(await synchronizeActorProfession({ uuid: "Actor.pc", type: "character", isOwner: true }), false);
  } finally { globalThis.game = original; }
});
