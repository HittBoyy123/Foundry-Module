import test from "node:test";
import assert from "node:assert/strict";
import { NEPHILIM_BONDS, createBondSource, validateBondSelection, chooseBond } from "../scripts/nephilim-bonds.js";

test("first bond selection opens without existing flags and creates a gift", async () => {
  const original = globalThis.foundry;
  let created;
  globalThis.foundry = { applications: { api: { DialogV2: { wait: async options => {
    assert.match(options.content, /Ao&#39;s Toughness/);
    return { id: "toughness", milestone: 5, choice: "" };
  } } } } };
  try {
    await chooseBond({ level: 5, isOwner: true, items: [], createEmbeddedDocuments: async (_type, sources) => { created = sources; } }, 5);
    assert.equal(created[0].name, "Ao's Toughness");
    assert.equal(created[0].system.rules[0].value, 8);
  } finally { globalThis.foundry = original; }
});

test("Nephilim Gift modifiers retain independent additive stacking", () => {
  for (const gift of NEPHILIM_BONDS) {
    const source = createBondSource({ id: gift.id, milestone: 5, choice: gift.choices?.[0] });
    for (const rule of source.system.rules) {
      assert.match(rule.label, /Nephilim Gift/);
      if (rule.key === "FlatModifier") assert.equal(rule.type, "untyped");
      else assert.equal(rule.mode, "add");
    }
  }
});

test("bonds unlock at 5 and 10 and cannot repeat across milestones", () => {
  assert.throws(() => validateBondSelection({ id: "skin", milestone: 5 }, [], 4));
  assert.throws(() => validateBondSelection({ id: "skin", milestone: 10 }, [], 9));
  assert.equal(validateBondSelection({ id: "skin", milestone: 5 }, [], 5).id, "skin");
  assert.throws(() => validateBondSelection({ id: "will", choice: "reflex", milestone: 10 }, [{ id: "will", choice: "fortitude", milestone: 5 }], 10));
  assert.equal(validateBondSelection({ id: "skin", milestone: 10 }, [{ id: "will", milestone: 5 }], 10).id, "skin");
  assert.throws(() => validateBondSelection({ id: "skin", milestone: 15 }, [], 20));
});
test("save and attribute choices are validated", () => {
  for (const id of ["will", "form"]) assert.throws(() => createBondSource({ id, milestone: 5, choice: "invalid" }));
});
test("all six bonds produce level-gated native rules", () => {
  assert.equal(NEPHILIM_BONDS.length, 6);
  for (const gift of NEPHILIM_BONDS) {
    const source = createBondSource({ id: gift.id, milestone: 5, choice: gift.choices?.[0] });
    assert.equal(source.type, "feat");
    for (const rule of source.system.rules) assert.deepEqual(rule.predicate, [{ gte: ["self:level", 5] }]);
  }
  const rule = id => createBondSource({ id, milestone: 5 }).system.rules[0];
  assert.equal(rule("toughness").selector, "hp-per-level");
  assert.equal(rule("toughness").value, 8);
  assert.deepEqual(rule("wisdom").selector, ["spell-attack", "spell-dc"]);
  assert.equal(rule("precision").selector, "strike-attack-roll");
  assert.match(rule("skin").label, /Nephilim Gift/);
  const form = createBondSource({ id: "form", milestone: 10, choice: "con" }).system.rules[0];
  assert.equal(form.path, "system.abilities.con.mod");
  assert.equal(form.phase, "beforeDerived");
});
