const MODULE_ID = "pf2e-crafting-material-tiers";
const BONUS_LEVELS = Object.freeze([1, 5, 9, 13, 17]);

export const APEX_ITEM_FAMILIES = Object.freeze([
  Object.freeze({
    attribute: "str",
    ability: "Strength",
    usage: "wornbelt",
    bulk: 0.1,
    image: "strength.png",
    names: Object.freeze([
      "Ironbound Belt",
      "Stonebreaker Belt",
      "Giantwrought Belt",
      "Titan's Girdle",
      "Worldbearer's Girdle",
    ]),
    flavors: Object.freeze([
      "A compact iron buckle lends surprising weight to this well-oiled leather belt.",
      "Stone-grain plates reinforce this belt, growing warm when its wearer exerts great force.",
      "Oversized links and runic stitching make this belt feel as though it was fashioned for a giant.",
      "This broad girdle carries mountain-shaped engravings that pulse like a slow heartbeat.",
      "The buckle of this legendary girdle depicts a figure supporting the curve of the world.",
    ]),
  }),
  Object.freeze({
    attribute: "dex",
    ability: "Dexterity",
    usage: "wornring",
    bulk: 0,
    image: "dexterity.png",
    names: Object.freeze([
      "Silverwind Signet",
      "Quickstep Ring",
      "Galeweave Signet",
      "Stormdancer Ring",
      "Horizon's Edge Signet",
    ]),
    flavors: Object.freeze([
      "A silver feather curls around this light signet, always pointing into the faintest breeze.",
      "The pale stone in this ring flashes a heartbeat before its wearer begins to move.",
      "Fine strands of silver seem to shift like woven wind along this narrow band.",
      "Tiny arcs of blue light race around this ring whenever its wearer changes direction.",
      "This flawless signet leaves a brief line of dawn-colored light behind every precise gesture.",
    ]),
  }),
  Object.freeze({
    attribute: "con",
    ability: "Constitution",
    usage: "wornamulet",
    bulk: 0,
    image: "constitution.png",
    names: Object.freeze([
      "Hearthstone Amulet",
      "Oakheart Pendant",
      "Lifeforge Amulet",
      "Adamant Heart Torc",
      "Worldroot Amulet",
    ]),
    flavors: Object.freeze([
      "The green stone in this bronze amulet remains pleasantly warm even in bitter cold.",
      "Living oak filigree slowly knots itself around the gem at the center of this pendant.",
      "A steady emerald glow beats within this amulet in time with its wearer's pulse.",
      "This heavy torc feels unyielding, yet settles comfortably against the wearer like a second skin.",
      "Ancient root-shaped gold surrounds a gem that seems to contain an endless green forest.",
    ]),
  }),
  Object.freeze({
    attribute: "int",
    ability: "Intelligence",
    usage: "worncirclet",
    bulk: 0,
    image: "intelligence.png",
    names: Object.freeze([
      "Scholar's Circlet",
      "Runebound Mindband",
      "Mnemonic Circlet",
      "Crown of Living Thought",
      "Diadem of the Infinite Archive",
    ]),
    flavors: Object.freeze([
      "This understated silver circlet sharpens small details at the edge of the wearer's attention.",
      "Violet runes rearrange themselves across this mindband whenever a new problem is considered.",
      "The central sapphire of this circlet stores memories as fleeting patterns of blue light.",
      "Delicate geometric branches unfold from this crown as the wearer's ideas connect.",
      "An impossible library appears in the depths of this diadem's violet gemstone.",
    ]),
  }),
  Object.freeze({
    attribute: "wis",
    ability: "Wisdom",
    usage: "worngarment",
    bulk: 0,
    image: "wisdom.png",
    names: Object.freeze([
      "Wayfinder's Sash",
      "Owlthread Sash",
      "Sage's Woven Sash",
      "Oracle's Moon Sash",
      "Dawnseer's Sash",
    ]),
    flavors: Object.freeze([
      "The embroidered sun on this traveler's sash brightens subtly near a sound path forward.",
      "Owl-feather patterns seem to turn toward movements the wearer has not yet noticed.",
      "Quiet golden threads shift into symbols that reward patience and careful observation.",
      "Moon and cloud motifs drift across this silk sash as possible outcomes are weighed.",
      "At daybreak, the embroidered horizon on this sash shines with calm, revealing light.",
    ]),
  }),
  Object.freeze({
    attribute: "cha",
    ability: "Charisma",
    usage: "worn",
    bulk: 0,
    image: "charisma.png",
    names: Object.freeze([
      "Envoy's Brooch",
      "Silver-Tongue Brooch",
      "Herald's Star",
      "Sovereign's Clasp",
      "Brooch of Crownless Majesty",
    ]),
    flavors: Object.freeze([
      "This polished red-gold brooch catches the eye without overwhelming the wearer's presence.",
      "Warm light gathers in this brooch whenever its wearer finds exactly the right words.",
      "The points of this heraldic star brighten as nearby listeners turn their attention to the wearer.",
      "Regal filigree frames a rose-cut gem whose glow carries quiet authority.",
      "This radiant brooch grants the bearing of a monarch without displaying crown or crest.",
    ]),
  }),
]);

function createDescription(family, bonus, flavor) {
  return [
    `<p>${flavor}</p>`,
    `<p><strong>Wrathmaker Item Boost +${bonus}:</strong> While this Apex item is invested, active, and worn, increase your ${family.ability} modifier by ${bonus}. Wrathmaker applies this as an exact additive increase.</p>`,
    "<p>Use the A beside this attribute on the character sheet to activate it. Wrathmaker Apex items for different attributes can be active together; only the strongest active item for the same attribute applies.</p>",
  ].join("\n");
}

export function createApexItemSources() {
  return APEX_ITEM_FAMILIES.flatMap((family, familyIndex) => family.names.map((name, tierIndex) => {
    const bonus = tierIndex + 1;
    const tier = String(bonus).padStart(2, "0");
    const idAbility = family.attribute[0].toUpperCase() + family.attribute.slice(1);
    return {
      _id: `Wm${idAbility}BoostTier${tier}`,
      img: `modules/${MODULE_ID}/assets/apex-items/${family.image}`,
      name,
      sort: familyIndex * 100_000 + bonus * 10_000,
      system: {
        apex: { attribute: family.attribute },
        baseItem: null,
        bulk: { value: family.bulk },
        containerId: null,
        description: { value: createDescription(family, bonus, family.flavors[tierIndex]) },
        hardness: 0,
        hp: { max: 0, value: 0 },
        level: { value: BONUS_LEVELS[tierIndex] },
        material: { grade: null, type: null },
        price: { value: {} },
        publication: { license: "ORC", remaster: true, title: "Wrathmaker" },
        quantity: 1,
        rules: [],
        size: "med",
        traits: {
          otherTags: ["item-boost"],
          rarity: "rare",
          value: ["apex", "invested", "magical"],
        },
        usage: { value: family.usage },
      },
      type: "equipment",
      flags: {
        [MODULE_ID]: {
          abilityBoost: {
            schemaVersion: 2,
            attribute: family.attribute,
            value: bonus,
            active: false,
          },
        },
      },
    };
  }));
}

export const APEX_ITEM_SOURCES = Object.freeze(createApexItemSources());
