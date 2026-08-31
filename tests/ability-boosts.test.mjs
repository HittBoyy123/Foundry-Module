import assert from "node:assert/strict";
import test from "node:test";

import {
  abilityBoostIsActive,
  applyAbilityBoost,
  buildAbilityBoostSelectionUpdates,
  getActiveAbilityBoost,
  getActiveAbilityBoosts,
  getItemAbilityBoost,
  installAbilityBoostBridge,
  normalizeAbilityBoost,
} from "../scripts/ability-boosts.js";

const MODULE_ID = "pf2e-crafting-material-tiers";

function createItem({
  id = "item-1",
  attribute = "str",
  value = 2,
  active = true,
  selected = false,
  invested = true,
  equipped = true,
  legacy = false,
} = {}) {
  const abilityBoost = { schemaVersion: legacy ? 1 : 2, attribute, value };
  if (!legacy) abilityBoost.active = active;
  return {
    id,
    type: "equipment",
    flags: { [MODULE_ID]: { abilityBoost } },
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

function createActor(items, modifiers = {}) {
  const contents = Array.isArray(items) ? items : [items];
  return {
    type: "character",
    inventory: { contents },
    system: {
      abilities: Object.fromEntries(
        ["str", "dex", "con", "int", "wis", "cha"].map((attribute) => {
          const mod = modifiers[attribute] ?? 0;
          return [attribute, { mod, base: mod }];
        }),
      ),
      build: { attributes: { apex: null } },
    },
  };
}

test("ability boosts accept only the six attributes and values from 1 through 5", () => {
  assert.deepEqual(normalizeAbilityBoost({ attribute: "STR", value: "5", active: true }), {
    schemaVersion: 2,
    attribute: "str",
    value: 5,
    active: true,
  });
  assert.deepEqual(normalizeAbilityBoost({ attribute: "dex", value: 2 }), {
    schemaVersion: 2,
    attribute: "dex",
    value: 2,
    active: null,
  });
  assert.equal(normalizeAbilityBoost({ attribute: "luck", value: 2 }), null);
  assert.equal(normalizeAbilityBoost({ attribute: "dex", value: 0 }), null);
  assert.equal(normalizeAbilityBoost({ attribute: "con", value: 6 }), null);
});

test("only tagged Apex equipment is recognized as a Wrathmaker item boost", () => {
  const item = createItem();
  assert.deepEqual(getItemAbilityBoost(item), {
    schemaVersion: 2,
    attribute: "str",
    value: 2,
    active: true,
  });

  item.system.traits.otherTags = [];
  assert.equal(getItemAbilityBoost(item), null);
  item.system.traits.otherTags = ["item-boost"];
  item.system.traits.value = ["invested", "magical"];
  assert.equal(getItemAbilityBoost(item), null);
});

test("an active item boost must be invested and worn", () => {
  assert.equal(getActiveAbilityBoost(createActor(createItem({ invested: false }))), null);
  assert.equal(getActiveAbilityBoost(createActor(createItem({ active: false, selected: true }))), null);
  assert.equal(getActiveAbilityBoost(createActor(createItem({ equipped: false }))), null);

  const item = createItem({ attribute: "wis", value: 4 });
  const active = getActiveAbilityBoost(createActor(item));
  assert.equal(active.attribute, "wis");
  assert.equal(active.value, 4);
  assert.equal(active.item, item);
});

test("legacy items inherit PF2e's selected state until they are first toggled", () => {
  const selected = createItem({ legacy: true, selected: true });
  const unselected = createItem({ id: "item-2", legacy: true, selected: false });
  assert.equal(abilityBoostIsActive(selected), true);
  assert.equal(abilityBoostIsActive(unselected), false);
});

test("different attributes stack while only the strongest item for one attribute applies", () => {
  const weakStrength = createItem({ id: "str-1", attribute: "str", value: 1 });
  const strongStrength = createItem({ id: "str-4", attribute: "str", value: 4 });
  const constitution = createItem({ id: "con-3", attribute: "con", value: 3 });
  const boosts = getActiveAbilityBoosts(createActor([weakStrength, strongStrength, constitution]));

  assert.deepEqual(boosts.map(({ attribute, value }) => ({ attribute, value })), [
    { attribute: "str", value: 4 },
    { attribute: "con", value: 3 },
  ]);
});

test("attribute marker updates do not deactivate a different attribute", () => {
  const strength1 = createItem({ id: "str-1", attribute: "str", value: 1, active: false });
  const strength4 = createItem({ id: "str-4", attribute: "str", value: 4, active: false });
  const constitution = createItem({ id: "con-3", attribute: "con", value: 3, active: true });
  const actor = createActor([strength1, strength4, constitution]);

  assert.deepEqual(buildAbilityBoostSelectionUpdates(actor, "str"), [{
    _id: "str-4",
    [`flags.${MODULE_ID}.abilityBoost.active`]: true,
    [`flags.${MODULE_ID}.abilityBoost.schemaVersion`]: 2,
  }]);
  assert.deepEqual(buildAbilityBoostSelectionUpdates(actor, "con"), [{
    _id: "con-3",
    [`flags.${MODULE_ID}.abilityBoost.active`]: false,
    [`flags.${MODULE_ID}.abilityBoost.schemaVersion`]: 2,
  }]);
});

test("ability boosts are additive and respect PF2e's prepared modifier bounds", () => {
  const actor = createActor(createItem({ attribute: "cha", value: 5 }), { cha: 3 });
  assert.equal(applyAbilityBoost(actor, { attribute: "cha", value: 5 }), true);
  assert.equal(actor.system.abilities.cha.mod, 8);
  assert.equal(actor.system.abilities.cha.base, 8);

  actor.system.abilities.cha.mod = 9;
  assert.equal(applyAbilityBoost(actor, { attribute: "cha", value: 5 }), true);
  assert.equal(actor.system.abilities.cha.mod, 10);
});

test("the bridge applies multiple custom items and preserves ordinary PF2e Apex items", () => {
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

    const strength = createItem({ id: "str-2", attribute: "str", value: 2, selected: true });
    const constitution = createItem({ id: "con-3", attribute: "con", value: 3 });
    const actor = Object.assign(new CharacterDocument(), createActor([strength, constitution], { str: 2, con: 1 }));
    assert.equal(actor.prepareDataFromItems(), "prepared");
    assert.equal(actor.system.abilities.str.mod, 4);
    assert.equal(actor.system.abilities.con.mod, 4);
    assert.equal(actor.system.build.attributes.apex, "str");

    const ordinaryApex = createItem({ id: "ordinary", attribute: "dex", value: 2, selected: true });
    delete ordinaryApex.flags[MODULE_ID];
    ordinaryApex.system.traits.otherTags = [];
    const ordinaryActor = Object.assign(new CharacterDocument(), createActor(ordinaryApex, { dex: 1 }));
    ordinaryActor.prepareDataFromItems();
    assert.equal(ordinaryActor.system.abilities.dex.mod, 4);
  } finally {
    globalThis.CONFIG = previousConfig;
  }
});
