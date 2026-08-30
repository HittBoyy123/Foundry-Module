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
  assert.equal(prepared.length, 2);
  assert.equal(prepared[0].key, "ExistingRule");
  assert.equal(prepared[1].key, "FlatModifier");
  assert.equal(prepared[1].value, 2);
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
  assert.equal(item.name, "+1 Striking Steel Bastard Sword");
  assert.equal(item.system.price.value.gp, 110);
  assert.equal(item.system.traits.rarity, "uncommon");
  assert.equal(item._source.name, "Bastard Sword");
  assert.deepEqual(item._source.system.price.value, { gp: 4 });
  assert.equal(item._source.system.traits.rarity, "common");

  applyPreparedItemPresentation(item, config);
  assert.equal(item.name, "+1 Striking Steel Bastard Sword");
  assert.equal(item.system.price.value.gp, 110);
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
  assert.equal(rules.length, 1);
  assert.deepEqual(rules[0].selector, ["ac"]);
  assert.equal(rules[0].value, 1);
});
