import assert from "node:assert/strict";
import test from "node:test";

import {
  applyAbilityBoost,
  getActiveAbilityBoost,
  getItemAbilityBoost,
  installAbilityBoostBridge,
  normalizeAbilityBoost,
} from "../scripts/ability-boosts.js";

const MODULE_ID = "pf2e-crafting-material-tiers";

function createItem({ attribute = "str", value = 2, selected = true, invested = true, equipped = true } = {}) {
  return {
    type: "equipment",
    flags: {
      [MODULE_ID]: {
        abilityBoost: { schemaVersion: 1, attribute, value },
      },
    },
    system: {
      apex: { attribute, selected },
      equipped: { carryType: equipped ? "worn" : "carried", invested },
      traits: {
        otherTags: ["item-boost"],
        value: ["apex", "invested", "magical"],
      },
    },
    isEquipped: equipped,
    isInvested: invested,
  };
}

function createActor(item, { attribute = "str", mod = 2 } = {}) {
  return {
    type: "character",
    inventory: { contents: [item] },
    system: {
      abilities: {
        str: { mod: attribute === "str" ? mod : 0, base: attribute === "str" ? mod : 0 },
        dex: { mod: attribute === "dex" ? mod : 0, base: attribute === "dex" ? mod : 0 },
        con: { mod: attribute === "con" ? mod : 0, base: attribute === "con" ? mod : 0 },
        int: { mod: attribute === "int" ? mod : 0, base: attribute === "int" ? mod : 0 },
        wis: { mod: attribute === "wis" ? mod : 0, base: attribute === "wis" ? mod : 0 },
        cha: { mod: attribute === "cha" ? mod : 0, base: attribute === "cha" ? mod : 0 },
      },
      build: { attributes: { apex: attribute } },
    },
  };
}

test("ability boosts accept only the six attributes and values from 1 through 5", () => {
  assert.deepEqual(normalizeAbilityBoost({ attribute: "STR", value: "5" }), {
    schemaVersion: 1,
    attribute: "str",
    value: 5,
  });
  assert.equal(normalizeAbilityBoost({ attribute: "luck", value: 2 }), null);
  assert.equal(normalizeAbilityBoost({ attribute: "dex", value: 0 }), null);
  assert.equal(normalizeAbilityBoost({ attribute: "con", value: 6 }), null);
});

test("only tagged Apex equipment is recognized as a Wrathmaker item boost", () => {
  const item = createItem();
  assert.deepEqual(getItemAbilityBoost(item), { schemaVersion: 1, attribute: "str", value: 2 });

  item.system.traits.otherTags = [];
  assert.equal(getItemAbilityBoost(item), null);
  item.system.traits.otherTags = ["item-boost"];
  item.system.traits.value = ["invested", "magical"];
  assert.equal(getItemAbilityBoost(item), null);
});

test("an item boost must be invested, selected, and worn", () => {
  assert.equal(getActiveAbilityBoost(createActor(createItem({ invested: false }))), null);
  assert.equal(getActiveAbilityBoost(createActor(createItem({ selected: false }))), null);
  assert.equal(getActiveAbilityBoost(createActor(createItem({ equipped: false }))), null);

  const item = createItem({ attribute: "wis", value: 4 });
  const active = getActiveAbilityBoost(createActor(item, { attribute: "wis" }));
  assert.equal(active.attribute, "wis");
  assert.equal(active.value, 4);
  assert.equal(active.item, item);
});

test("ability boosts are additive and respect PF2e's prepared modifier bounds", () => {
  const actor = createActor(createItem({ attribute: "cha", value: 5 }), { attribute: "cha", mod: 3 });
  assert.equal(applyAbilityBoost(actor, { attribute: "cha", value: 5 }), true);
  assert.equal(actor.system.abilities.cha.mod, 8);
  assert.equal(actor.system.abilities.cha.base, 8);

  actor.system.abilities.cha.mod = 9;
  assert.equal(applyAbilityBoost(actor, { attribute: "cha", value: 5 }), true);
  assert.equal(actor.system.abilities.cha.mod, 10);
});

test("the bridge replaces PF2e's standard Apex adjustment for custom items", () => {
  const previousConfig = globalThis.CONFIG;
  class CharacterDocument {
    prepareBuildData() {
      const apex = this.system.build.attributes.apex;
      if (apex) {
        const ability = this.system.abilities[apex];
        ability.mod = Math.max(ability.mod + 1, 4);
        ability.base = Math.trunc(ability.mod);
      }
      return "prepared";
    }

    prepareDataFromItems() {
      const selected = this.inventory.contents.find((item) => item.system.apex?.selected);
      this.system.build.attributes.apex = selected?.system.apex.attribute ?? null;
      return this.prepareBuildData();
    }
  }

  globalThis.CONFIG = { PF2E: { Actor: { documentClasses: { character: CharacterDocument } } } };
  try {
    assert.equal(installAbilityBoostBridge(), true);
    assert.equal(installAbilityBoostBridge(), true);

    const item = createItem({ attribute: "str", value: 2 });
    const actor = Object.assign(new CharacterDocument(), createActor(item, { attribute: "str", mod: 2 }));
    actor.system.build.attributes.apex = null;
    assert.equal(actor.prepareDataFromItems(), "prepared");
    assert.equal(actor.system.abilities.str.mod, 4);
    assert.equal(actor.system.build.attributes.apex, "str");

    const ordinaryApex = createItem({ attribute: "dex", value: 2, invested: false });
    const ordinaryActor = Object.assign(
      new CharacterDocument(),
      createActor(ordinaryApex, { attribute: "dex", mod: 1 }),
    );
    ordinaryActor.prepareDataFromItems();
    assert.equal(ordinaryActor.system.abilities.dex.mod, 4);
  } finally {
    globalThis.CONFIG = previousConfig;
  }
});
