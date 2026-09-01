import {
  HEXPLORATION_PLAN_SCHEMA_VERSION,
  ITEM_SCHEMA_VERSION,
  MODULE_ID,
  RULES_SCHEMA_VERSION,
} from "./constants.js";
import { ABILITY_BOOST_SCHEMA_VERSION, getItemAbilityBoost } from "./ability-boosts.js";
import {
  HERO_POINTS_MAX,
  NEPHILIM_POINTS_MAX,
  NEPHILIM_POINTS_SCHEMA_VERSION,
  getPartyNephilimPoints,
  setPartyNephilimPoints,
} from "./campaign-resources.js";
import { getRulesConfig, resetRulesConfig, setRulesConfig } from "./config-store.js";
import {
  CRAFTING_CATEGORY_SCHEMA_VERSION,
  CRAFTING_RESOURCE_SCHEMA_VERSION,
  categorizeCraftableItem,
  getCraftingRecipeKey,
  getCraftingResourceData,
  listCraftingCategories,
} from "./crafting-categories.js";
import {
  calculateCraftingDC,
  listCraftingDifficultyAdjustments,
} from "./crafting-dc.js";
import {
  CRAFTING_RECIPE_SCHEMA_VERSION,
  evaluateCraftingRecipe,
  normalizeCraftingRecipe,
  summarizeCraftingResources,
} from "./crafting-recipes.js";
import { calculateItemEffects, getCraftingItemType, normalizeItemFlags, normalizeRulesConfig } from "./model.js";
import { buildPartyTravelState } from "./hexploration.js";
import { normalizeHexplorationPlan } from "./hexploration-model.js";
import {
  GATHERING_SCHEMA_VERSION,
  evaluateGatheringTask,
  listTasksForEnvironment,
  normalizeGatheringEnvironment,
  normalizeGatheringTask,
  resolveGatheringOutcome,
} from "./gathering-model.js";
import { openGatheringApplication } from "./gathering.js";
import {
  GATHERING_ENVIRONMENT_SOURCES,
  GATHERING_TASK_SOURCES,
} from "../content/gathering-presets.js";
import { PROFESSION_DEFINITIONS, PROFESSION_SCHEMA_VERSION } from "../content/professions.js";
import {
  clearActorProfession,
  getActorProfession,
  getActorProfessionPlan,
  getActorProfessions,
  openProfessionPicker,
  professionCheckRollOptions,
  professionRankForLevel,
  setActorProfession,
  setActorProfessionPlan,
} from "./professions.js";

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

function requireCharacter(actor) {
  if (actor?.documentName !== "Actor" || actor.type !== "character") {
    throw new TypeError("Expected a PF2e character Actor document.");
  }
  return actor;
}

