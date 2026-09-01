const MODULE_ID = "pf2e-crafting-material-tiers";

export const PROFESSION_SCHEMA_VERSION = 1;

export const PF2E_PROFESSION_FEAT_UUIDS = Object.freeze({
  additionalLore: "Compendium.pf2e.feats-srd.Item.BocFD2KV0qgUC76x",
  specialtyCrafting: "Compendium.pf2e.feats-srd.Item.QLeMH5mQgh28sa5o",
  quickRepair: "Compendium.pf2e.feats-srd.Item.ASy9AKEIRxPYUi5o",
  alchemicalCrafting: "Compendium.pf2e.feats-srd.Item.is3Oz9wt11lNq62K",
  magicalCrafting: "Compendium.pf2e.feats-srd.Item.xWY5omyIcILNR7y1",
  experiencedTracker: "Compendium.pf2e.feats-srd.Item.urQZwmzg2kS53vd5",
  heftyHauler: "Compendium.pf2e.feats-srd.Item.C0Tcelg3BAPhML6J",
});

const PLACEHOLDER_SPECIALTIES = Object.freeze([
  Object.freeze({ id: "specialty-1", label: "Specialty I", description: "To be determined by the GM." }),
  Object.freeze({ id: "specialty-2", label: "Specialty II", description: "To be determined by the GM." }),
  Object.freeze({ id: "specialty-3", label: "Specialty III", description: "To be determined by the GM." }),
]);

export const PROFESSION_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "blacksmithing",
    name: "Blacksmithing",
    loreName: "Blacksmithing Lore",
    craftingSpecialty: "blacksmithing",
    materialIds: Object.freeze(["metal"]),
    bonusFeatUuid: PF2E_PROFESSION_FEAT_UUIDS.quickRepair,
    bonusFeatName: "Quick Repair",
    img: "icons/tools/smithing/anvil.webp",
  }),
  Object.freeze({
    id: "alchemy",
    name: "Alchemy",
    loreName: "Alchemy Lore",
    craftingSpecialty: "alchemy",
    materialIds: Object.freeze(["herbs"]),
    bonusFeatUuid: PF2E_PROFESSION_FEAT_UUIDS.alchemicalCrafting,
    bonusFeatName: "Alchemical Crafting",
    img: "icons/consumables/potions/potion-bottle-corked-fumes-blue.webp",
  }),
  Object.freeze({
    id: "enchanting",
    name: "Enchanting",
    loreName: "Enchanting Lore",
    craftingSpecialty: "enchanting",
    materialIds: Object.freeze(["mana-crystals"]),
    bonusFeatUuid: PF2E_PROFESSION_FEAT_UUIDS.magicalCrafting,
    bonusFeatName: "Magical Crafting",
    img: "icons/magic/symbols/runes-star-pentagon-magenta.webp",
  }),
  Object.freeze({
    id: "leatherwork",
    name: "Leatherwork",
    loreName: "Leatherworking Lore",
    craftingSpecialty: "leatherworking",
    materialIds: Object.freeze(["leather", "dragon-scale"]),
    bonusFeatUuid: PF2E_PROFESSION_FEAT_UUIDS.experiencedTracker,
    bonusFeatName: "Experienced Tracker",
    img: "icons/tools/hand/needle-grey.webp",
  }),
  Object.freeze({
    id: "carpentry",
    name: "Carpentry",
    loreName: "Carpentry Lore",
    craftingSpecialty: "woodworking",
    materialIds: Object.freeze(["wood"]),
    bonusFeatUuid: PF2E_PROFESSION_FEAT_UUIDS.heftyHauler,
    bonusFeatName: "Hefty Hauler",
    img: "icons/tools/hand/hammer-and-nail.webp",
  }),
  Object.freeze({
    id: "stonemason",
    name: "Stonemasonry",
    loreName: "Stonemasonry Lore",
    craftingSpecialty: "stonemasonry",
    materialIds: Object.freeze(["stone"]),
    bonusFeatUuid: "",
    bonusFeatName: "To be determined",
    img: "icons/tools/hand/chisel-steel-brown.webp",
  }),
  Object.freeze({
    id: "glassmaking",
    name: "Glassmaking",
    loreName: "Glassmaking Lore",
    craftingSpecialty: "glassmaking",
    materialIds: Object.freeze([]),
    bonusFeatUuid: "",
    bonusFeatName: "To be determined",
    img: "icons/commodities/materials/glass-orb-blue.webp",
  }),
  Object.freeze({
    id: "pottery",
    name: "Pottery",
    loreName: "Pottery Lore",
    craftingSpecialty: "pottery",
    materialIds: Object.freeze([]),
    bonusFeatUuid: "",
    bonusFeatName: "To be determined",
    img: "icons/containers/kitchenware/jug-terracotta.webp",
  }),
  Object.freeze({
    id: "weaving",
    name: "Weaving",
    loreName: "Weaving Lore",
    craftingSpecialty: "weaving",
    materialIds: Object.freeze([]),
    bonusFeatUuid: "",
    bonusFeatName: "To be determined",
    img: "icons/tools/hand/needle-grey.webp",
  }),
  Object.freeze({
    id: "bookmaking",
    name: "Bookmaking",
    loreName: "Bookmaking Lore",
    craftingSpecialty: "bookmaking",
    materialIds: Object.freeze([]),
    bonusFeatUuid: "",
    bonusFeatName: "To be determined",
    img: "icons/sundries/books/book-tooled-gold-brown.webp",
  }),
  Object.freeze({
    id: "tailoring",
    name: "Tailoring",
    loreName: "Tailoring Lore",
    craftingSpecialty: "tailoring",
    materialIds: Object.freeze([]),
    bonusFeatUuid: "",
    bonusFeatName: "To be determined",
    img: "icons/tools/hand/scissors-steel-grey.webp",
  }),
].map((profession) => Object.freeze({
  ...profession,
  checkBonus: 2,
  checkBonusType: "circumstance",
  specialties: PLACEHOLDER_SPECIALTIES,
})));

