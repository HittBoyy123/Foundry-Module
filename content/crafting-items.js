const MODULE_ID = "pf2e-crafting-material-tiers";

export const CRAFTING_ITEM_SOURCES = Object.freeze([
  Object.freeze({
    _id: "WmSpellFocus0001",
    img: "icons/weapons/wands/wand-gem-violet.webp",
    name: "Spell Focus",
    sort: 100_000,
    system: {
      baseItem: null,
      bulk: { value: 0.1 },
      containerId: null,
      description: {
        value: [
          "<p>This adaptable magical implement might be a wand, rod, orb, engraved tablet, or another object shaped to direct a spellcaster's power. It can be crafted from metal or wood.</p>",
          "<p>Choose its <strong>Material</strong> and <strong>Tier</strong> on the item sheet. While the focus is held in one hand, Wrathmaker applies the material's tier bonus to all of your spell attack rolls and spell DCs. Tier 1 grants no bonus; Tiers 2–6 grant +1 through +5 respectively. If you hold more than one spell focus, only the strongest applies.</p>",
          "<p>The crafted material name, added price, and rarity are prepared automatically without changing the item's PF2e source data.</p>",
        ].join("\n"),
      },
      hardness: 0,
      hp: { max: 0, value: 0 },
      level: { value: 0 },
      material: { grade: null, type: null },
      price: { value: {} },
      publication: { license: "ORC", remaster: true, title: "Wrathmaker" },
      quantity: 1,
      rules: [],
      size: "med",
      traits: {
        otherTags: ["spell-focus"],
        rarity: "common",
        value: ["magical"],
      },
      usage: { value: "held-in-one-hand" },
    },
    type: "equipment",
    flags: {
      [MODULE_ID]: {
        schemaVersion: 3,
        material: "metal",
        tier: 1,
        dragonScale: { color: "", tier: 1 },
      },
    },
  }),
]);
