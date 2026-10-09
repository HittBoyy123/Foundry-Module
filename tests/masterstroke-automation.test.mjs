import test from "node:test";
import assert from "node:assert/strict";
import { MODULE_ID } from "../scripts/constants.js";
import { eligibleMasterstroke, currentMasterstroke, masterstrokeAvailable, usageKey } from "../scripts/masterstroke-rules.js";
import { applyMasterstrokeStats, improvedOutcome, outcomeBeforeMasterstroke, installMasterstrokeChecks, installMasterstrokeDamage } from "../scripts/masterstroke-automation.js";
import { materialRuneSlots } from "../scripts/property-runes.js";
import { cloneDefaultRulesConfig } from "../scripts/constants.js";
import { normalizeRulesConfig } from "../scripts/model.js";
import { normalizeCraftingState } from "../scripts/crafting-model.js";
import { itemRefreshPatch, refreshDifferences, refreshReportHTML } from "../scripts/refresh-all.js";
import { masterstrokeRequest } from "../scripts/masterstroke-authority.js";

function set(object, path, value) {
  const keys = path.split("."); const last = keys.pop();
  let current = object;
  for (const key of keys) current = current[key] ??= {};
  if (last.startsWith("-=")) delete current[last.slice(2)]; else current[last] = value;
}
function item(type, result, actor = null) {
  const value = { type, id: `item-${type}-${result}`, uuid: `Item.${type}${result}`, name: "Test", actor, isOwner: true, isEquipped: true,
    system: { equipped: { carryType: "worn" }, quantity: 1, hp: { max: 20, value: 13, brokenThreshold: 10 }, hardness: 4, bulk: { value: 20 }, speedPenalty: -10, checkPenalty: -3, usage: { value: "worn" } },
    flags: { [MODULE_ID]: { material: "metal", tier: 6, crafting: { hpValueMode: "absolute", masterstrokes: [{ id: "stroke", edition: "chad", category: type === "weapon" ? "weapon" : "equipment", result }] } } },
    async update(changes) { for (const [path, data] of Object.entries(changes)) set(this, path, data); return this; },
  }; value._source = structuredClone({ system: value.system, flags: value.flags }); return value;
}
function environment(documents = []) {
  const gm = { id: "gm", isGM: true, active: true };
  globalThis.game = { user: gm, users: [gm], combat: { id: "combat1", started: true, round: 1, turn: 0 }, time: { worldTime: 0 }, settings: { get: () => 0 }, pf2e: {} };
  globalThis.fromUuid = async uuid => documents.find(document => document.uuid === uuid);
  globalThis.foundry = { utils: { randomID: () => Math.random().toString(36).slice(2) } };
  globalThis.ChatMessage = { getSpeaker: () => ({}), create: async () => ({}) };
  globalThis.ui = { notifications: { error: message => { throw new Error(message); } } };
}