const PROFESSION_CHECK_SELECTORS = Object.freeze(["arcana", "crafting", "nature", "survival"]);

function professionDescription(profession) {
  const bonusFeat = profession.bonusFeatUuid
    ? `<li><strong>Additional feat:</strong> ${profession.bonusFeatName}</li>`
    : "<li><strong>Additional feat:</strong> To be determined</li>";
  const specialties = profession.specialties
    .map((specialty) => `<li>${specialty.label}: ${specialty.description}</li>`)
    .join("");

  return [
    `<p><strong>${profession.name} Profession</strong></p>`,
    "<p>This is a Wrathmaker profession chosen at 1st level. It supplies the appropriate Specialty Crafting benefit and Additional Lore for the profession.</p>",
    "<ul>",
    `<li><strong>Profession Lore:</strong> ${profession.loreName}</li>`,
    "<li><strong>Automatic Lore proficiency:</strong> trained at level 1, expert at level 4, master at level 10, and legendary at level 16.</li>",
    `<li><strong>Relevant profession checks:</strong> +${profession.checkBonus} ${profession.checkBonusType} bonus.</li>`,
    bonusFeat,
    "</ul>",
    "<p><strong>Future subcategories</strong></p>",
    `<ol>${specialties}</ol>`,
  ].join("\n");
}

function professionRules(profession) {
  return [
    {
      key: "RollOption",
      domain: "all",
      option: `wrathmaker:profession:${profession.id}`,
    },
    {
      key: "FlatModifier",
      label: `${profession.name} Profession`,
      selector: `${profession.id}-lore`,
      type: profession.checkBonusType,
      value: profession.checkBonus,
    },
    ...PROFESSION_CHECK_SELECTORS.map((selector) => ({
      key: "FlatModifier",
      label: `${profession.name} Profession`,
      predicate: [`wrathmaker:profession-check:${profession.id}`],
      selector,
      type: profession.checkBonusType,
      value: profession.checkBonus,
    })),
  ];
}

export function createProfessionItemSources() {
  return PROFESSION_DEFINITIONS.map((profession, index) => ({
    _id: `WmProfession${String(index + 1).padStart(4, "0")}`,
    img: profession.img,
    name: profession.name,
    sort: (index + 1) * 10_000,
    system: {
      actionType: { value: "passive" },
      actions: { value: null },
      category: "bonus",
      description: { value: professionDescription(profession) },
      level: { value: 1 },
      maxTakable: 1,
      prerequisites: { value: [] },
      publication: { license: "ORC", remaster: true, title: "Wrathmaker" },
      rules: professionRules(profession),
      slug: `wrathmaker-profession-${profession.id}`,
      traits: { rarity: "common", value: ["general", "skill"] },
    },
    type: "feat",
    flags: {
      [MODULE_ID]: {
        profession: {
          schemaVersion: PROFESSION_SCHEMA_VERSION,
          id: profession.id,
          loreName: profession.loreName,
          craftingSpecialty: profession.craftingSpecialty,
          materialIds: [...profession.materialIds],
          checkBonus: profession.checkBonus,
          checkBonusType: profession.checkBonusType,
          bonusFeatUuid: profession.bonusFeatUuid,
          bonusFeatName: profession.bonusFeatName,
          specialties: profession.specialties.map((specialty) => ({ ...specialty })),
        },
      },
    },
  }));
}

export const PROFESSION_ITEM_SOURCES = Object.freeze(createProfessionItemSources());
