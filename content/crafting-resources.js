import { DEFAULT_RULES_CONFIG, DEFAULT_TIER_PRICES_GP } from "../scripts/constants.js";
import { calculateCraftingDC } from "../scripts/crafting-dc.js";

const MODULE_ID = "pf2e-crafting-material-tiers";
const RESOURCE_SCHEMA_VERSION = 2;

export const RESOURCE_UNIT_PRICES_GP = DEFAULT_TIER_PRICES_GP;

const RESOURCE_FAMILIES = Object.freeze({
  metal: Object.freeze({
    unit: "ingot",
    unitsPerItem: 1,
    name: (label) => `${label} Ingot`,
    icons: Object.freeze([
      "icons/commodities/metal/ingot-iron.webp",
      "icons/commodities/metal/ingot-steel.webp",
      "icons/commodities/metal/ingot-stamped-silver.webp",
      "icons/commodities/metal/ingot-stamped-purple.webp",
      "icons/commodities/metal/ingot-stamped-gold.webp",
      "icons/commodities/metal/ingot-stack-steel-green.webp",
    ]),
  }),
  wood: Object.freeze({
    unit: "lumber",
    unitsPerItem: 1,
    name: (label) => `${label} Lumber`,
    icons: Object.freeze([
      "icons/commodities/wood/lumber-plank-beige.webp",
      "icons/commodities/wood/lumber-stack-brown.webp",
      "icons/commodities/wood/lumber-stack-grey.webp",
      "icons/commodities/wood/log-cut-petrified-violet.webp",
      "icons/commodities/wood/wood-carved-runes.webp",
      "icons/commodities/wood/log-rough-petrified-white.webp",
    ]),
  }),
  stone: Object.freeze({
    unit: "block",
    unitsPerItem: 1,
    name: (label) => `${label} Block`,
    icons: Object.freeze([
      "icons/commodities/stone/masonry-block-cube-beige.webp",
      "icons/commodities/stone/boulder-grey.webp",
      "icons/commodities/stone/geode-raw-black.webp",
      "icons/commodities/stone/engraved-symbol-water-grey.webp",
      "icons/commodities/stone/geode-raw-green.webp",
      "icons/commodities/treasure/stone-cracked-lightning-blue.webp",
    ]),
  }),
  leather: Object.freeze({
    unit: "sheet",
    unitsPerItem: 1,
    name: (label) => `${label} Sheet`,
    icons: Object.freeze([
      "icons/commodities/leather/leather-scrap-tan.webp",
      "icons/commodities/leather/leather-bolt-brown.webp",
      "icons/commodities/leather/leather-studded-tan.webp",
      "icons/commodities/leather/leather-bolt-grey.webp",
      "icons/commodities/leather/leather-pelt-cured.webp",
      "icons/commodities/leather/leather-patchwork-folded-tan.webp",
    ]),
  }),
  herbs: Object.freeze({
    unit: "reagent-bundle",
    unitsPerItem: 1,
    name: (label) => `${label} Bundle`,
    icons: Object.freeze([
      "icons/consumables/plants/basil-herb-green.webp",
      "icons/consumables/mushrooms/campanulate-bell-shiny-red.webp",
      "icons/consumables/plants/dried-herbs-leaves-brown.webp",
      "icons/consumables/mushrooms/umbontae-blue.webp",
      "icons/consumables/mushrooms/umbontae-bumpy-purple.webp",
      "icons/consumables/plants/dried-bundle-stems-sticks-roots-brown.webp",
    ]),
  }),
  "mana-crystals": Object.freeze({
    unit: "mana-lot",
    unitsPerItem: 1,
    name: (label) => `${pluralizeLastWord(label)} (10)`,
    icons: Object.freeze([
      "icons/commodities/gems/gem-faceted-rough-blue.webp",
      "icons/commodities/gems/gem-faceted-rough-green.webp",
      "icons/commodities/gems/gem-faceted-rough-purple.webp",
      "icons/commodities/gems/gem-cluster-teal.webp",
      "icons/commodities/gems/gem-cluster-blue-white.webp",
      "icons/commodities/gems/gem-faceted-radiant-blue.webp",
    ]),
  }),
});

const DRAGON_SCALE_ICONS = Object.freeze({
  black: "icons/commodities/leather/scales-brown.webp",
  blue: "icons/commodities/leather/scales-blue.webp",
  green: "icons/commodities/leather/scales-green.webp",
  red: "icons/creatures/claws/claw-scaled-red.webp",
  white: "icons/commodities/leather/scales-white.webp",
});

function pluralizeLastWord(label) {
  const words = String(label).split(" ");
  const last = words.pop() ?? "";
  words.push(last.endsWith("s") ? last : `${last}s`);
  return words.join(" ");
}

function resourceId(index) {
  return `WmCraftRes${String(index).padStart(6, "0")}`;
}

