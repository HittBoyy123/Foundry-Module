import { CRAFTING_RESOURCE_SOURCES } from "./crafting-resources.js";

const ENVIRONMENTS_BY_MATERIAL = Object.freeze({
  metal: Object.freeze(["mountains", "underground"]),
  wood: Object.freeze(["forest", "wetlands"]),
  stone: Object.freeze(["mountains", "underground"]),
  leather: Object.freeze(["forest", "plains", "wetlands"]),
  herbs: Object.freeze(["forest", "plains", "wetlands", "arcane-nexus"]),
  "mana-crystals": Object.freeze(["underground", "arcane-nexus"]),
  "dragon-scale": Object.freeze(["dragon-hunting-grounds"]),
});

const SKILL_BY_MATERIAL = Object.freeze({
  metal: "crafting",
  wood: "nature",
  stone: "crafting",
  leather: "survival",
  herbs: "nature",
  "mana-crystals": "arcana",
  "dragon-scale": "survival",
});

export const GATHERING_ENVIRONMENT_SOURCES = Object.freeze([
  Object.freeze({
    id: "forest",
    name: "Forest",
    description: "Gather timber, useful plants, mushrooms, and hides from wooded terrain.",
    img: "icons/environment/wilderness/tree-oak.webp",
    enabled: true,
    selectionMode: "targeted",
    biomeIds: ["forest"],
  }),
  Object.freeze({
    id: "plains",
    name: "Plains",
    description: "Forage herbs and hunt creatures across grassland and open country.",
    img: "icons/environment/wilderness/terrain-field-grass.webp",
    enabled: true,
    selectionMode: "targeted",
    biomeIds: ["plains"],
  }),
  Object.freeze({
    id: "mountains",
    name: "Mountains",
    description: "Prospect for ore and stone among exposed cliffs and high passes.",
    img: "icons/environment/wilderness/mountain.webp",
    enabled: true,
    selectionMode: "targeted",
    biomeIds: ["mountains"],
  }),
  Object.freeze({
    id: "wetlands",
    name: "Wetlands",
    description: "Search marshes and riverlands for flexible wood, reagents, and hides.",
    img: "icons/environment/wilderness/terrain-swamp.webp",
    enabled: true,
    selectionMode: "targeted",
    biomeIds: ["wetlands"],
  }),
  Object.freeze({
    id: "underground",
    name: "Underground",
    description: "Mine ore, stone, and magical crystal deposits below the surface.",
    img: "icons/environment/wilderness/cave-entrance-mountain-blue.webp",
    enabled: true,
    selectionMode: "targeted",
    biomeIds: ["underground"],
  }),
  Object.freeze({
    id: "arcane-nexus",
    name: "Arcane Nexus",
    description: "Collect magically altered flora and condensed mana around a place of power.",
    img: "icons/magic/symbols/runes-star-pentagon-magenta.webp",
    enabled: true,
    selectionMode: "targeted",
    biomeIds: ["magical"],
  }),
  Object.freeze({
    id: "dragon-hunting-grounds",
    name: "Dragon Hunting Grounds",
    description: "Harvest scales from a defeated or otherwise available dragon source with GM approval.",
    img: "icons/creatures/reptiles/dragon-horned-blue.webp",
    enabled: true,
    selectionMode: "targeted",
    biomeIds: ["dragon"],
  }),
]);

function resourceData(source) {
  return source.flags["pf2e-crafting-material-tiers"].resource;
}

function buildGatheringTasks() {
  return CRAFTING_RESOURCE_SOURCES.map((resource) => {
    const data = resourceData(resource);
    const environments = ENVIRONMENTS_BY_MATERIAL[data.materialId] ?? [];
    return Object.freeze({
      id: `gather-${resource._id.toLowerCase()}`,
      name: `Gather ${resource.name}`,
      description: `Search this environment for ${resource.name}. The check DC is based on its Tier ${data.tier} resource level.`,
      img: resource.img,
      enabled: true,
      environmentIds: [...environments],
      materialId: data.materialId,
      tier: data.tier,
      variantId: data.variantId,
      check: Object.freeze({
        skill: SKILL_BY_MATERIAL[data.materialId],
        adjustment: "normal",
      }),
      yields: Object.freeze({
        criticalFailure: 0,
        failure: 0,
        success: 1,
        criticalSuccess: 2,
      }),
      timeMinutes: 60,
      requiredToolUuids: Object.freeze([]),
    });
  });
}

export const GATHERING_TASK_SOURCES = Object.freeze(buildGatheringTasks());
