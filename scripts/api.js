import {
  HEXPLORATION_PLAN_SCHEMA_VERSION,
  ITEM_SCHEMA_VERSION,
  MODULE_ID,
  RULES_SCHEMA_VERSION,
} from "./constants.js";
import { getRulesConfig, resetRulesConfig, setRulesConfig } from "./config-store.js";
import { calculateItemEffects, normalizeItemFlags, normalizeRulesConfig } from "./model.js";
import { buildPartyTravelState } from "./hexploration.js";
import { normalizeHexplorationPlan } from "./hexploration-model.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireItem(item) {
  if (item?.documentName !== "Item") throw new TypeError("Expected a Foundry Item document.");
  return item;
}

function requireParty(actor) {
  if (actor?.documentName !== "Actor" || actor.type !== "party") {
    throw new TypeError("Expected a PF2e Party actor document.");
  }
  return actor;
}

export function createPublicApi() {
  return Object.freeze({
    moduleId: MODULE_ID,
    itemSchemaVersion: ITEM_SCHEMA_VERSION,
    rulesSchemaVersion: RULES_SCHEMA_VERSION,
    hexplorationPlanSchemaVersion: HEXPLORATION_PLAN_SCHEMA_VERSION,
    flagsPath: `flags.${MODULE_ID}`,
    hexplorationFlagsPath: `flags.${MODULE_ID}.hexploration`,

    getRulesConfig() {
      return clone(getRulesConfig());
    },

    validateRulesConfig(value) {
      return clone(normalizeRulesConfig(value));
    },

    async setRulesConfig(value) {
      return clone(await setRulesConfig(value));
    },

    async resetRulesConfig() {
      return clone(await resetRulesConfig());
    },

    async registerMaterial(materialId, definition) {
      const config = clone(getRulesConfig());
      config.materials[materialId] = clone(definition);
      return clone(await setRulesConfig(config));
    },

    getItemData(item) {
      requireItem(item);
      return normalizeItemFlags(item.getFlag(MODULE_ID), getRulesConfig());
    },

    calculateItem(item) {
      requireItem(item);
      return calculateItemEffects({
        itemType: item.type,
        itemId: item.id ?? item._id ?? "item",
        itemName: item.name,
        flags: item.getFlag(MODULE_ID),
        config: getRulesConfig(),
      });
    },

    async updateItem(item, changes) {
      requireItem(item);
      const current = normalizeItemFlags(item.getFlag(MODULE_ID), getRulesConfig());
      const next = normalizeItemFlags({ ...current, ...changes }, getRulesConfig());
      await item.update({ [`flags.${MODULE_ID}`]: next });
      return next;
    },

    getHexplorationPlan(party) {
      requireParty(party);
      return normalizeHexplorationPlan(party.getFlag(MODULE_ID, "hexploration"));
    },

    calculateHexploration(party) {
      requireParty(party);
      return clone(buildPartyTravelState(party, getRulesConfig().hexploration));
    },

    async updateHexplorationPlan(party, changes) {
      requireParty(party);
      const current = normalizeHexplorationPlan(party.getFlag(MODULE_ID, "hexploration"));
      const incoming = clone(changes ?? {});
      const next = normalizeHexplorationPlan({
        ...current,
        ...incoming,
        travelModifiers: {
          ...current.travelModifiers,
          ...incoming.travelModifiers,
          expressRider: {
            ...current.travelModifiers.expressRider,
            ...incoming.travelModifiers?.expressRider,
          },
          other: {
            ...current.travelModifiers.other,
            ...incoming.travelModifiers?.other,
          },
        },
      });
      await party.setFlag(MODULE_ID, "hexploration", next);
      return clone(next);
    },
  });
}