test("eligibility separates weapons, armour, shields, focuses and worn items", () => {
  assert.equal(eligibleMasterstroke(item("weapon", 1), 4, "equipment"), false);
  assert.equal(eligibleMasterstroke(item("shield", 4), 4), true);
  assert.equal(eligibleMasterstroke(item("armor", 4), 4), false);
  const focus = item("equipment", 5); focus.system.traits = { otherTags: ["spell-focus"] };
  assert.equal(eligibleMasterstroke(focus, 5), true);
  focus.system.hp.max = 0;
  assert.equal(eligibleMasterstroke(focus, 1), false);
  assert.equal(eligibleMasterstroke(focus, 7), true);
});
test("stats prepare only once, preserve actual HP and allow the fourth rune", () => {
  const shield = item("shield", 1); applyMasterstrokeStats(shield); applyMasterstrokeStats(shield);
  assert.deepEqual(shield.system.hp, { max: 60, value: 13, brokenThreshold: 30 });
  assert.equal(shield.system.hardness, 9);
  const armour = item("armor", 7); applyMasterstrokeStats(armour);
  assert.equal(armour.system.bulk.value, 0); assert.equal(armour.system.speedPenalty, 0); assert.equal(armour.system.checkPenalty, 0);
  assert.equal(materialRuneSlots(item("weapon", 8), normalizeRulesConfig(cloneDefaultRulesConfig())), 4);
});
test("limited uses follow the item across transfers and reset by encounter, round, turn and world day", () => {
  environment(); const weapon = item("weapon", 2);
  weapon.flags[MODULE_ID].crafting.masterstrokeUses = { encounter: usageKey("encounter") };
  assert.equal(masterstrokeAvailable(weapon), false); weapon.actor = { uuid: "Actor.new-owner" };
  assert.equal(masterstrokeAvailable(weapon), false); game.combat.id = "combat2";
  assert.equal(masterstrokeAvailable(weapon), true);
  assert.equal(usageKey("day"), "day-0"); game.time.worldTime = 86400; assert.equal(usageKey("day"), "day-1");
  const state = normalizeCraftingState(weapon.flags[MODULE_ID].crafting);
  assert.equal(state.masterstrokeUses.encounter, "combat1");
});
test("outcome conversions leave critical failures intact and allow defensive cancellation", () => {
  const effects = [{ from: "success", to: "criticalSuccess" }, { from: "criticalSuccess", to: "success" }];
  assert.equal(improvedOutcome("criticalFailure", effects).outcome, "criticalFailure");
  assert.equal(improvedOutcome("success", effects).outcome, "success");
  assert.equal(improvedOutcome("success", effects).used.length, 2);
});
test("native checks receive outcome adjustments and spend only a triggered use", async () => {
  const actor = { uuid: "Actor.hero", isOwner: true }; const weapon = item("weapon", 2, actor);
  environment([actor, weapon]);
  if (currentMasterstroke(weapon)?.frequency) await masterstrokeRequest("arm", weapon, actor);
  let natural = "failure", cancel = false, seen;
  const Check = { async roll(check, context, event, callback) {
    seen = context;
    if (cancel) return null;
    context.unadjustedOutcome = natural;
    const adjustment = context.dosAdjustments.at(-1);
    adjustment.predicate.test(new Set([`check:total:delta:${natural === "failure" ? -1 : -11}`, "check:total:natural:10"]));
    context.outcome = adjustment.adjustments.all?.amount ?? natural;
    const roll = { outcome: context.outcome }; await callback(roll, context.outcome, {}, event); return roll;
  } };
  assert.equal(installMasterstrokeChecks(Check), true);
  const context = { actor, item: weapon, type: "attack-roll", dc: { value: 20 } };
  assert.equal((await Check.roll({}, context)).outcome, "success");
  assert.equal(seen.dosAdjustments.at(-1).adjustments.all.label, "Unerring Strike");
  assert.equal(masterstrokeAvailable(weapon), false);
  game.combat.id = "combat2"; natural = "criticalFailure";
  assert.equal((await Check.roll({}, context)).outcome, "criticalFailure");
  assert.equal(masterstrokeAvailable(weapon), true);
  cancel = true; await Check.roll({}, context); assert.equal(masterstrokeAvailable(weapon), true);
});
test("existing degree adjustments apply before a limited Masterstroke", () => {
  const options = new Set(["check:total:delta:-2", "check:total:natural:10"]);
  assert.equal(outcomeBeforeMasterstroke(options, [{ adjustments: { failure: { label: "Existing ability", amount: "success" } } }]), "success");
  assert.equal(outcomeBeforeMasterstroke(new Set(["check:total:delta:3", "check:total:natural:1"])), "failure");
});
test("damage reduction happens after native reductions and cannot be spent twice in one round", async () => {
  class Actor {
    constructor() { this.uuid = "Actor.hero"; this.isOwner = true; this.attributes = { resistances: [] }; this.items = []; }
    calculateHealthDelta({ delta }) { return { totalApplied: delta, updates: {} }; }
    async applyDamage({ damage }) { this.received = this.calculateHealthDelta({ delta: damage - 7 }).totalApplied; return this; }
  }
  const actor = new Actor(); const armour = item("armor", 2, actor); actor.items.push(armour);
  environment([actor, armour]); installMasterstrokeDamage(Actor);
  await actor.applyDamage({ damage: 30, item: { type: "weapon" } }); assert.equal(actor.received, 13);
  await actor.applyDamage({ damage: 30, item: { type: "weapon" } }); assert.equal(actor.received, 23);
  game.combat.round++;
  await actor.applyDamage({ damage: 7, item: { type: "weapon" } }); assert.equal(actor.received, 0);
  assert.equal(masterstrokeAvailable(armour), true);
});
test("Unyielding Edge reduces only physical resistance and restores prepared data", async () => {
  class Resistance {
    #value = 15;
    get label() { return `Resistance ${this.#value}`; }
    getDoubledValue() { return this.#value; }
  }
  class Actor {
    constructor() { this.uuid = "Actor.target"; this.attributes = { resistances: [new Resistance()] }; this.items = []; }
    calculateHealthDelta({ delta }) { return { totalApplied: delta }; }
    async applyDamage() { assert.equal(this.attributes.resistances[0].label, "Resistance 15"); this.values = ["slashing", "fire"].map(type => this.attributes.resistances[0].getDoubledValue(new Set([`damage:type:${type}`]))); return this; }
  }
  const actor = new Actor(); environment(); installMasterstrokeDamage(Actor);
  const original = actor.attributes.resistances;
  await actor.applyDamage({ damage: 30, item: item("weapon", 3) });
  assert.deepEqual(actor.values, [5,15]); assert.equal(actor.attributes.resistances, original);
});

test("concurrent reservations spend one use and a stale release cannot refund a newer claim", async () => {
  const actor = { uuid: "Actor.hero", isOwner: true }; const weapon = item("weapon", 2, actor);
  environment([actor, weapon]);
  if (currentMasterstroke(weapon)?.frequency) await masterstrokeRequest("arm", weapon, actor);
  const claims = await Promise.all([masterstrokeRequest("reserve", weapon, actor), masterstrokeRequest("reserve", weapon, actor)]);
  assert.equal(claims.filter(Boolean).length, 1);
  const token = claims.find(Boolean);
  assert.equal(await masterstrokeRequest("release", weapon, actor, "wrong-token"), false);
  assert.equal(masterstrokeAvailable(weapon), false);
  await masterstrokeRequest("release", weapon, actor, token);
  const next = await masterstrokeRequest("reserve", weapon, actor);
  assert.notEqual(next, token);
  assert.equal(await masterstrokeRequest("release", weapon, actor, token), false);
  assert.equal(masterstrokeAvailable(weapon), false);
});

test("Relentless Assault uses the native Strike at the original MAP only once", async () => {
  const actor = { uuid: "Actor.hero", isOwner: true }; const weapon = item("weapon", 4, actor);
  environment([actor, weapon]);
  if (currentMasterstroke(weapon)?.frequency) await masterstrokeRequest("arm", weapon, actor);
  let invoked = 0;
  actor.system = { actions: [{ item: weapon, variants: [{}, {}, { roll: async options => {
    invoked++; assert.ok(options.options.includes("masterstroke:relentless-assault")); return {};
  } }] }] };
  const Check = { async roll(check, context, event, callback) { context.outcome = "failure"; await callback({}, "failure", {}, event); return {}; } };
  installMasterstrokeChecks(Check);
  const context = { actor, item: weapon, type: "attack-roll", mapIncreases: 2 };
  await Check.roll({}, context); await Check.roll({}, context);
  assert.equal(invoked, 1);
});

test("Guardian grants native AC and temporary HP effects, with vitality once per encounter", async () => {
  const effects = [];
  const actor = { uuid: "Actor.hero", isOwner: true, level: 12, items: [], async createEmbeddedDocuments(type, sources) { effects.push(...sources); } };
  const weapon = item("weapon", 5, actor); environment([actor, weapon]);
  const Check = { async roll(check, context, event, callback) { context.outcome = "success"; await callback({}, "success", {}, event); return {}; } };
  installMasterstrokeChecks(Check);
  await Check.roll({}, { actor, item: weapon, type: "attack-roll" });
  await Check.roll({}, { actor, item: weapon, type: "attack-roll" });
  assert.equal(effects.filter(effect => effect.system.rules[0].key === "FlatModifier").length, 2);
  const vitality = effects.filter(effect => effect.system.rules[0].key === "TempHP");
  assert.equal(vitality.length, 1);
  assert.equal(vitality[0].system.rules[0].value, 12);
  assert.equal(vitality[0].system.duration.unit, "minutes");
});
test("refresh patches preserve quantity, native runes, damage and custom rules, and explain changes", () => {
  const source = item("weapon", 1); source.system.quantity = 4; source.system.runes = { striking: 2, property: ["flaming"] };
  source.system.rules = [{ key: "FlatModifier", slug: "custom" }, { key: "FlatModifier", slug: "craft-material-metal-old" }];
  source.flags[MODULE_ID].crafting.artisanMarks = [{ name: "Retired" }];
  const patch = itemRefreshPatch(source, cloneDefaultRulesConfig());
  assert.equal(patch["system.quantity"], undefined); assert.equal(patch["system.hp.value"], undefined); assert.equal(patch["system.runes"], undefined);
  assert.deepEqual(patch["system.rules"], [{ key: "FlatModifier", slug: "custom" }]);
  const differences = refreshDifferences({ old: 1, changed: 1 }, { added: 2, changed: 3 });
  assert.deepEqual(differences.map(row => row.kind).sort(), ["Added", "Changed", "Removed"]);
  const html = refreshReportHTML([{ name: "<script>", status: "Updated", changes: differences }]);
  assert.ok(html.includes("&lt;script&gt;")); assert.ok(html.includes("Before: 1")); assert.ok(html.includes("After: 3"));
});