export function createPublicApi() {
  return Object.freeze({
    moduleId: MODULE_ID,
    abilityBoostSchemaVersion: ABILITY_BOOST_SCHEMA_VERSION,
    heroPointsMax: HERO_POINTS_MAX,
    nephilimPointsMax: NEPHILIM_POINTS_MAX,
    nephilimPointsSchemaVersion: NEPHILIM_POINTS_SCHEMA_VERSION,
    craftingCategorySchemaVersion: CRAFTING_CATEGORY_SCHEMA_VERSION,
    craftingResourceSchemaVersion: CRAFTING_RESOURCE_SCHEMA_VERSION,
    craftingRecipeSchemaVersion: CRAFTING_RECIPE_SCHEMA_VERSION,
    gatheringSchemaVersion: GATHERING_SCHEMA_VERSION,
    professionSchemaVersion: PROFESSION_SCHEMA_VERSION,
    itemSchemaVersion: ITEM_SCHEMA_VERSION,
    rulesSchemaVersion: RULES_SCHEMA_VERSION,
    hexplorationPlanSchemaVersion: HEXPLORATION_PLAN_SCHEMA_VERSION,
    flagsPath: `flags.${MODULE_ID}`,
    craftingResourceFlagsPath: `flags.${MODULE_ID}.resource`,
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

    getItemAbilityBoost(item) {
      requireItem(item);
      return clone(getItemAbilityBoost(item));
    },

    calculateItem(item) {
      requireItem(item);
      return calculateItemEffects({
        itemType: getCraftingItemType(item),
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

    listCraftingCategories() {
      return listCraftingCategories();
    },

    categorizeCraftableItem(item) {
      requireItem(item);
      return categorizeCraftableItem(item);
    },

    getCraftingResourceData(item) {
      requireItem(item);
      return getCraftingResourceData(item);
    },

    getCraftingRecipeKey(item, material) {
      requireItem(item);
      return getCraftingRecipeKey(item, material);
    },

    calculateCraftingDC(tier, adjustment = "normal") {
      return calculateCraftingDC(tier, adjustment);
    },

    calculateResourceCraftingDC(item, adjustment = "normal") {
      requireItem(item);
      const resource = getCraftingResourceData(item);
      return resource ? calculateCraftingDC(resource.tier, adjustment) : null;
    },

    listCraftingDifficultyAdjustments() {
      return listCraftingDifficultyAdjustments();
    },

    validateCraftingRecipe(recipe) {
      return normalizeCraftingRecipe(recipe);
    },

    summarizeCraftingResources(items) {
      return summarizeCraftingResources(items);
    },

    evaluateCraftingRecipe(recipe, options) {
      return evaluateCraftingRecipe(recipe, options);
    },

    listGatheringEnvironments() {
      return clone(GATHERING_ENVIRONMENT_SOURCES);
    },

    listGatheringTasks(environmentId = "") {
      if (!environmentId) return clone(GATHERING_TASK_SOURCES);
      const environment = GATHERING_ENVIRONMENT_SOURCES.find((entry) => entry.id === environmentId);
      return environment ? listTasksForEnvironment(environment, GATHERING_TASK_SOURCES) : [];
    },

    validateGatheringEnvironment(environment) {
      return normalizeGatheringEnvironment(environment);
    },

    validateGatheringTask(task) {
      return normalizeGatheringTask(task);
    },

    evaluateGatheringTask(task, options) {
      return evaluateGatheringTask(task, options);
    },

    resolveGatheringOutcome(task, degree, resource = null) {
      return resolveGatheringOutcome(task, degree, resource);
    },

    openGathering(options = {}) {
      return openGatheringApplication(options);
    },

    listProfessions() {
      return clone(PROFESSION_DEFINITIONS);
    },

    getProfession(actor) {
      requireCharacter(actor);
      const profession = getActorProfession(actor);
      if (!profession) return null;
      const { item, ...data } = profession;
      return { ...clone(data), itemId: item.id };
    },

    getProfessions(actor) {
      requireCharacter(actor);
      return getActorProfessions(actor).map(({ item, selection, ...data }) => ({
        ...clone(data),
        selection: clone(selection),
        itemId: item.id,
      }));
    },

    getProfessionPlan(actor) {
      requireCharacter(actor);
      const plan = getActorProfessionPlan(actor);
      return {
        primaryProfessionId: plan.primary?.id ?? "",
        milestones: clone(plan.milestones),
      };
    },

    professionRankForLevel(level) {
      return professionRankForLevel(level);
    },

    professionCheckRollOptions(actor, context) {
      requireCharacter(actor);
      return professionCheckRollOptions(actor, context);
    },

    async setProfession(actor, professionId) {
      requireCharacter(actor);
      return setActorProfession(actor, professionId);
    },

    async setProfessionPlan(actor, plan) {
      requireCharacter(actor);
      return setActorProfessionPlan(actor, plan);
    },

    async clearProfession(actor) {
      requireCharacter(actor);
      return clearActorProfession(actor);
    },

    openProfessionPicker(actor) {
      requireCharacter(actor);
      return openProfessionPicker(actor);
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

    getNephilimPoints(party) {
      requireParty(party);
      return clone(getPartyNephilimPoints(party));
    },

    async updateNephilimPoints(party, value) {
      requireParty(party);
      return clone(await setPartyNephilimPoints(party, value));
    },
  });
}