function resourceDescription({ familyLabel, tier, tierLabel, unit, unitsPerItem, priceGp, variantLabel = "" }) {
  const craftingDC = calculateCraftingDC(tier);
  const quantityText = unitsPerItem === 1
    ? `one ${unit.replaceAll("-", " ")}`
    : `${unitsPerItem} ${pluralizeLastWord(unit.replaceAll("-", " "))}`;
  const variantText = variantLabel ? ` Its ${variantLabel} variety is retained for recipes that care about the resource's origin or damage type.` : "";
  return [
    `<p>A <strong>Tier ${tier}</strong>, <strong>Level ${craftingDC.level}</strong> ${familyLabel.toLowerCase()} crafting resource: <strong>${tierLabel}</strong>.</p>`,
    `<p>Its standard level-based crafting DC is <strong>${craftingDC.baseDC}</strong>. The GM can apply PF2e's Easy, Hard, Very Easy/Hard, or Incredibly Easy/Hard adjustment when the crafting check is made.</p>`,
    `<p>Each point of this item's inventory quantity represents ${quantityText} (0.2 Bulk).${variantText} Wrathmaker records the family, Tier, tags, and unit under module flags so recipes can consume it reliably even if its displayed name is changed.</p>`,
    `<p>The current playtest value is <strong>${priceGp.toLocaleString("en-GB")} gp per Resource Unit</strong>. Five units form one Bulk and are worth ${(priceGp * 5).toLocaleString("en-GB")} gp.</p>`,
  ].join("\n");
}

function createResourceSource({ index, materialId, tier, name, img, unit, unitsPerItem, variantId = "", variantLabel = "" }) {
  const material = DEFAULT_RULES_CONFIG.materials[materialId];
  const tierLabel = material.tierLabels[tier];
  const rarity = material.tierRarities?.[tier] ?? DEFAULT_RULES_CONFIG.tierRarities[tier];
  const otherTags = ["wrathmaker-resource", `material-${materialId}`, `material-tier-${tier}`];
  const craftingDC = calculateCraftingDC(tier);
  const priceGp = RESOURCE_UNIT_PRICES_GP[tier];
  if (variantId) otherTags.push(`material-variant-${variantId}`);

  return Object.freeze({
    _id: resourceId(index),
    img,
    name,
    sort: index * 100_000,
    system: {
      baseItem: null,
      bulk: { value: 0.2 },
      containerId: null,
      description: {
        value: resourceDescription({
          familyLabel: material.label,
          tier,
          tierLabel,
          unit,
          unitsPerItem,
          priceGp,
          variantLabel,
        }),
      },
      equipped: { carryType: "worn" },
      hardness: 0,
      hp: { max: 0, value: 0 },
      level: { value: craftingDC.level },
      material: { grade: null, type: null },
      price: { value: { gp: priceGp } },
      publication: { license: "ORC", remaster: true, title: "Wrathmaker" },
      quantity: 1,
      rules: [],
      size: "med",
      stackGroup: null,
      traits: {
        otherTags,
        rarity,
        value: [],
      },
    },
    type: "treasure",
    flags: {
      [MODULE_ID]: {
        resource: {
          schemaVersion: RESOURCE_SCHEMA_VERSION,
          materialId,
          family: materialId,
          tier,
          unit,
          unitsPerItem,
          variantId,
          bundleSize: 1,
          pricePerUnitGp: priceGp,
          tags: otherTags,
          nativeEffects: [],
          eligibleItemTags: [],
          specialisationHooks: [],
        },
      },
    },
  });
}

function buildResourceSources() {
  const sources = [];
  let index = 1;

  for (const [materialId, family] of Object.entries(RESOURCE_FAMILIES)) {
    const material = DEFAULT_RULES_CONFIG.materials[materialId];
    for (let tier = 1; tier <= 6; tier += 1) {
      const tierLabel = material.tierLabels[tier];
      sources.push(createResourceSource({
        index,
        materialId,
        tier,
        name: family.name(tierLabel),
        img: family.icons[tier - 1],
        unit: family.unit,
        unitsPerItem: family.unitsPerItem,
      }));
      index += 1;
    }
  }

  const dragonScales = DEFAULT_RULES_CONFIG.materials["dragon-scale"];
  for (const [colorId, color] of Object.entries(dragonScales.colors)) {
    for (let tier = 1; tier <= 6; tier += 1) {
      const tierLabel = dragonScales.tierLabels[tier];
      sources.push(createResourceSource({
        index,
        materialId: "dragon-scale",
        tier,
        name: `${tierLabel} ${color.label} Dragon Scales (5)`,
        img: DRAGON_SCALE_ICONS[colorId],
        unit: "dragon-scale",
        unitsPerItem: 1,
        variantId: colorId,
        variantLabel: color.label,
      }));
      index += 1;
    }
  }

  return sources;
}

export const CRAFTING_RESOURCE_SCHEMA_VERSION = RESOURCE_SCHEMA_VERSION;
export const CRAFTING_RESOURCE_SOURCES = Object.freeze(buildResourceSources());
