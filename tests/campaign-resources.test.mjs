import assert from "node:assert/strict";
import test from "node:test";

import {
  HERO_POINTS_MAX,
  NEPHILIM_POINTS_MAX,
  applyHeroPointMaximum,
  getPartyNephilimPoints,
  installCampaignResourceBridge,
  normalizeNephilimPoints,
  setPartyNephilimPoints,
} from "../scripts/campaign-resources.js";

const MODULE_ID = "pf2e-crafting-material-tiers";

test("Hero Points use a persistent prepared maximum of 10", () => {
  const actor = {
    type: "character",
    system: { resources: { heroPoints: { value: 7, max: 3 } } },
  };
  assert.equal(applyHeroPointMaximum(actor), true);
  assert.deepEqual(actor.system.resources.heroPoints, { value: 7, max: HERO_POINTS_MAX });

  actor.system.resources.heroPoints.value = 14;
  applyHeroPointMaximum(actor);
  assert.deepEqual(actor.system.resources.heroPoints, { value: 10, max: HERO_POINTS_MAX });
});

test("the Hero Point bridge overrides PF2e's prepared cap without replacing its preparation", () => {
  const previousConfig = globalThis.CONFIG;
  class CharacterDocument {
    prepareBaseData() {
      this.system.resources.heroPoints.max = 3;
      return "prepared";
    }
  }

  globalThis.CONFIG = { PF2E: { Actor: { documentClasses: { character: CharacterDocument } } } };
  try {
    assert.equal(installCampaignResourceBridge(), true);
    assert.equal(installCampaignResourceBridge(), true);
    const actor = Object.assign(new CharacterDocument(), {
      type: "character",
      system: { resources: { heroPoints: { value: 8, max: 3 } } },
    });
    assert.equal(actor.prepareBaseData(), "prepared");
    assert.deepEqual(actor.system.resources.heroPoints, { value: 8, max: 10 });
  } finally {
    globalThis.CONFIG = previousConfig;
  }
});

test("Nephilim Points are normalized and stored on the party up to 10", async () => {
  assert.deepEqual(normalizeNephilimPoints(4), { schemaVersion: 1, value: 4, max: NEPHILIM_POINTS_MAX });
  assert.deepEqual(normalizeNephilimPoints({ value: 99 }), { schemaVersion: 1, value: 10, max: 10 });
  assert.deepEqual(normalizeNephilimPoints({ value: -3 }), { schemaVersion: 1, value: 0, max: 10 });

  const flags = {};
  const party = {
    flags: { [MODULE_ID]: flags },
    getFlag: (_moduleId, key) => flags[key],
    async setFlag(_moduleId, key, value) {
      flags[key] = value;
    },
  };
  assert.deepEqual(getPartyNephilimPoints(party), { schemaVersion: 1, value: 0, max: 10 });
  assert.deepEqual(await setPartyNephilimPoints(party, 6), { schemaVersion: 1, value: 6, max: 10 });
  assert.deepEqual(getPartyNephilimPoints(party), { schemaVersion: 1, value: 6, max: 10 });
});
