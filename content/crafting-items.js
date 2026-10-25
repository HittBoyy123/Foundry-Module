import { DEFAULT_ITEM_FLAGS } from "../scripts/constants.js";

const MODULE_ID = "pf2e-crafting-material-tiers";

const BASE_CRAFTING_ITEM_SOURCES = Object.freeze([
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
          "<p>This adaptable magical implement might be a wand, rod, orb, engraved tablet, or another object shaped to direct a spellcaster's power. A Mana Gem forms its magical Core; wood, metal, or other materials form the frame.</p>",
          "<p>Choose its <strong>Core Material</strong> and <strong>Tier</strong> on the item sheet. While the focus is held or equipped in its worn slot, the Core grants the spell attack and spell DC bonuses for its tier. If you equip more than one spell focus, only the strongest applies.</p>",
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
        ...JSON.parse(JSON.stringify(DEFAULT_ITEM_FLAGS)),
        material: "mana-crystals",
        crafting: { ...JSON.parse(JSON.stringify(DEFAULT_ITEM_FLAGS.crafting)), core: { materialId: "mana-crystals", tier: 1 } },
      },
    },
  }),
]);

export const KINETIC_ACTUATOR_SOURCES = Object.freeze(Array.from({ length: 6 }, (_, index) => {
  const tier = index + 1;
  const item = structuredClone(BASE_CRAFTING_ITEM_SOURCES[0]);
  item._id = `WmActuator00000${tier}`;
  item.name = `Kineticist Actuator (Tier ${tier})`;
  item.img = "icons/equipment/wrist/bracer-armored-steel.webp";
  item.sort = (tier + 1) * 100000;
  item.system.slug = `kineticist-actuator-tier-${tier}`;
  item.system.level.value = [1,4,8,12,16,20][index];
  item.system.traits.otherTags = ["kinetic-actuator"];
  item.system.usage.value = "worn";
  item.system.description.value = `<p>A crystal regulator steadies the flow of elemental power through your kinetic gate.</p><p>While worn, this actuator grants the configured spell-focus bonus for its tier to <strong>impulse attack rolls (including Elemental Blast) and impulse DCs</strong> instead of spells. The default Tier ${tier} bonus is <strong>+${index}</strong>. Only the strongest worn actuator applies. This is an item bonus and does not stack with another item bonus to the same statistic.</p><p>Craft with an Enchanting lead using 2 Mana Gem units at the core tier and 1 metal or wood frame unit at the normal structural tier. A qualified frame artisan supplies the support role.</p><p>This item grants no Constitution increase, apex benefit, additional impulse damage, or activated spell. A Constitution apex item is a separate item.</p>`;
  item.flags[MODULE_ID].tier = tier;
  item.flags[MODULE_ID].crafting.core.tier = tier;
  return item;
}));

export const CRAFTING_ITEM_SOURCES = Object.freeze([...BASE_CRAFTING_ITEM_SOURCES, ...KINETIC_ACTUATOR_SOURCES]);
