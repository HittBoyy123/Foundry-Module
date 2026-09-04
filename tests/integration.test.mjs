import assert from "node:assert/strict";
import test from "node:test";

import { cloneDefaultRulesConfig } from "../scripts/constants.js";
import {
  applyPreparedItemPresentation,
  buildItemRuleElements,
  installRuleElementBridge,
} from "../scripts/integration.js";
import { normalizeRulesConfig } from "../scripts/model.js";

test("PF2e bridge injects rules ephemerally and restores system.rules", () => {
  class MockPf2eItem {
    prepareRuleElements() {
      return structuredClone(this.system.rules);
    }
  }
  globalThis.CONFIG = { Item: { documentClass: MockPf2eItem } };
  const config = normalizeRulesConfig(cloneDefaultRulesConfig());
  assert.equal(installRuleElementBridge(() => config), true);

  const item = new MockPf2eItem();
  Object.assign(item, {
    actor: {},
    type: "weapon",
    id: "weapon1",
    name: "Longsword",
    system: { rules: [{ key: "ExistingRule" }] },
    getFlag: () => ({ material: "metal", tier: 3 }),
  });

  const prepared = item.prepareRuleElements();
  assert.equal(prepared.length, 3);
  assert.equal(prepared[0].key, "ExistingRule");
  assert.equal(prepared[1].key, "FlatModifier");
  assert.equal(prepared[1].value, 2);
  assert.equal(prepared[2].key, "DamageDice");
  assert.equal(prepared[2].diceNumber, 2);
  assert.deepEqual(item.system.rules, [{ key: "ExistingRule" }]);
});

test("prepared presentation layers tier name and price without changing source data", () => {
  class MockCoins {
    constructor({ gp = 0, cp = 0 } = {}) {
      this.gp = gp;
      this.cp = cp;
    }

    plus({ gp = 0, cp = 0 }) {
      return new MockCoins({ gp: this.gp + gp, cp: this.cp + cp });
    }
  }

  const config = normalizeRulesConfig(cloneDefaultRulesConfig());
  const item = {
    type: "weapon",
    id: "weapon2",
    name: "+1 Striking Bastard Sword",
    isIdentified: true,
    _source: {
      name: "Bastard Sword",
      system: {
        price: { value: { gp: 4 } },
        traits: { rarity: "common" },
      },
    },
    system: {
      price: { value: new MockCoins({ gp: 100 }) },
      traits: { rarity: "common" },
    },
    getFlag: () => ({ material: "metal", tier: 2 }),
  };

  assert.equal(applyPreparedItemPresentation(item, config), true);
  assert.equal(item.name, "Steel Bastard Sword");
  assert.equal(item.system.price.value.gp, 100);
  assert.equal(item.system.traits.rarity, "uncommon");
  assert.equal(item._source.name, "Bastard Sword");
  assert.deepEqual(item._source.system.price.value, { gp: 4 });
  assert.equal(item._source.system.traits.rarity, "common");

  applyPreparedItemPresentation(item, config);
  assert.equal(item.name, "Steel Bastard Sword");
  assert.equal(item.system.price.value.gp, 100);
});

test("armor AC rules are generated only while the armor is equipped", () => {
  const config = normalizeRulesConfig(cloneDefaultRulesConfig());
  const armor = {
    actor: {},
    type: "armor",
    id: "armor1",
    name: "Steel Plate",
    isEquipped: false,
    getFlag: () => ({ material: "metal", tier: 2 }),
  };

  assert.deepEqual(buildItemRuleElements(armor, config), []);
  armor.isEquipped = true;
  const rules = buildItemRuleElements(armor, config);
  assert.equal(rules.length, 2);
  assert.deepEqual(rules[0].selector, ["ac"]);
  assert.equal(rules[0].value, 1);
  assert.deepEqual(rules[1].selector, ["fortitude", "reflex", "will"]);
});

test("spell-focus rules affect spell attacks and DCs only while the focus is held", () => {
  const config = normalizeRulesConfig(cloneDefaultRulesConfig());
  const focus = {
    actor: {},
    type: "equipment",
    id: "focus1",
    name: "Spell Focus",
    isEquipped: false,
    system: { traits: { otherTags: ["spell-focus"] } },
    getFlag: () => ({ material: "wood", tier: 4 }),
  };

  assert.deepEqual(buildItemRuleElements(focus, config), []);
  focus.isEquipped = true;
  const rules = buildItemRuleElements(focus, config);
  assert.equal(rules.length, 1);
  assert.deepEqual(rules[0].selector, ["spell-attack", "spell-dc"]);
  assert.equal(rules[0].value, 3);

  const stronger = {
    ...focus,
    id: "focus2",
    getFlag: () => ({ material: "metal", tier: 6 }),
  };
  const actor = { inventory: { contents: [focus, stronger] } };
  focus.actor = actor;
  stronger.actor = actor;
  assert.deepEqual(buildItemRuleElements(focus, config), []);
  assert.equal(buildItemRuleElements(stronger, config)[0].value, 5);
});

test("equipped metal or leather armor can add dragon-scale resistance", () => {
  const customized = cloneDefaultRulesConfig();
  customized.materials["dragon-scale"].tierBonuses[3] = 7;
  const config = normalizeRulesConfig(customized);
  const armor = {
    actor: {},
    type: "armor",
    id: "armor-dragon",
    name: "Breastplate",
    isEquipped: true,
    getFlag: () => ({
      material: "metal",
      tier: 2,
      dragonScale: { color: "red", tier: 3 },
    }),
  };

  const rules = buildItemRuleElements(armor, config);
  assert.equal(rules.length, 3);
  assert.deepEqual(rules.find((rule) => rule.key === "Resistance"), {
    key: "Resistance",
    type: "fire",
    value: 7,
  });

  armor.isEquipped = false;
  assert.deepEqual(buildItemRuleElements(armor, config), []);
});

test("dragon-scale armor presentation layers its name, rarity, and price", () => {
  class MockCoins {
    constructor({ gp = 0, cp = 0 } = {}) {
      this.gp = gp;
      this.cp = cp;
    }

    plus({ gp = 0, cp = 0 }) {
      return new MockCoins({ gp: this.gp + gp, cp: this.cp + cp });
    }
  }

  const customized = cloneDefaultRulesConfig();
  customized.materials["dragon-scale"].tierBonuses[3] = 7;
  const config = normalizeRulesConfig(customized);
  const armor = {
    type: "armor",
    id: "armor-dragon-presentation",
    name: "+1 Resilient Breastplate",
    isIdentified: true,
    _source: {
      name: "Breastplate",
      system: { price: { value: { gp: 8 } }, traits: { rarity: "common" } },
    },
    system: {
      price: { value: new MockCoins({ gp: 100 }) },
      traits: { rarity: "common" },
    },
    getFlag: () => ({
      material: "metal",
      tier: 2,
      dragonScale: { color: "red", tier: 3 },
    }),
  };

  assert.equal(applyPreparedItemPresentation(armor, config), true);
  assert.equal(armor.name, "Steel Youth Red Dragon Scale Breastplate");
  assert.equal(armor.system.price.value.gp, 125);
  assert.equal(armor.system.traits.rarity, "rare");
});

test("shield Core progression replaces rune progression and is applied only once", () => {
  const config = normalizeRulesConfig(cloneDefaultRulesConfig());
  const item = {
    type: "armor",
    id: "shield-core",
    name: "Steel Shield",
    _source: { name: "Steel Shield" },
    system: {
      category: "shield",
      hardness: 5,
      hp: { max: 20, value: 20, brokenThreshold: 10 },
      price: { value: {} },
      runes: { reinforcing: 2 },
      traits: { rarity: "common" },
    },
    getFlag: () => ({ material: "metal", tier: 3 }),
  };
  assert.equal(applyPreparedItemPresentation(item, config), true);
  assert.equal(item.system.hardness, 11);
  assert.deepEqual(item.system.hp, { max: 80, value: 80, brokenThreshold: 40 });
  assert.equal(item.system.runes.reinforcing, 0);
  applyPreparedItemPresentation(item, config);
  assert.equal(item.system.hardness, 11);
  assert.deepEqual(item.system.hp, { max: 80, value: 80, brokenThreshold: 40 });
});
