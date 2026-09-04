export const ARTISAN_MARK_SCHEMA_VERSION = 1;

export const ARTISAN_MARK_GRADE_RULES = Object.freeze({
  "minor": {
    "label": "Minor",
    "capacityCost": 0,
    "minimumAnchorTier": 1,
    "materialUnits": 0,
    "materialTierOffset": 0,
    "artisanDayMultiplier": 1
  },
  "standard": {
    "label": "Standard",
    "capacityCost": 1,
    "minimumAnchorTier": 2,
    "materialUnits": 1,
    "materialTierOffset": -1,
    "artisanDayMultiplier": 1
  },
  "major": {
    "label": "Major",
    "capacityCost": 2,
    "minimumAnchorTier": 3,
    "materialUnits": 1,
    "materialTierOffset": 0,
    "artisanDayMultiplier": 2
  },
  "superior": {
    "label": "Superior",
    "capacityCost": 3,
    "minimumAnchorTier": 4,
    "materialUnits": 2,
    "materialTierOffset": 0,
    "artisanDayMultiplier": 4
  }
});

export const ARTISAN_PROFESSION_RULES = Object.freeze({
  "blacksmithing": {
    "label": "Blacksmithing",
    "materialIds": [
      "metal"
    ],
    "anchorSlotTypes": [
      "core",
      "mechanism",
      "fittings",
      "frame"
    ],
    "itemGroups": [
      "weapon",
      "armor",
      "shield",
      "spellFocus"
    ]
  },
  "alchemy": {
    "label": "Alchemy",
    "materialIds": [
      "herbs"
    ],
    "anchorSlotTypes": [
      "core",
      "reagent",
      "catalyst",
      "lining"
    ],
    "itemGroups": []
  },
  "enchanting": {
    "label": "Enchanting",
    "materialIds": [
      "mana-crystals",
      "stone"
    ],
    "anchorSlotTypes": [
      "core",
      "catalyst",
      "lens",
      "frame"
    ],
    "itemGroups": [
      "weapon",
      "armor",
      "shield",
      "spellFocus"
    ]
  },
  "leatherwork": {
    "label": "Leatherwork",
    "materialIds": [
      "leather",
      "dragon-scale"
    ],
    "anchorSlotTypes": [
      "core",
      "grip",
      "strap",
      "straps",
      "backing",
      "lining",
      "wrap",
      "cover"
    ],
    "itemGroups": [
      "weapon",
      "armor",
      "shield",
      "spellFocus"
    ]
  },
  "carpentry": {
    "label": "Carpentry",
    "materialIds": [
      "wood"
    ],
    "anchorSlotTypes": [
      "core",
      "haft",
      "stock",
      "staff",
      "frame",
      "grip"
    ],
    "itemGroups": [
      "weapon",
      "shield",
      "spellFocus"
    ]
  },
  "stonemason": {
    "label": "Stonemasonry",
    "materialIds": [
      "stone"
    ],
    "anchorSlotTypes": [
      "core",
      "frame",
      "fittings",
      "lens"
    ],
    "itemGroups": [
      "weapon",
      "armor",
      "shield",
      "spellFocus"
    ]
  },
  "glassmaking": {
    "label": "Glassmaking",
    "materialIds": [
      "stone",
      "mana-crystals"
    ],
    "anchorSlotTypes": [
      "lens",
      "catalyst",
      "core"
    ],
    "itemGroups": [
      "spellFocus"
    ]
  },
  "pottery": {
    "label": "Pottery",
    "materialIds": [
      "stone",
      "herbs",
      "mana-crystals"
    ],
    "anchorSlotTypes": [
      "core",
      "catalyst",
      "reagent"
    ],
    "itemGroups": [
      "armor",
      "spellFocus"
    ]
  },
  "weaving": {
    "label": "Weaving",
    "materialIds": [
      "herbs",
      "leather",
      "mana-crystals"
    ],
    "anchorSlotTypes": [
      "string",
      "lining",
      "backing",
      "wrap",
      "strap",
      "straps",
      "core"
    ],
    "itemGroups": [
      "weapon",
      "armor",
      "shield",
      "spellFocus"
    ]
  },
  "bookmaking": {
    "label": "Bookmaking",
    "materialIds": [
      "wood",
      "leather",
      "herbs",
      "mana-crystals"
    ],
    "anchorSlotTypes": [
      "core",
      "cover",
      "catalyst"
    ],
    "itemGroups": [
      "spellFocus"
    ]
  },
  "tailoring": {
    "label": "Tailoring",
    "materialIds": [
      "herbs",
      "leather",
      "mana-crystals"
    ],
    "anchorSlotTypes": [
      "lining",
      "backing",
      "wrap",
      "cover",
      "core"
    ],
    "itemGroups": [
      "armor",
      "spellFocus"
    ]
  }
});

export const SPECIALISATION_FEATURES = Object.freeze([
  {
    "professionId": "blacksmithing",
    "profession": "Blacksmithing",
    "specializationId": "specialty-1",
    "specialization": "Hellforging",
    "domain": "Metal weapons, armour, shields, mechanisms and reinforced components.",
    "stages": {
      "signature": {
        "name": "Infernal Temper",
        "description": "Create Hellforged equipment built around fire, blood, fear, retaliation and dangerous power."
      },
      "mastery": {
        "name": "Furnace Without Mercy",
        "description": "Reduce Hellforging special-resource cost by 20%; at high tier recover 50% of rare infernal components from dismantled Hellforged gear."
      },
      "legacy": {
        "name": "Infernal Foundry",
        "description": "Supports elite army weapons, infernal siege ammunition and intimidating military infrastructure."
      }
    }
  },
  {
    "professionId": "blacksmithing",
    "profession": "Blacksmithing",
    "specializationId": "specialty-2",
    "specialization": "Radiant Forging",
    "domain": "Metal weapons, armour, shields, mechanisms and reinforced components.",
    "stages": {
      "signature": {
        "name": "Radiant Temper",
        "description": "Create protective, cleansing and celestial equipment, especially effective against undead, fiends and corruption."
      },
      "mastery": {
        "name": "Purified Forge",
        "description": "Reduce sacred/celestial resource waste by 20% and improve repairs to Radiant equipment."
      },
      "legacy": {
        "name": "Beacon Works",
        "description": "Supports hospitals, temples, settlement wards, anti-undead defences and sacred military equipment."
      }
    }
  },
  {
    "professionId": "blacksmithing",
    "profession": "Blacksmithing",
    "specializationId": "specialty-3",
    "specialization": "Azlanti Artifice",
    "domain": "Metal weapons, armour, shields, mechanisms and reinforced components.",
    "stages": {
      "signature": {
        "name": "Lost Artifice",
        "description": "Reverse-engineer ancient technology, repair magitek and invent designs beyond normal PF2e equipment lists."
      },
      "mastery": {
        "name": "Reverse Engineering",
        "description": "Preserve the original device while producing a reusable blueprint; repeat builds take 25% less downtime."
      },
      "legacy": {
        "name": "Arcane Industrialisation",
        "description": "Enables automated workshops, magical power, transport, constructs and advanced siege technology."
      }
    }
  },
  {
    "professionId": "alchemy",
    "profession": "Alchemy",
    "specializationId": "specialty-1",
    "specialization": "Grand Apothecary",
    "domain": "Potions, elixirs, toxins, biological reagents and material transformation.",
    "stages": {
      "signature": {
        "name": "Refined Formula",
        "description": "Customise medicines, potions and elixirs for potency, duration, administration and recovery."
      },
      "mastery": {
        "name": "Batch Distillation",
        "description": "Produce 25% more doses from the same material input."
      },
      "legacy": {
        "name": "Royal Apothecary",
        "description": "Supports hospitals, military medicine, plague response and settlement recovery."
      }
    }
  },
  {
    "professionId": "alchemy",
    "profession": "Alchemy",
    "specializationId": "specialty-2",
    "specialization": "Venomcraft",
    "domain": "Potions, elixirs, toxins, biological reagents and material transformation.",
    "stages": {
      "signature": {
        "name": "Toxin Refinement",
        "description": "Customise poisons by delivery, onset, target profile, stages and concealment."
      },
      "mastery": {
        "name": "Venom Harvesting",
        "description": "Gain 25% more usable poison material from venomous creatures and reduce poison resource cost by 15%."
      },
      "legacy": {
        "name": "Master Toxicologist",
        "description": "Supports antivenom, pest control, military toxins and intelligence operations."
      }
    }
  },
  {
    "professionId": "alchemy",
    "profession": "Alchemy",
    "specializationId": "specialty-3",
    "specialization": "Transmutative Alchemy",
    "domain": "Potions, elixirs, toxins, biological reagents and material transformation.",
    "stages": {
      "signature": {
        "name": "Material Transmutation",
        "description": "Convert resource families and create composite materials for other artisans."
      },
      "mastery": {
        "name": "The Great Work",
        "description": "Standard conversion is 2 units into 1 equal-tier unit; mastered high-tier conversions can improve to 3 into 2."
      },
      "legacy": {
        "name": "Transmutation Industry",
        "description": "Converts surplus Kingdom resources and enables specialised industrial projects."
      }
    }
  },
  {
    "professionId": "enchanting",
    "profession": "Enchanting",
    "specializationId": "specialty-1",
    "specialization": "Aethercasting",
    "domain": "Magical matrices, numerical empowerment, bound essence and runic logic.",
    "stages": {
      "signature": {
        "name": "Empowerment",
        "description": "Create statistic-enhancing and magically sustained equipment that can intentionally push beyond ordinary PF2e ceilings."
      },
      "mastery": {
        "name": "Aether Refinement",
        "description": "Upgrade an existing Empowerment by paying only the material difference and half normal upgrade downtime."
      },
      "legacy": {
        "name": "Permanent Enchantment",
        "description": "Supports wards, magical utilities, powered workshops and settlement infrastructure."
      }
    }
  },
  {
    "professionId": "enchanting",
    "profession": "Enchanting",
    "specializationId": "specialty-2",
    "specialization": "Essencebinding",
    "domain": "Magical matrices, numerical empowerment, bound essence and runic logic.",
    "stages": {
      "signature": {
        "name": "Bind Essence",
        "description": "Add traits and supernatural creature/material properties the base item does not normally possess."
      },
      "mastery": {
        "name": "Deep Binding",
        "description": "Higher-tier work supports stronger creature-derived properties and more complex essence interactions."
      },
      "legacy": {
        "name": "Essence Workshops",
        "description": "Converts monster, planar and environmental essences into reusable crafting components."
      }
    }
  },
  {
    "professionId": "enchanting",
    "profession": "Enchanting",
    "specializationId": "specialty-3",
    "specialization": "Runecarving",
    "domain": "Magical matrices, numerical empowerment, bound essence and runic logic.",
    "stages": {
      "signature": {
        "name": "Runic Logic",
        "description": "Build persistent sigils and linked magical logic into equipment; this replaces the old assumption that normal PF2e property runes still exist."
      },
      "mastery": {
        "name": "Rune Resonance",
        "description": "Linked sigils are easier to upgrade and can interact across paired items."
      },
      "legacy": {
        "name": "Runic Infrastructure",
        "description": "Supports ward arrays, military sigils and public magical systems."
      }
    }
  },
  {
    "professionId": "leatherwork",
    "profession": "Leatherwork",
    "specializationId": "specialty-1",
    "specialization": "Wyrmcraft",
    "domain": "Leather, hides, dragon scales, flexible armour and creature-derived materials.",
    "stages": {
      "signature": {
        "name": "Draconic Essence",
        "description": "Preserve and exploit qualities from dragon type, colour and age in armour, weapons and reinforcement. Dragon Scale Core and Reinforcement already provide native colour resistance; Wyrmcraft deepens or transforms that inheritance."
      },
      "mastery": {
        "name": "Perfect Harvest",
        "description": "Gain more usable dragon material and reduce waste while preparing scales and hides."
      },
      "legacy": {
        "name": "Dragonworks",
        "description": "Creates elite army equipment, prestige goods, diplomatic trophies and draconic settlement works."
      }
    }
  },
  {
    "professionId": "leatherwork",
    "profession": "Leatherwork",
    "specializationId": "specialty-2",
    "specialization": "Beastbinding",
    "domain": "Leather, hides, dragon scales, flexible armour and creature-derived materials.",
    "stages": {
      "signature": {
        "name": "Preserve the Beast",
        "description": "Retain a natural or supernatural quality from the creature whose hide/material was used."
      },
      "mastery": {
        "name": "Master Harvester",
        "description": "Improve creature-material yield and preserve delicate traits that ordinary harvesting would destroy."
      },
      "legacy": {
        "name": "Monstercraft Trade",
        "description": "Turns rare creature materials into specialist exports and campaign resources."
      }
    }
  },
  {
    "professionId": "leatherwork",
    "profession": "Leatherwork",
    "specializationId": "specialty-3",
    "specialization": "Mantlecraft",
    "domain": "Leather, hides, dragon scales, flexible armour and creature-derived materials.",
    "stages": {
      "signature": {
        "name": "Great Mantles",
        "description": "Create exceptional cloaks, coats, ceremonial furs and environmental garments."
      },
      "mastery": {
        "name": "Luxury Craftsmanship",
        "description": "Reduce rare-fur waste and substantially increase trade/prestige value."
      },
      "legacy": {
        "name": "Royal Clothier",
        "description": "Supports diplomacy, gifts, court prestige and luxury industry."
      }
    }
  },
  {
    "professionId": "carpentry",
    "profession": "Carpentry",
    "specializationId": "specialty-1",
    "specialization": "Warbowyer",
    "domain": "Bows, crossbows, wooden weapons, frames, structures and siege equipment.",
    "stages": {
      "signature": {
        "name": "Engineered Ranged Weapons",
        "description": "Build bows, crossbows, ballistae, specialist ammunition and advanced loading mechanisms."
      },
      "mastery": {
        "name": "Master Fletching",
        "description": "Produce ammunition efficiently and maintain engineered ranged weapons with reduced waste."
      },
      "legacy": {
        "name": "Missile Industry",
        "description": "Improves army archers, towers, ballistae and settlement ranged defence."
      }
    }
  },
  {
    "professionId": "carpentry",
    "profession": "Carpentry",
    "specializationId": "specialty-2",
    "specialization": "Masterwright",
    "domain": "Bows, crossbows, wooden weapons, frames, structures and siege equipment.",
    "stages": {
      "signature": {
        "name": "Great Works",
        "description": "Build bridges, roads, palisades, docks, towers, camps and major wooden infrastructure."
      },
      "mastery": {
        "name": "Efficient Construction",
        "description": "Reduce Lumber cost and repair downtime for qualifying projects."
      },
      "legacy": {
        "name": "Kingdom Builder",
        "description": "Improves construction throughput, roads, fortifications, settlement expansion and repairs."
      }
    }
  },
  {
    "professionId": "carpentry",
    "profession": "Carpentry",
    "specializationId": "specialty-3",
    "specialization": "Warcarving",
    "domain": "Bows, crossbows, wooden weapons, frames, structures and siege equipment.",
    "stages": {
      "signature": {
        "name": "Carved Form",
        "description": "Add combat identities and totemic properties to wooden weapons, shields and tools."
      },
      "mastery": {
        "name": "Deep Carving",
        "description": "Preserve increasingly complex magical/totemic carvings without weakening the wood."
      },
      "legacy": {
        "name": "Carved Traditions",
        "description": "Supports ceremonial weapons, military equipment and cultural relics."
      }
    }
  },
  {
    "professionId": "stonemason",
    "profession": "Stonemasonry",
    "specializationId": "specialty-1",
    "specialization": "Megalithics",
    "domain": "Fortifications, runestones, monuments, constructs, heavy components and impossible stone wargear.",
    "stages": {
      "signature": {
        "name": "Great Works",
        "description": "Create fortresses, roads, aqueducts, monumental walls, towers and vast stone projects."
      },
      "mastery": {
        "name": "Monumental Engineering",
        "description": "Reduce Stone waste and repair time for major works."
      },
      "legacy": {
        "name": "Civilisation Builder",
        "description": "Transforms settlements through enduring infrastructure and wonders."
      }
    }
  },
  {
    "professionId": "stonemason",
    "profession": "Stonemasonry",
    "specializationId": "specialty-2",
    "specialization": "Runemasonry",
    "domain": "Fortifications, runestones, monuments, constructs, heavy components and impossible stone wargear.",
    "stages": {
      "signature": {
        "name": "Wardstones",
        "description": "Bind magical zones, alarms, protections and restrictions to locations rather than carried items."
      },
      "mastery": {
        "name": "Deep Inscription",
        "description": "Increase ward area, duration and magical stability."
      },
      "legacy": {
        "name": "Great Wards",
        "description": "Protects settlements from intrusion, teleportation, undead, weather and magical assault."
      }
    }
  },
  {
    "professionId": "stonemason",
    "profession": "Stonemasonry",
    "specializationId": "specialty-3",
    "specialization": "Titanmasonry",
    "domain": "Fortifications, runestones, monuments, constructs, heavy components and impossible stone wargear.",
    "stages": {
      "signature": {
        "name": "Titanic Construction",
        "description": "Create stone armour, colossal shields, siege devices, constructs and crushing wargear."
      },
      "mastery": {
        "name": "Mountaincraft",
        "description": "Make enormous stone components usable without losing impossible stability."
      },
      "legacy": {
        "name": "Stone Legions",
        "description": "Supports constructs, fortifications and siege warfare."
      }
    }
  },
  {
    "professionId": "glassmaking",
    "profession": "Glassmaking",
    "specializationId": "specialty-1",
    "specialization": "Prismcraft",
    "domain": "Optics, mirrors, mana vessels, magical circuitry and precision glass components.",
    "stages": {
      "signature": {
        "name": "Arcane Optics",
        "description": "Focus, split, redirect and transform light or magical energy with precision lenses and prisms."
      },
      "mastery": {
        "name": "Perfect Refraction",
        "description": "Safely handle stronger magical energy and reduce material loss in advanced optical components."
      },
      "legacy": {
        "name": "Observatory Craft",
        "description": "Supports surveying, astronomy, navigation, signalling and watchtowers."
      }
    }
  },
  {
    "professionId": "glassmaking",
    "profession": "Glassmaking",
    "specializationId": "specialty-2",
    "specialization": "Mirrorcraft",
    "domain": "Optics, mirrors, mana vessels, magical circuitry and precision glass components.",
    "stages": {
      "signature": {
        "name": "Reflection",
        "description": "Create supernatural mirrors for illusion, scrying, communication, defence and travel."
      },
      "mastery": {
        "name": "Perfect Reflection",
        "description": "Safely reflect or retain increasingly powerful magical phenomena."
      },
      "legacy": {
        "name": "Mirror Network",
        "description": "Links settlements for communication, intelligence and eventually transport."
      }
    }
  },
  {
    "professionId": "glassmaking",
    "profession": "Glassmaking",
    "specializationId": "specialty-3",
    "specialization": "Aetherglass",
    "domain": "Optics, mirrors, mana vessels, magical circuitry and precision glass components.",
    "stages": {
      "signature": {
        "name": "Mana Conduction",
        "description": "Build mana batteries, spell reservoirs, magical circuitry and construct cores."
      },
      "mastery": {
        "name": "Aether Cells",
        "description": "Store progressively greater magical energy with less loss and safer discharge."
      },
      "legacy": {
        "name": "Arcane Grid",
        "description": "Powers large-scale magical infrastructure and magitek networks."
      }
    }
  },
  {
    "professionId": "pottery",
    "profession": "Pottery",
    "specializationId": "specialty-1",
    "specialization": "Ceramancy",
    "domain": "Ceramics, magical vessels, terracotta constructs, kilns and alchemical containment.",
    "stages": {
      "signature": {
        "name": "Living Clay",
        "description": "Create supernatural ceramics, terracotta guardians and adaptive ceramic armour."
      },
      "mastery": {
        "name": "Awakened Kiln",
        "description": "Build increasingly complex animated ceramics with less breakage and better control."
      },
      "legacy": {
        "name": "Terracotta Works",
        "description": "Supports workers, guardians, soldiers and settlement sentinels."
      }
    }
  },
  {
    "professionId": "pottery",
    "profession": "Pottery",
    "specializationId": "specialty-2",
    "specialization": "Reliquarycraft",
    "domain": "Ceramics, magical vessels, terracotta constructs, kilns and alchemical containment.",
    "stages": {
      "signature": {
        "name": "Vessel of Essence",
        "description": "Capture and safely preserve supernatural essences, spirits, curses, blessings and planar energy."
      },
      "mastery": {
        "name": "Perfect Containment",
        "description": "Safely house stronger and more volatile essences with less risk of leakage or corruption."
      },
      "legacy": {
        "name": "Great Reliquaries",
        "description": "Supports temples, magical institutions, cursed-artifact storage and spirit containment."
      }
    }
  },
  {
    "professionId": "pottery",
    "profession": "Pottery",
    "specializationId": "specialty-3",
    "specialization": "Pyroceramics",
    "domain": "Ceramics, magical vessels, terracotta constructs, kilns and alchemical containment.",
    "stages": {
      "signature": {
        "name": "Cruciblecraft",
        "description": "Create bomb casings, furnaces, crucibles, pressure vessels and extreme-temperature components."
      },
      "mastery": {
        "name": "Grand Kiln",
        "description": "Improve industrial/alchemical throughput and reduce failures when processing extreme heat materials."
      },
      "legacy": {
        "name": "Industrial Kilns",
        "description": "Supports bricks, pipes, sanitation, forges, alchemy and mass production."
      }
    }
  },
  {
    "professionId": "weaving",
    "profession": "Weaving",
    "specializationId": "specialty-1",
    "specialization": "Aetherweaving",
    "domain": "Magical thread, warcloth, banners, ropes, flexible reinforcement and textile components.",
    "stages": {
      "signature": {
        "name": "Manathread",
        "description": "Produce magically conductive fabric capable of storing, carrying and shaping supernatural energy."
      },
      "mastery": {
        "name": "Arcane Loom",
        "description": "Weave stronger magical fibres and exotic feedstocks without losing their properties."
      },
      "legacy": {
        "name": "Magical Textile Industry",
        "description": "Supports magical garments, banners, specialist exports and arcane infrastructure."
      }
    }
  },
  {
    "professionId": "weaving",
    "profession": "Weaving",
    "specializationId": "specialty-2",
    "specialization": "Ironweaving",
    "domain": "Magical thread, warcloth, banners, ropes, flexible reinforcement and textile components.",
    "stages": {
      "signature": {
        "name": "Warcloth",
        "description": "Produce armour backing, nets, ropes, strings, sails and flexible reinforcement designed for combat stress."
      },
      "mastery": {
        "name": "Steel Thread",
        "description": "Integrate stronger materials without sacrificing flexibility."
      },
      "legacy": {
        "name": "Military Textiles",
        "description": "Supports armour, siege gear, sails, ropes and army equipment."
      }
    }
  },
  {
    "professionId": "weaving",
    "profession": "Weaving",
    "specializationId": "specialty-3",
    "specialization": "Heraldweaving",
    "domain": "Magical thread, warcloth, banners, ropes, flexible reinforcement and textile components.",
    "stages": {
      "signature": {
        "name": "Great Standards",
        "description": "Create banners and tapestries that carry morale, identity and supernatural command presence."
      },
      "mastery": {
        "name": "Living Heraldry",
        "description": "Standards grow more potent when tied to a recognised army, ruler, settlement or company."
      },
      "legacy": {
        "name": "National Identity",
        "description": "Supports armies, festivals, loyalty, diplomacy and prestige."
      }
    }
  },
  {
    "professionId": "bookmaking",
    "profession": "Bookmaking",
    "specializationId": "specialty-1",
    "specialization": "Grimoirecraft",
    "domain": "Grimoires, formulae, codices, maps, records and knowledge made mechanically useful.",
    "stages": {
      "signature": {
        "name": "Living Grimoires",
        "description": "Create spellbooks and codices that interact directly with spell preparation, memory and magical resonance."
      },
      "mastery": {
        "name": "Arcane Codex",
        "description": "Improve magical capacity, indexing and stability while reducing time to expand or revise the grimoire."
      },
      "legacy": {
        "name": "Grand Academies",
        "description": "Supports magical education, spell research and institutional knowledge."
      }
    }
  },
  {
    "professionId": "bookmaking",
    "profession": "Bookmaking",
    "specializationId": "specialty-2",
    "specialization": "Chroniclecraft",
    "domain": "Grimoires, formulae, codices, maps, records and knowledge made mechanically useful.",
    "stages": {
      "signature": {
        "name": "Codices of Mastery",
        "description": "Record Lore, formulae, techniques and expertise precisely enough that others can temporarily benefit from it."
      },
      "mastery": {
        "name": "Perfect Instruction",
        "description": "Preserve increasingly advanced knowledge while reducing training/research time."
      },
      "legacy": {
        "name": "Great Library",
        "description": "Improves research, education, formula preservation and Culture."
      }
    }
  },
  {
    "professionId": "bookmaking",
    "profession": "Bookmaking",
    "specializationId": "specialty-3",
    "specialization": "Grand Cartography",
    "domain": "Grimoires, formulae, codices, maps, records and knowledge made mechanically useful.",
    "stages": {
      "signature": {
        "name": "Master Atlas",
        "description": "Create maps that record resources, hazards, routes, magical phenomena and strategic terrain."
      },
      "mastery": {
        "name": "Perfect Survey",
        "description": "Reveal hidden resources and improve route accuracy with less exploration time."
      },
      "legacy": {
        "name": "Kingdom Survey",
        "description": "Improves hex claims, roads, army movement, settlement placement and resource exploitation."
      }
    }
  },
  {
    "professionId": "tailoring",
    "profession": "Tailoring",
    "specializationId": "specialty-1",
    "specialization": "Battlestitching",
    "domain": "Finished garments, armour liners, stealth clothing, ceremonial dress and wearable combat systems.",
    "stages": {
      "signature": {
        "name": "War Garments",
        "description": "Create combat robes, coats, armour liners, harnesses and flexible protection."
      },
      "mastery": {
        "name": "Combat Cut",
        "description": "Increase protection without sacrificing movement and reduce material waste when refitting worn gear."
      },
      "legacy": {
        "name": "Military Tailoring",
        "description": "Supports elite uniforms, armour liners and specialised army equipment."
      }
    }
  },
  {
    "professionId": "tailoring",
    "profession": "Tailoring",
    "specializationId": "specialty-2",
    "specialization": "Veilcraft",
    "domain": "Finished garments, armour liners, stealth clothing, ceremonial dress and wearable combat systems.",
    "stages": {
      "signature": {
        "name": "Impossible Garments",
        "description": "Manipulate sight, sound, shadow, identity and supernatural concealment through clothing."
      },
      "mastery": {
        "name": "Perfect Veil",
        "description": "Improve disguise/concealment reliability and reduce the signs left by supernatural garments."
      },
      "legacy": {
        "name": "Shadow Service",
        "description": "Supports scouts, spies, diplomats and intelligence networks."
      }
    }
  },
  {
    "professionId": "tailoring",
    "profession": "Tailoring",
    "specializationId": "specialty-3",
    "specialization": "Regaliacraft",
    "domain": "Finished garments, armour liners, stealth clothing, ceremonial dress and wearable combat systems.",
    "stages": {
      "signature": {
        "name": "Vestments of Authority",
        "description": "Create royal, diplomatic, ceremonial and command garments that reinforce office and presence."
      },
      "mastery": {
        "name": "Perfect Regalia",
        "description": "Regalia becomes stronger when properly tied to a recognised office, ruler or institution."
      },
      "legacy": {
        "name": "Royal Court",
        "description": "Improves diplomacy, loyalty, leadership, festivals, prestige and foreign relations."
      }
    }
  }
]);

const MARK_ROWS = [
  [
    "blacksmithing-universal-tempered-construction",
    "blacksmithing",
    "",
    "Tempered Construction",
    "minor",
    "+10% item HP and +1 Hardness.",
    "universal"
  ],
  [
    "blacksmithing-universal-perfect-balance",
    "blacksmithing",
    "",
    "Perfect Balance",
    "minor",
    "Reduce Bulk by 1 where sensible; weapon gains +1 Artisan bonus to one chosen Athletics manoeuvre made with it.",
    "universal"
  ],
  [
    "blacksmithing-universal-reinforced-edge",
    "blacksmithing",
    "",
    "Reinforced Edge",
    "standard",
    "+1 damage per weapon damage die against objects/Hardness; +2 per die at T5+.",
    "universal"
  ],
  [
    "blacksmithing-universal-fortified-frame",
    "blacksmithing",
    "",
    "Fortified Frame",
    "standard",
    "Armour or shield gains +2 Hardness and +20% item HP.",
    "universal"
  ],
  [
    "blacksmithing-universal-master-reforge",
    "blacksmithing",
    "",
    "Master Reforge",
    "standard",
    "Recover 75% of ordinary/resource components when rebuilding and preserve compatible Wrathmaker work where physically possible.",
    "universal"
  ],
  [
    "blacksmithing-specialty-1-ember-temper",
    "blacksmithing",
    "specialty-1",
    "Ember Temper",
    "minor",
    "Weapon sheds controllable light; on a critical hit deal extra fire damage equal to Core Tier.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-1-blood-temper",
    "blacksmithing",
    "specialty-1",
    "Blood Temper",
    "standard",
    "While at or below half HP, deal +2 damage; +4 at Core T5+.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-1-hellfire-channel",
    "blacksmithing",
    "specialty-1",
    "Hellfire Channel",
    "major",
    "Once per encounter for 1 minute, weapon deals +1d6 fire at T2–3, +2d6 at T4–5, +3d6 at T6; half ignores fire resistance.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-1-tormentors-edge",
    "blacksmithing",
    "specialty-1",
    "Tormentor's Edge",
    "major",
    "Critical hits force a Will save vs wielder DC; failure frightened 1, critical failure frightened 2.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-1-perfected-killing-edge",
    "blacksmithing",
    "specialty-1",
    "Perfected Killing Edge",
    "superior",
    "Weapon gains +1 attack beyond Core Material progression. Does not stack with another Over-Potency effect.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-1-soul-burned-steel",
    "blacksmithing",
    "specialty-1",
    "Soul-Burned Steel",
    "superior",
    "Once/day when wielder would reach 0 HP, remain at 1 HP and immediately Step then Strike; afterwards become drained 1 until daily preparations.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-2-consecrated-finish",
    "blacksmithing",
    "specialty-2",
    "Consecrated Finish",
    "minor",
    "Item counts as sanctified for campaign interactions and grants +1 Artisan bonus to identify undead/fiends while worn or wielded.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-2-dawnbound",
    "blacksmithing",
    "specialty-2",
    "Dawnbound",
    "standard",
    "Weapon deals +1 spirit damage per weapon damage die to undead and fiends.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-2-guardians-radiance",
    "blacksmithing",
    "specialty-2",
    "Guardian's Radiance",
    "major",
    "Once per round when an adjacent ally takes damage, reduce it by 2 + Core Tier.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-2-aegis-of-dawn",
    "blacksmithing",
    "specialty-2",
    "Aegis of Dawn",
    "major",
    "Wearer gains permanent Max HP equal to 4 × Core Tier and +1 resistance to spirit/void damage per Core Tier.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-2-martyrs-forge",
    "blacksmithing",
    "specialty-2",
    "Martyr's Forge",
    "superior",
    "Reaction once/encounter: take damage equal to twice your level to reduce damage to an ally within 15 ft by four times your level.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-2-solar-ascension",
    "blacksmithing",
    "specialty-2",
    "Solar Ascension",
    "superior",
    "Once/day for 1 minute, 20-ft aura: allies gain +1 Artisan bonus to AC and saves; undead/fiends take spirit damage equal to twice Core Tier at start of their turns.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-3-diagnostic-matrix",
    "blacksmithing",
    "specialty-3",
    "Diagnostic Matrix",
    "minor",
    "Item reports its condition; +2 Artisan bonus to Repair and Identify checks involving it.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-3-integrated-conduit",
    "blacksmithing",
    "specialty-3",
    "Integrated Conduit",
    "standard",
    "Item can house one Mana or Aetherglass component without increasing ordinary component Bulk/space.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-3-adaptive-configuration",
    "blacksmithing",
    "specialty-3",
    "Adaptive Configuration",
    "major",
    "Choose two approved configurations at creation; one Interact action switches between them, such as damage type, weapon mode or tool function.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-3-arcane-mechanism",
    "blacksmithing",
    "specialty-3",
    "Arcane Mechanism",
    "major",
    "Add one once-per-encounter activated ability roughly appropriate to the item's tier/level and theme.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-3-phase-mechanism",
    "blacksmithing",
    "specialty-3",
    "Phase Mechanism",
    "superior",
    "Once/encounter, wielder Steps or Strides up to half Speed through creatures and non-magical obstacles as if incorporeal; must end in open space.",
    "specialization"
  ],
  [
    "blacksmithing-specialty-3-reality-engine",
    "blacksmithing",
    "specialty-3",
    "Reality Engine",
    "superior",
    "Once/day for 1 minute, item can maintain two mutually exclusive configurations simultaneously or ignore one normal activation prerequisite approved at creation.",
    "specialization"
  ],
  [
    "alchemy-universal-stable-formula",
    "alchemy",
    "",
    "Stable Formula",
    "minor",
    "Consumable remains potent twice as long and ignores the first normal environmental spoilage event.",
    "universal"
  ],
  [
    "alchemy-universal-efficient-batch",
    "alchemy",
    "",
    "Efficient Batch",
    "minor",
    "Produce +10% doses, rounded down; minimum +1 when crafting 4+ items.",
    "universal"
  ],
  [
    "alchemy-universal-refined-reagent",
    "alchemy",
    "",
    "Refined Reagent",
    "standard",
    "Increase one non-attack numerical consumable effect by 10%.",
    "universal"
  ],
  [
    "alchemy-universal-quick-preparation",
    "alchemy",
    "",
    "Quick Preparation",
    "standard",
    "Reduce batch downtime by 20%.",
    "universal"
  ],
  [
    "alchemy-universal-catalyst-reserve",
    "alchemy",
    "",
    "Catalyst Reserve",
    "standard",
    "When used as a component in another project, reduce one secondary resource requirement by 10%.",
    "universal"
  ],
  [
    "alchemy-specialty-1-measured-dose",
    "alchemy",
    "specialty-1",
    "Measured Dose",
    "minor",
    "Remove one minor drawback or reduce a fixed consumable drawback by 25%.",
    "specialization"
  ],
  [
    "alchemy-specialty-1-concentrated",
    "alchemy",
    "specialty-1",
    "Concentrated",
    "standard",
    "Increase healing or temporary HP from the consumable by 25%.",
    "specialization"
  ],
  [
    "alchemy-specialty-1-extended-formula",
    "alchemy",
    "specialty-1",
    "Extended Formula",
    "major",
    "Double a duration of 1 minute or longer, maximum 24 hours unless the GM approves more.",
    "specialization"
  ],
  [
    "alchemy-specialty-1-rapid-infusion",
    "alchemy",
    "specialty-1",
    "Rapid Infusion",
    "major",
    "Draw and drink/administer this consumable as a single action.",
    "specialization"
  ],
  [
    "alchemy-specialty-1-restorative-panacea",
    "alchemy",
    "specialty-1",
    "Restorative Panacea",
    "superior",
    "In addition to normal effect, reduce two of clumsy, enfeebled, frightened, sickened or stupefied by 1 and attempt one counteract check vs poison/disease/curse.",
    "specialization"
  ],
  [
    "alchemy-specialty-1-phoenix-draught",
    "alchemy",
    "specialty-1",
    "Phoenix Draught",
    "superior",
    "Once/day per creature, if consumed while above 0 HP it remains active for 1 hour; first time the creature would fall to 0 HP, it instead remains at 1 HP and gains temp HP equal to 3 × Core Tier.",
    "specialization"
  ],
  [
    "alchemy-specialty-2-masked-toxin",
    "alchemy",
    "specialty-2",
    "Masked Toxin",
    "minor",
    "+2 Artisan bonus to the poison's DC against attempts to detect it before exposure.",
    "specialization"
  ],
  [
    "alchemy-specialty-2-adhesive-poison",
    "alchemy",
    "specialty-2",
    "Adhesive Poison",
    "standard",
    "A failed Strike does not consume an applied injury poison; it remains until a successful Strike or the encounter ends.",
    "specialization"
  ],
  [
    "alchemy-specialty-2-swift-venom",
    "alchemy",
    "specialty-2",
    "Swift Venom",
    "major",
    "Reduce onset by one step; if no onset, failed initial save immediately applies Stage 1 before normal progression.",
    "specialization"
  ],
  [
    "alchemy-specialty-2-predator-formula",
    "alchemy",
    "specialty-2",
    "Predator Formula",
    "major",
    "Choose one creature family when crafted; poison DC gains +2 Artisan bonus against that family.",
    "specialization"
  ],
  [
    "alchemy-specialty-2-mutagenic-venom",
    "alchemy",
    "specialty-2",
    "Mutagenic Venom",
    "superior",
    "Add one approved Stage 3 rider such as slowed 1, stupefied 2 or enfeebled 2 for 1 round.",
    "specialization"
  ],
  [
    "alchemy-specialty-2-perfect-killer",
    "alchemy",
    "specialty-2",
    "Perfect Killer",
    "superior",
    "Poison gains +1 DC beyond its normal item/tier DC and treats the first successful save against it as a failure once per target.",
    "specialization"
  ],
  [
    "alchemy-specialty-3-purified-matrix",
    "alchemy",
    "specialty-3",
    "Purified Matrix",
    "minor",
    "Remove one undesirable mundane tag or impurity from a component.",
    "specialization"
  ],
  [
    "alchemy-specialty-3-alchemical-alloy",
    "alchemy",
    "specialty-3",
    "Alchemical Alloy",
    "standard",
    "Component gains one approved material tag from a second same-tier material used in its creation.",
    "specialization"
  ],
  [
    "alchemy-specialty-3-composite-matrix",
    "alchemy",
    "specialty-3",
    "Composite Matrix",
    "major",
    "Component can satisfy two compatible resource-family requirements while occupying one component position.",
    "specialization"
  ],
  [
    "alchemy-specialty-3-refined-substance",
    "alchemy",
    "specialty-3",
    "Refined Substance",
    "major",
    "For one named Artisan Mark, treat this component as 1 Tier higher, maximum effective T6; does not raise Core progression.",
    "specialization"
  ],
  [
    "alchemy-specialty-3-philosophers-matrix",
    "alchemy",
    "specialty-3",
    "Philosopher's Matrix",
    "superior",
    "Once per project, substitute one missing non-unique resource family with equal quantity of another same-tier family.",
    "specialization"
  ],
  [
    "alchemy-specialty-3-living-transmutation",
    "alchemy",
    "specialty-3",
    "Living Transmutation",
    "superior",
    "During daily preparations choose one of two pre-built material identities for the component; switch its native tags and compatible specialist hooks until next preparations.",
    "specialization"
  ],
  [
    "enchanting-universal-stable-matrix",
    "enchanting",
    "",
    "Stable Matrix",
    "minor",
    "+2 Artisan bonus when resisting suppression/counteraction of the item's custom magic.",
    "universal"
  ],
  [
    "enchanting-universal-attuned-craft",
    "enchanting",
    "",
    "Attuned Craft",
    "minor",
    "Key custom activations to a wielder, tradition, deity, element or other approved identity.",
    "universal"
  ],
  [
    "enchanting-universal-resonant-channel",
    "enchanting",
    "",
    "Resonant Channel",
    "standard",
    "+1 charge to one custom daily charge pool, maximum +1 from this Mark.",
    "universal"
  ],
  [
    "enchanting-universal-efficient-activation",
    "enchanting",
    "",
    "Efficient Activation",
    "standard",
    "Once per encounter, reduce one approved 2-action custom item activation to 1 action.",
    "universal"
  ],
  [
    "enchanting-universal-arcane-safeguard",
    "enchanting",
    "",
    "Arcane Safeguard",
    "standard",
    "Reduce damage/penalties from a custom item overload or critical activation failure by 50%.",
    "universal"
  ],
  [
    "enchanting-specialty-1-minor-empowerment",
    "enchanting",
    "specialty-1",
    "Minor Empowerment",
    "minor",
    "+1 Artisan bonus to one narrow skill use/subcategory agreed at creation.",
    "specialization"
  ],
  [
    "enchanting-specialty-1-focused-empowerment",
    "enchanting",
    "specialty-1",
    "Focused Empowerment",
    "standard",
    "+1 Artisan bonus to one selected secondary statistic such as initiative, a skill, or a specific save against one effect family.",
    "specialization"
  ],
  [
    "enchanting-specialty-1-twin-empowerment",
    "enchanting",
    "specialty-1",
    "Twin Empowerment",
    "major",
    "Choose two different secondary statistics; each gains +1 Artisan bonus while attuned.",
    "specialization"
  ],
  [
    "enchanting-specialty-1-overcharged-matrix",
    "enchanting",
    "specialty-1",
    "Overcharged Matrix",
    "major",
    "Once/encounter for 1 round, increase one existing Artisan numerical bonus on the item by +1.",
    "specialization"
  ],
  [
    "enchanting-specialty-1-overlord-matrix",
    "enchanting",
    "specialty-1",
    "Overlord Matrix",
    "superior",
    "Choose weapon attack or spell attack/DC when crafted; gain +1 beyond Core progression in that category. Does not stack with another Over-Potency effect.",
    "specialization"
  ],
  [
    "enchanting-specialty-1-aetherheart-lattice",
    "enchanting",
    "specialty-1",
    "Aetherheart Lattice",
    "superior",
    "Gain 2 charges/day; spend 1 to refresh one once-per-encounter Standard/Major activation on the item, or at start of turn gain temp HP equal to 2 × Core Tier if below half HP.",
    "specialization"
  ],
  [
    "enchanting-specialty-2-minor-binding",
    "enchanting",
    "specialty-2",
    "Minor Binding",
    "minor",
    "Add one non-combat descriptive/material trait or approved utility tag.",
    "specialization"
  ],
  [
    "enchanting-specialty-2-bound-trait",
    "enchanting",
    "specialty-2",
    "Bound Trait",
    "standard",
    "Add one approved item/weapon trait such as shove, trip, disarm, modular or versatile.",
    "specialization"
  ],
  [
    "enchanting-specialty-2-elemental-essence",
    "enchanting",
    "specialty-2",
    "Elemental Essence",
    "major",
    "Weapon deals +1d6 acid/cold/electricity/fire at T2–3, +2d6 at T4–5, +3d6 at T6; defensive items instead grant resistance equal to 2 × Core Tier.",
    "specialization"
  ],
  [
    "enchanting-specialty-2-predatory-essence",
    "enchanting",
    "specialty-2",
    "Predatory Essence",
    "major",
    "Bind one source-derived sense or movement mode such as scent 30 ft, climb 15 ft, swim 20 ft or darkvision.",
    "specialization"
  ],
  [
    "enchanting-specialty-2-greater-binding",
    "enchanting",
    "specialty-2",
    "Greater Binding",
    "superior",
    "Add one strong source-derived property such as reach extension, a once-per-encounter special attack, or comparable extraordinary trait approved by GM.",
    "specialization"
  ],
  [
    "enchanting-specialty-2-living-essence",
    "enchanting",
    "specialty-2",
    "Living Essence",
    "superior",
    "Once/day for 1 minute the item awakens and manifests one high-tier transformation/ability based on the bound essence.",
    "specialization"
  ],
  [
    "enchanting-specialty-3-runic-signature",
    "enchanting",
    "specialty-3",
    "Runic Signature",
    "minor",
    "+2 Artisan bonus to identify, repair or modify sigils made by this artisan.",
    "specialization"
  ],
  [
    "enchanting-specialty-3-resonant-pair",
    "enchanting",
    "specialty-3",
    "Resonant Pair",
    "standard",
    "Link two crafted items; while within 30 ft each bearer gains +1 Artisan bonus to saves against effects created by the other's current target.",
    "specialization"
  ],
  [
    "enchanting-specialty-3-layered-inscription",
    "enchanting",
    "specialty-3",
    "Layered Inscription",
    "major",
    "Choose one Standard Mark on the item; it can be toggled between two pre-defined modes during daily preparations.",
    "specialization"
  ],
  [
    "enchanting-specialty-3-runic-feedback",
    "enchanting",
    "specialty-3",
    "Runic Feedback",
    "major",
    "Once/encounter when a linked weapon critically hits, paired item grants +2 Artisan bonus to its next attack, save or activation check before end of next turn.",
    "specialization"
  ],
  [
    "enchanting-specialty-3-living-rune",
    "enchanting",
    "specialty-3",
    "Living Rune",
    "superior",
    "One Major-or-lower custom effect on the item may switch between two equal-power versions with a single action once per encounter.",
    "specialization"
  ],
  [
    "enchanting-specialty-3-grand-glyph",
    "enchanting",
    "specialty-3",
    "Grand Glyph",
    "superior",
    "Once/day place a 15-ft rune zone for 1 minute that reproduces one approved Standard/Major defensive or offensive item effect for allies/enemies in the area.",
    "specialization"
  ],
  [
    "leatherwork-universal-flexible-construction",
    "leatherwork",
    "",
    "Flexible Construction",
    "minor",
    "Reduce one movement-related armour penalty by 1 where applicable.",
    "universal"
  ],
  [
    "leatherwork-universal-perfect-fit",
    "leatherwork",
    "",
    "Perfect Fit",
    "minor",
    "Reduce Bulk by 1 for worn leather/hide equipment and remove minor fitting penalties.",
    "universal"
  ],
  [
    "leatherwork-universal-reinforced-hide",
    "leatherwork",
    "",
    "Reinforced Hide",
    "standard",
    "+10% item HP and +1 Hardness; doubles at T5+.",
    "universal"
  ],
  [
    "leatherwork-universal-weather-seal",
    "leatherwork",
    "",
    "Weather Seal",
    "standard",
    "Wearer gains +2 Artisan bonus to saves/checks against ordinary environmental exposure covered by the garment.",
    "universal"
  ],
  [
    "leatherwork-universal-adaptive-strapping",
    "leatherwork",
    "",
    "Adaptive Strapping",
    "standard",
    "Once per round drawing/stowing one item secured to the gear is part of the same Interact action used to manipulate it.",
    "universal"
  ],
  [
    "leatherwork-specialty-1-wyrm-inscription",
    "leatherwork",
    "specialty-1",
    "Wyrm Inscription",
    "minor",
    "Item visibly records source dragon; +2 Artisan bonus to identify or track lore tied to that dragon type.",
    "specialization"
  ],
  [
    "leatherwork-specialty-1-draconic-resistance",
    "leatherwork",
    "specialty-1",
    "Draconic Resistance",
    "standard",
    "Requires Dragon Scale Core or Reinforcement. Increase the item's active native resistance by Dragon Tier.",
    "specialization"
  ],
  [
    "leatherwork-specialty-1-scale-dominion",
    "leatherwork",
    "specialty-1",
    "Scale Dominion",
    "major",
    "Armour/shield gains +2 Hardness and +15 HP per Dragon Tier; weapon instead ignores resistance equal to Dragon Tier against the associated damage type.",
    "specialization"
  ],
  [
    "leatherwork-specialty-1-draconic-constitution",
    "leatherwork",
    "specialty-1",
    "Draconic Constitution",
    "major",
    "While attuned to worn armour, gain Max HP equal to 4 × Dragon Tier and a +2 Artisan bonus to saves against effects that deal the associated damage type; Green applies to poison effects. This replaces the Mark's former extra resistance.",
    "specialization"
  ],
  [
    "leatherwork-specialty-1-wyrms-fury",
    "leatherwork",
    "specialty-1",
    "Wyrm's Fury",
    "superior",
    "Weapon gains +1 additional base weapon damage die beyond Core progression. Must use Dragon Scale Core or Reinforcement; does not stack with other Over-Striking.",
    "specialization"
  ],
  [
    "leatherwork-specialty-1-dragonheart-awakening",
    "leatherwork",
    "specialty-1",
    "Dragonheart Awakening",
    "superior",
    "Once/day for 1 minute gain fly Speed equal to land Speed, increase the active native resistance by 2 × Dragon Tier, and gain one 30-ft cone breath weapon dealing 2d6 per Dragon Tier, basic Reflex save. This increase stacks with Draconic Resistance on the same item.",
    "specialization"
  ],
  [
    "leatherwork-specialty-2-trophy-memory",
    "leatherwork",
    "specialty-2",
    "Trophy Memory",
    "minor",
    "+1 Artisan bonus to Recall Knowledge about the source creature family while carrying/wearing the item.",
    "specialization"
  ],
  [
    "leatherwork-specialty-2-predators-sense",
    "leatherwork",
    "specialty-2",
    "Predator's Sense",
    "standard",
    "Gain one source-appropriate sense such as scent 15 ft, low-light vision, or +2 Artisan bonus to tracking that creature family.",
    "specialization"
  ],
  [
    "leatherwork-specialty-2-natural-movement",
    "leatherwork",
    "specialty-2",
    "Natural Movement",
    "major",
    "Gain one source-appropriate movement mode: climb 15 ft, swim 20 ft, or +10 ft Speed in a defined natural environment.",
    "specialization"
  ],
  [
    "leatherwork-specialty-2-apex-hide",
    "leatherwork",
    "specialty-2",
    "Apex Hide",
    "major",
    "At start of combat gain temp HP equal to 3 × Core Tier and +1 Artisan bonus to saves against one source-creature theme such as fear, cold, poison or grabs.",
    "specialization"
  ],
  [
    "leatherwork-specialty-2-apex-trait",
    "leatherwork",
    "specialty-2",
    "Apex Trait",
    "superior",
    "Gain one extraordinary source-derived trait/ability such as powerful leap, amphibious movement, tremorsense 15 ft, or comparable effect approved by GM.",
    "specialization"
  ],
  [
    "leatherwork-specialty-2-chimera-binding",
    "leatherwork",
    "specialty-2",
    "Chimera Binding",
    "superior",
    "Combine two compatible creature-source properties in one item; choose which is active as a free action once per round, or activate both for 1 minute once/day.",
    "specialization"
  ],
  [
    "leatherwork-specialty-3-trophy-finish",
    "leatherwork",
    "specialty-3",
    "Trophy Finish",
    "minor",
    "+1 Artisan bonus to social checks where the displayed trophy/source is relevant to status or intimidation.",
    "specialization"
  ],
  [
    "leatherwork-specialty-3-weather-mantle",
    "leatherwork",
    "specialty-3",
    "Weather Mantle",
    "standard",
    "Ignore ordinary extreme-weather penalties and gain +2 Artisan bonus to saves against severe environmental exposure.",
    "specialization"
  ],
  [
    "leatherwork-specialty-3-predators-cloak",
    "leatherwork",
    "specialty-3",
    "Predator's Cloak",
    "major",
    "+2 Artisan bonus to Stealth and Survival in one source-appropriate terrain; once/encounter Step 5 ft after successfully Hiding.",
    "specialization"
  ],
  [
    "leatherwork-specialty-3-court-mantle",
    "leatherwork",
    "specialty-3",
    "Court Mantle",
    "major",
    "+2 Artisan bonus to Diplomacy and Society in formal settings; adjacent allies gain +1 Artisan bonus to saves against fear while wearer is conscious.",
    "specialization"
  ],
  [
    "leatherwork-specialty-3-sovereign-pelt",
    "leatherwork",
    "specialty-3",
    "Sovereign Pelt",
    "superior",
    "Gain Max HP equal to 6 × Core Tier and +2 Artisan bonus to Intimidation or Diplomacy chosen when crafted.",
    "specialization"
  ],
  [
    "leatherwork-specialty-3-legendary-pelt",
    "leatherwork",
    "specialty-3",
    "Legendary Pelt",
    "superior",
    "Once/day for 1 minute manifest one major supernatural trait of the source creature, such as invisibility, huge leap, elemental aura or transformation approved by GM.",
    "specialization"
  ],
  [
    "carpentry-universal-seasoned-construction",
    "carpentry",
    "",
    "Seasoned Construction",
    "minor",
    "Wooden item ignores normal warping/weathering and gains +10% item HP.",
    "universal"
  ],
  [
    "carpentry-universal-light-frame",
    "carpentry",
    "",
    "Light Frame",
    "minor",
    "Reduce Bulk by 1 where the wooden frame is a meaningful portion of the item.",
    "universal"
  ],
  [
    "carpentry-universal-precision-joinery",
    "carpentry",
    "",
    "Precision Joinery",
    "standard",
    "+2 Artisan bonus to checks to Repair, maintain or operate its crafted mechanism.",
    "universal"
  ],
  [
    "carpentry-universal-reinforced-limb",
    "carpentry",
    "",
    "Reinforced Limb",
    "standard",
    "Bow/crossbow/wooden weapon gains +1 damage per damage die against objects and structures.",
    "universal"
  ],
  [
    "carpentry-universal-modular-frame",
    "carpentry",
    "",
    "Modular Frame",
    "standard",
    "One approved wooden component can be swapped during daily preparations without rebuilding the entire item.",
    "universal"
  ],
  [
    "carpentry-specialty-1-true-fletching",
    "carpentry",
    "specialty-1",
    "True Fletching",
    "minor",
    "Ignore the first range-related environmental penalty from ordinary wind; ammunition can carry the artisan's identifying fletch.",
    "specialization"
  ],
  [
    "carpentry-specialty-1-specialist-ammo-chamber",
    "carpentry",
    "specialty-1",
    "Specialist Ammo Chamber",
    "standard",
    "Weapon can use one additional approved specialist ammunition family without modification.",
    "specialization"
  ],
  [
    "carpentry-specialty-1-longshot-construction",
    "carpentry",
    "specialty-1",
    "Longshot Construction",
    "major",
    "Increase range increment by 50%; first range increment beyond normal maximum does not impose an additional penalty.",
    "specialization"
  ],
  [
    "carpentry-specialty-1-rapid-mechanism",
    "carpentry",
    "specialty-1",
    "Rapid Mechanism",
    "major",
    "Once per round reduce one reload action by 1 action, minimum 0; if already reload 0, instead gain +1 Artisan bonus to first Strike after reloading.",
    "specialization"
  ],
  [
    "carpentry-specialty-1-perfected-tension",
    "carpentry",
    "specialty-1",
    "Perfected Tension",
    "superior",
    "Ranged weapon gains +1 attack beyond Core progression. Does not stack with another Over-Potency effect.",
    "specialization"
  ],
  [
    "carpentry-specialty-1-warbow-overdraw",
    "carpentry",
    "specialty-1",
    "Warbow Overdraw",
    "superior",
    "Ranged weapon gains +1 additional base weapon damage die beyond Core progression; on a natural 1, wielder becomes off-guard until start of next turn from the violent recoil/tension.",
    "specialization"
  ],
  [
    "carpentry-specialty-2-builders-mark",
    "carpentry",
    "specialty-2",
    "Builder's Mark",
    "minor",
    "+2 Artisan bonus to identify structural weaknesses or repair methods in wooden construction.",
    "specialization"
  ],
  [
    "carpentry-specialty-2-reinforced-frame",
    "carpentry",
    "specialty-2",
    "Reinforced Frame",
    "standard",
    "Structure or wooden vehicle gains +20% HP and +2 Hardness.",
    "specialization"
  ],
  [
    "carpentry-specialty-2-rapid-assembly",
    "carpentry",
    "specialty-2",
    "Rapid Assembly",
    "major",
    "Reduce qualifying construction or field-fortification time by 30%.",
    "specialization"
  ],
  [
    "carpentry-specialty-2-modular-construction",
    "carpentry",
    "specialty-2",
    "Modular Construction",
    "major",
    "Structure can be dismantled/reconfigured while recovering 80% of ordinary materials; temporary field works can be deployed in half normal time.",
    "specialization"
  ],
  [
    "carpentry-specialty-2-grand-design",
    "carpentry",
    "specialty-2",
    "Grand Design",
    "superior",
    "Kingdom project using this design reduces one recurring Lumber/repair cost by 25% and gains +2 Artisan bonus to its primary construction check.",
    "specialization"
  ],
  [
    "carpentry-specialty-2-citadel-framework",
    "carpentry",
    "specialty-2",
    "Citadel Framework",
    "superior",
    "Major fortification counts as one category tougher for structural damage and grants defenders +1 Artisan bonus to checks/saves against forced entry, siege movement and collapse effects.",
    "specialization"
  ],
  [
    "carpentry-specialty-3-carved-grip",
    "carpentry",
    "specialty-3",
    "Carved Grip",
    "minor",
    "+1 Artisan bonus to checks to resist Disarm or losing grip of the carved item.",
    "specialization"
  ],
  [
    "carpentry-specialty-3-wolf-carving",
    "carpentry",
    "specialty-3",
    "Wolf Carving",
    "standard",
    "After hitting a creature, gain +5 ft Speed when moving toward that creature until end of turn.",
    "specialization"
  ],
  [
    "carpentry-specialty-3-bear-carving",
    "carpentry",
    "specialty-3",
    "Bear Carving",
    "major",
    "While wielding/raising item, gain resistance to physical damage equal to half Core Tier, rounded up; doubles against forced-movement damage.",
    "specialization"
  ],
  [
    "carpentry-specialty-3-serpent-carving",
    "carpentry",
    "specialty-3",
    "Serpent Carving",
    "major",
    "Weapon gains one approved flexible/reach-style property; once/round after a successful Strike, Step 5 ft without triggering reactions from that target.",
    "specialization"
  ],
  [
    "carpentry-specialty-3-spirit-carving",
    "carpentry",
    "specialty-3",
    "Spirit Carving",
    "superior",
    "Item houses a totem spirit; once/encounter activate for 1 minute to gain +1 Artisan bonus to attack or AC chosen when crafted plus a themed sense/movement benefit.",
    "specialization"
  ],
  [
    "carpentry-specialty-3-totemic-ascendance",
    "carpentry",
    "specialty-3",
    "Totemic Ascendance",
    "superior",
    "Choose Wolf, Bear, Serpent or Stag each daily preparation; item gains that totem's Major-level package for the day, without consuming additional Capacity.",
    "specialization"
  ],
  [
    "stonemason-universal-stonebound",
    "stonemason",
    "",
    "Stonebound",
    "minor",
    "+1 Hardness and +10% item/structure HP.",
    "universal"
  ],
  [
    "stonemason-universal-perfect-foundation",
    "stonemason",
    "",
    "Perfect Foundation",
    "minor",
    "+2 Artisan bonus to checks to stabilise or repair a structure using this work.",
    "universal"
  ],
  [
    "stonemason-universal-anchored-construction",
    "stonemason",
    "",
    "Anchored Construction",
    "standard",
    "+2 Artisan bonus against forced movement/toppling; structures count as one size larger for such effects.",
    "universal"
  ],
  [
    "stonemason-universal-load-bearing-cut",
    "stonemason",
    "",
    "Load-Bearing Cut",
    "standard",
    "Increase structure/stone-component HP by 20%.",
    "universal"
  ],
  [
    "stonemason-universal-resonant-stone",
    "stonemason",
    "",
    "Resonant Stone",
    "standard",
    "Component gains one `ward`, `arcane-anchor` or equivalent approved tag for compatible specialist work.",
    "universal"
  ],
  [
    "stonemason-specialty-1-masons-seal",
    "stonemason",
    "specialty-1",
    "Mason's Seal",
    "minor",
    "+2 Artisan bonus to identify damage, load paths and original construction methods in stone works.",
    "specialization"
  ],
  [
    "stonemason-specialty-1-enduring-monument",
    "stonemason",
    "specialty-1",
    "Enduring Monument",
    "standard",
    "Structure gains +25% HP and +2 Hardness.",
    "specialization"
  ],
  [
    "stonemason-specialty-1-grand-foundation",
    "stonemason",
    "specialty-1",
    "Grand Foundation",
    "major",
    "Structures built on this foundation gain +2 Artisan bonus against collapse, subsidence and siege movement; repairs restore 25% more HP.",
    "specialization"
  ],
  [
    "stonemason-specialty-1-civic-wonder",
    "stonemason",
    "specialty-1",
    "Civic Wonder",
    "major",
    "Assign one Kingdom purpose at creation—Culture, Defence, Trade, Faith or Infrastructure—and grant a strong project bonus agreed for that subsystem.",
    "specialization"
  ],
  [
    "stonemason-specialty-1-imperial-work",
    "stonemason",
    "specialty-1",
    "Imperial Work",
    "superior",
    "Major structure reduces one related Kingdom resource cost by 25% and counts as a landmark/wonder for prestige and strategic effects.",
    "specialization"
  ],
  [
    "stonemason-specialty-1-world-rooted-foundation",
    "stonemason",
    "specialty-1",
    "World-Rooted Foundation",
    "superior",
    "Structure cannot be moved or toppled by ordinary effects and gains resistance to siege/structural damage equal to 3 × Core Tier.",
    "specialization"
  ],
  [
    "stonemason-specialty-2-inscribed-keystone",
    "stonemason",
    "specialty-2",
    "Inscribed Keystone",
    "minor",
    "+2 Artisan bonus to identify/repair the ward and clearly marks ownership or purpose to authorised users.",
    "specialization"
  ],
  [
    "stonemason-specialty-2-sentinel-rune",
    "stonemason",
    "specialty-2",
    "Sentinel Rune",
    "standard",
    "Ward detects a chosen creature/type crossing its boundary and alerts designated recipients within the site.",
    "specialization"
  ],
  [
    "stonemason-specialty-2-sanctuary-ward",
    "stonemason",
    "specialty-2",
    "Sanctuary Ward",
    "major",
    "Allies in a 20-ft zone gain +1 Artisan bonus to saves and temp HP equal to Core Tier when they first enter each encounter.",
    "specialization"
  ],
  [
    "stonemason-specialty-2-war-rune",
    "stonemason",
    "specialty-2",
    "War Rune",
    "major",
    "Defenders in a 20-ft zone gain +1 Artisan bonus to attack rolls and damage equal to Core Tier on first successful Strike each round.",
    "specialization"
  ],
  [
    "stonemason-specialty-2-fortress-sigil",
    "stonemason",
    "specialty-2",
    "Fortress Sigil",
    "superior",
    "Large warded area suppresses hostile teleportation/forced planar entry unless attacker succeeds at a counteract/check against the ward's DC.",
    "specialization"
  ],
  [
    "stonemason-specialty-2-dominion-ward",
    "stonemason",
    "specialty-2",
    "Dominion Ward",
    "superior",
    "Choose one hostile creature family or supernatural theme; within the ward they take a -1 Artisan penalty to attacks/saves and cannot benefit from concealment against authorised defenders.",
    "specialization"
  ],
  [
    "stonemason-specialty-3-titanic-fit",
    "stonemason",
    "specialty-3",
    "Titanic Fit",
    "minor",
    "Ignore 1 Bulk of a stone component for encumbrance while properly worn/wielded.",
    "specialization"
  ],
  [
    "stonemason-specialty-3-anchored",
    "stonemason",
    "specialty-3",
    "Anchored",
    "standard",
    "+2 Artisan bonus against forced movement, Trip and Reposition while using the item; count as one size larger for those effects where allowed.",
    "specialization"
  ],
  [
    "stonemason-specialty-3-earthshaker",
    "stonemason",
    "specialty-3",
    "Earthshaker",
    "major",
    "Once/round on a critical hit or successful Shield Block, adjacent enemy must save or become off-guard and knocked 5 ft; critical failure also prone.",
    "specialization"
  ],
  [
    "stonemason-specialty-3-mountain-plate",
    "stonemason",
    "specialty-3",
    "Mountain Plate",
    "major",
    "Worn armour grants physical resistance equal to Core Tier and Max HP equal to 4 × Core Tier.",
    "specialization"
  ],
  [
    "stonemason-specialty-3-mountain-blood-plate",
    "stonemason",
    "specialty-3",
    "Mountain-Blood Plate",
    "superior",
    "Worn armour grants Max HP equal to 8 × Core Tier and physical resistance equal to 2 × Core Tier. Does not stack with another Max-HP Artisan Mark.",
    "specialization"
  ],
  [
    "stonemason-specialty-3-living-colossus",
    "stonemason",
    "specialty-3",
    "Living Colossus",
    "superior",
    "Once/day for 1 minute increase size by one category, gain +5 ft reach, +2 Artisan bonus to Athletics and physical resistance equal to Core Tier.",
    "specialization"
  ],
  [
    "glassmaking-universal-perfect-clarity",
    "glassmaking",
    "",
    "Perfect Clarity",
    "minor",
    "+1 Artisan bonus to visual Perception checks made through the crafted optic.",
    "universal"
  ],
  [
    "glassmaking-universal-hardened-glass",
    "glassmaking",
    "",
    "Hardened Glass",
    "minor",
    "Glass component gains +2 Hardness and +20% HP.",
    "universal"
  ],
  [
    "glassmaking-universal-arcane-lens",
    "glassmaking",
    "",
    "Arcane Lens",
    "standard",
    "Item gains `arcane`, `optic`, `conductor` tags for compatible specialist Marks.",
    "universal"
  ],
  [
    "glassmaking-universal-precision-focus",
    "glassmaking",
    "",
    "Precision Focus",
    "standard",
    "+1 Artisan bonus to one approved ranged measurement/surveying check using the item.",
    "universal"
  ],
  [
    "glassmaking-universal-shatter-safe",
    "glassmaking",
    "",
    "Shatter Safe",
    "standard",
    "First time per day the glass component would be destroyed, it instead remains at 1 HP.",
    "universal"
  ],
  [
    "glassmaking-specialty-1-calibrated-lens",
    "glassmaking",
    "specialty-1",
    "Calibrated Lens",
    "minor",
    "+1 Artisan bonus to visual Perception and range-estimation checks made through the optic.",
    "specialization"
  ],
  [
    "glassmaking-specialty-1-focusing-lens",
    "glassmaking",
    "specialty-1",
    "Focusing Lens",
    "standard",
    "Ranged weapon/focus increases first range increment by 25%; spell focus gains +10 ft to one approved non-area range category.",
    "specialization"
  ],
  [
    "glassmaking-specialty-1-spectrum-prism",
    "glassmaking",
    "specialty-1",
    "Spectrum Prism",
    "major",
    "Choose two energy types at creation; once per round when dealing one, convert up to half the bonus energy damage to the other.",
    "specialization"
  ],
  [
    "glassmaking-specialty-1-beam-splitter",
    "glassmaking",
    "specialty-1",
    "Beam Splitter",
    "major",
    "Once/encounter after a ranged Strike or single-target item activation hits, repeat 50% of its bonus damage/effect against a second target within 15 ft of the first.",
    "specialization"
  ],
  [
    "glassmaking-specialty-1-trueglass-crown",
    "glassmaking",
    "specialty-1",
    "Trueglass Crown",
    "superior",
    "Wearer gains constant see-invisibility-style perception within 30 ft and +2 Artisan bonus to checks/saves against visual illusions and concealment.",
    "specialization"
  ],
  [
    "glassmaking-specialty-1-crown-prism",
    "glassmaking",
    "specialty-1",
    "Crown Prism",
    "superior",
    "Spellcasting focus gains +1 spell attack and spell DC beyond Core progression. Does not stack with another Over-Potency effect; requires T5+ optical core/component.",
    "specialization"
  ],
  [
    "glassmaking-specialty-2-perfect-reflection",
    "glassmaking",
    "specialty-2",
    "Perfect Reflection",
    "minor",
    "Mirror retains flawless clarity and grants +1 Artisan bonus to visual identification or disguise checks using it.",
    "specialization"
  ],
  [
    "glassmaking-specialty-2-truth-mirror",
    "glassmaking",
    "specialty-2",
    "Truth Mirror",
    "standard",
    "+2 Artisan bonus to checks to detect visual disguises, glamours and shape-changing seen in the mirror.",
    "specialization"
  ],
  [
    "glassmaking-specialty-2-reflective-ward",
    "glassmaking",
    "specialty-2",
    "Reflective Ward",
    "major",
    "Reaction once/encounter when targeted by a spell attack: gain +2 Artisan bonus to AC against it; if the attack critically misses, redirect a reduced version at an eligible target within 30 ft.",
    "specialization"
  ],
  [
    "glassmaking-specialty-2-doppelglass",
    "glassmaking",
    "specialty-2",
    "Doppelglass",
    "major",
    "Once/encounter create a reflected duplicate until start of next turn, granting concealed against the next attack that targets you.",
    "specialization"
  ],
  [
    "glassmaking-specialty-2-gate-mirror",
    "glassmaking",
    "specialty-2",
    "Gate Mirror",
    "superior",
    "Pair with another crafted Gate Mirror; once/day transport willing creatures through the linked mirrors subject to GM-set distance/Kingdom infrastructure limits.",
    "specialization"
  ],
  [
    "glassmaking-specialty-2-mirror-lord",
    "glassmaking",
    "specialty-2",
    "Mirror Lord",
    "superior",
    "Once/day for 1 minute, first hostile spell or ranged magical effect each round targeting wearer can be contested with a counteract-style check; success negates, critical success reflects it.",
    "specialization"
  ],
  [
    "glassmaking-specialty-3-stable-cell",
    "glassmaking",
    "specialty-3",
    "Stable Cell",
    "minor",
    "Stored magical charge does not decay under ordinary downtime/environmental conditions.",
    "specialization"
  ],
  [
    "glassmaking-specialty-3-mana-reservoir",
    "glassmaking",
    "specialty-3",
    "Mana Reservoir",
    "standard",
    "Item gains 1 charge/day usable by one listed custom activation.",
    "specialization"
  ],
  [
    "glassmaking-specialty-3-arcane-conductor",
    "glassmaking",
    "specialty-3",
    "Arcane Conductor",
    "major",
    "Increase one magical damage/healing effect generated by the item by +1 die; if effect has no dice, increase fixed value by 25%.",
    "specialization"
  ],
  [
    "glassmaking-specialty-3-overflow-channel",
    "glassmaking",
    "specialty-3",
    "Overflow Channel",
    "major",
    "Once/encounter overcharge one activation: +50% range or +1 damage/healing die, but item loses 1 additional charge if it has charges.",
    "specialization"
  ],
  [
    "glassmaking-specialty-3-crystal-matrix",
    "glassmaking",
    "specialty-3",
    "Crystal Matrix",
    "superior",
    "Reduce the Capacity cost of one compatible Enchanting or Azlanti Artifice Mark on the same item by 1, minimum 1; the item still cannot exceed the Capacity granted by its Core Tier unless another explicit effect raises that maximum.",
    "specialization"
  ],
  [
    "glassmaking-specialty-3-eternity-cell",
    "glassmaking",
    "specialty-3",
    "Eternity Cell",
    "superior",
    "Item gains 3 charges/day and recovers 1 expended charge the first time each encounter the wearer critically succeeds at a relevant attack/save/activation check.",
    "specialization"
  ],
  [
    "pottery-universal-hardened-ceramic",
    "pottery",
    "",
    "Hardened Ceramic",
    "minor",
    "+1 Hardness and +10% item HP.",
    "universal"
  ],
  [
    "pottery-universal-thermal-craft",
    "pottery",
    "",
    "Thermal Craft",
    "minor",
    "Container/component safely handles extreme mundane heat/cold.",
    "universal"
  ],
  [
    "pottery-universal-sealed-vessel",
    "pottery",
    "",
    "Sealed Vessel",
    "standard",
    "Contents do not leak, evaporate or contaminate through ordinary damage until the vessel is Broken.",
    "universal"
  ],
  [
    "pottery-universal-shock-fired",
    "pottery",
    "",
    "Shock-Fired",
    "standard",
    "+2 Artisan bonus against effects that would shatter or rupture the ceramic item.",
    "universal"
  ],
  [
    "pottery-universal-nested-chamber",
    "pottery",
    "",
    "Nested Chamber",
    "standard",
    "Creates one concealed internal compartment or secondary reagent chamber.",
    "universal"
  ],
  [
    "pottery-specialty-1-fired-seal",
    "pottery",
    "specialty-1",
    "Fired Seal",
    "minor",
    "+1 Artisan bonus to identify or repair the ceramic component and its maker's construction pattern.",
    "specialization"
  ],
  [
    "pottery-specialty-1-ceramic-plate",
    "pottery",
    "specialty-1",
    "Ceramic Plate",
    "standard",
    "Armour component gains +2 Hardness and +15 HP per Core Tier without increasing Bulk.",
    "specialization"
  ],
  [
    "pottery-specialty-1-living-clay",
    "pottery",
    "specialty-1",
    "Living Clay",
    "major",
    "At start of wearer's turn, repair the item itself for HP equal to Core Tier if it is not Destroyed.",
    "specialization"
  ],
  [
    "pottery-specialty-1-terracotta-guardian",
    "pottery",
    "specialty-1",
    "Terracotta Guardian",
    "major",
    "Once/day animate a small guardian/figurine for 10 minutes; use a GM-approved creature profile appropriate to item tier, primarily defensive/support focused.",
    "specialization"
  ],
  [
    "pottery-specialty-1-adaptive-ceramic",
    "pottery",
    "specialty-1",
    "Adaptive Ceramic",
    "superior",
    "Once/round when struck by physical damage, choose bludgeoning/piercing/slashing; gain resistance equal to 2 × Core Tier against that type until start of next turn.",
    "specialization"
  ],
  [
    "pottery-specialty-1-living-ceramic-shell",
    "pottery",
    "specialty-1",
    "Living Ceramic Shell",
    "superior",
    "Worn armour grants regenerating temp HP equal to 2 × Core Tier at start of each turn if wearer has none; also repairs itself for same amount.",
    "specialization"
  ],
  [
    "pottery-specialty-2-sanctified-vessel",
    "pottery",
    "specialty-2",
    "Sanctified Vessel",
    "minor",
    "+2 Artisan bonus to checks to identify the contained essence and prevents ordinary spiritual leakage.",
    "specialization"
  ],
  [
    "pottery-specialty-2-essence-vessel",
    "pottery",
    "specialty-2",
    "Essence Vessel",
    "standard",
    "Safely stores one harvested supernatural essence for later crafting without degradation.",
    "specialization"
  ],
  [
    "pottery-specialty-2-bound-spirit",
    "pottery",
    "specialty-2",
    "Bound Spirit",
    "major",
    "House one willing/controlled spirit; item can grant one minor sense, Lore or once/day guidance effect tied to that spirit.",
    "specialization"
  ],
  [
    "pottery-specialty-2-sealed-curse",
    "pottery",
    "specialty-2",
    "Sealed Curse",
    "major",
    "Contain one curse/hazard effect; while sealed it cannot spread normally and grants +2 Artisan bonus to counteract/manage it.",
    "specialization"
  ],
  [
    "pottery-specialty-2-release-matrix",
    "pottery",
    "specialty-2",
    "Release Matrix",
    "superior",
    "Once/day deliberately discharge stored essence as a powerful item activation appropriate to the source; vessel then requires recharging/refilling.",
    "specialization"
  ],
  [
    "pottery-specialty-2-grand-reliquary",
    "pottery",
    "specialty-2",
    "Grand Reliquary",
    "superior",
    "Safely maintain up to three compatible essences and switch the active one during daily preparations; once/day combine two for one Synergy-style activation.",
    "specialization"
  ],
  [
    "pottery-specialty-3-heatproof-glaze",
    "pottery",
    "specialty-3",
    "Heatproof Glaze",
    "minor",
    "Container/component ignores ordinary heat damage and gains +2 Artisan bonus against thermal breakage.",
    "specialization"
  ],
  [
    "pottery-specialty-3-thermal-crucible",
    "pottery",
    "specialty-3",
    "Thermal Crucible",
    "standard",
    "When used by another artisan processing heat-sensitive material, reduce material loss by 10%.",
    "specialization"
  ],
  [
    "pottery-specialty-3-fragmenting-casing",
    "pottery",
    "specialty-3",
    "Fragmenting Casing",
    "major",
    "Increase bomb/splash item's splash radius by 5 ft and splash damage by Core Tier.",
    "specialization"
  ],
  [
    "pottery-specialty-3-shaped-charge",
    "pottery",
    "specialty-3",
    "Shaped Charge",
    "major",
    "Explosive item can trade splash radius for force: against one target/object deal +1 damage die per two Core Tiers, rounded up.",
    "specialization"
  ],
  [
    "pottery-specialty-3-pressure-vessel",
    "pottery",
    "specialty-3",
    "Pressure Vessel",
    "superior",
    "Increase one explosive/alchemical item's primary damage by 50%; on a critical crafting failure during manufacture, complication severity is increased.",
    "specialization"
  ],
  [
    "pottery-specialty-3-furnace-heart",
    "pottery",
    "specialty-3",
    "Furnace Heart",
    "superior",
    "Once/day emit a 15-ft thermal eruption dealing 2d6 fire per Core Tier, basic Reflex save; item remains a qualifying portable forge/crucible for relevant downtime work.",
    "specialization"
  ],
  [
    "weaving-universal-lightweave",
    "weaving",
    "",
    "Lightweave",
    "minor",
    "Reduce Bulk by 1 for primarily textile equipment.",
    "universal"
  ],
  [
    "weaving-universal-perfect-thread",
    "weaving",
    "",
    "Perfect Thread",
    "minor",
    "+1 Artisan bonus to the next Tailoring/Leatherworking check using this textile as a component.",
    "universal"
  ],
  [
    "weaving-universal-reinforced-weave",
    "weaving",
    "",
    "Reinforced Weave",
    "standard",
    "Textile item/component gains +20% HP and +1 Hardness.",
    "universal"
  ],
  [
    "weaving-universal-weatherproof-weave",
    "weaving",
    "",
    "Weatherproof Weave",
    "standard",
    "Wearer ignores ordinary rain/wind exposure and gains +1 Artisan bonus against severe weather.",
    "universal"
  ],
  [
    "weaving-universal-tensioned-thread",
    "weaving",
    "",
    "Tensioned Thread",
    "standard",
    "Rope, bowstring, net or sail gains +2 Artisan bonus to checks involving load, restraint or structural tension.",
    "universal"
  ],
  [
    "weaving-specialty-1-resonant-thread",
    "weaving",
    "specialty-1",
    "Resonant Thread",
    "minor",
    "Textile gains `mana`, `conductor`, `aetherwoven` tags and +1 Artisan bonus to checks to identify its magic.",
    "specialization"
  ],
  [
    "weaving-specialty-1-manaweave",
    "weaving",
    "specialty-1",
    "Manaweave",
    "standard",
    "Worn item gains resistance to one chosen magical energy type equal to Core Tier.",
    "specialization"
  ],
  [
    "weaving-specialty-1-spellthread",
    "weaving",
    "specialty-1",
    "Spellthread",
    "major",
    "Store one approved spell/effect in the garment, usable once/day at an item rank appropriate to Core Tier.",
    "specialization"
  ],
  [
    "weaving-specialty-1-ethereal-weave",
    "weaving",
    "specialty-1",
    "Ethereal Weave",
    "major",
    "Wearer ignores difficult terrain from non-magical ground and once/encounter Steps 10 ft through occupied spaces without triggering reactions.",
    "specialization"
  ],
  [
    "weaving-specialty-1-expanded-matrix",
    "weaving",
    "specialty-1",
    "Expanded Matrix",
    "superior",
    "Reduce one compatible Enchanting/Tailoring Mark's Capacity cost by 1, minimum 1; finished item still has hard maximum 8 Capacity.",
    "specialization"
  ],
  [
    "weaving-specialty-1-aetherbound-form",
    "weaving",
    "specialty-1",
    "Aetherbound Form",
    "superior",
    "Once/day for 1 minute garment becomes semi-ethereal: fly Speed 20 ft, resistance to physical damage equal to Core Tier, and wearer can squeeze through openings as though one size smaller.",
    "specialization"
  ],
  [
    "weaving-specialty-2-warcloth-finish",
    "weaving",
    "specialty-2",
    "Warcloth Finish",
    "minor",
    "+10% textile component HP and +1 Artisan bonus to checks against tearing/cutting.",
    "specialization"
  ],
  [
    "weaving-specialty-2-impact-mesh",
    "weaving",
    "specialty-2",
    "Impact Mesh",
    "standard",
    "Worn gear grants resistance 1 to physical damage per two Core Tiers, rounded up.",
    "specialization"
  ],
  [
    "weaving-specialty-2-flexible-weave",
    "weaving",
    "specialty-2",
    "Flexible Weave",
    "major",
    "Reduce one armour movement penalty by 5 ft and improve one Dex-cap-style campaign limitation by +1 where applicable.",
    "specialization"
  ],
  [
    "weaving-specialty-2-shock-absorbing-warcloth",
    "weaving",
    "specialty-2",
    "Shock-Absorbing Warcloth",
    "major",
    "At start of each turn, if wearer has no temp HP, gain temp HP equal to Core Tier.",
    "specialization"
  ],
  [
    "weaving-specialty-2-silken-steel",
    "weaving",
    "specialty-2",
    "Silken Steel",
    "superior",
    "Worn armour gains +1 AC beyond Core progression and physical resistance equal to Core Tier; does not stack with another Artisan AC-over-Core effect.",
    "specialization"
  ],
  [
    "weaving-specialty-2-unbreakable-braid",
    "weaving",
    "specialty-2",
    "Unbreakable Braid",
    "superior",
    "Worn item grants Max HP equal to 6 × Core Tier; ropes/nets/structural textiles instead gain +100% HP and +5 Hardness.",
    "specialization"
  ],
  [
    "weaving-specialty-3-heraldic-seal",
    "weaving",
    "specialty-3",
    "Heraldic Seal",
    "minor",
    "+1 Artisan bonus to social checks proving authority, affiliation or military identity represented by the standard.",
    "specialization"
  ],
  [
    "weaving-specialty-3-unbroken-standard",
    "weaving",
    "specialty-3",
    "Unbroken Standard",
    "standard",
    "Allies within 20 ft gain +1 Artisan bonus to saves against fear while the banner is displayed.",
    "specialization"
  ],
  [
    "weaving-specialty-3-marching-banner",
    "weaving",
    "specialty-3",
    "Marching Banner",
    "major",
    "Allies beginning turn within 20 ft gain +5 ft status-equivalent movement for that turn and ignore first 5 ft of difficult terrain.",
    "specialization"
  ],
  [
    "weaving-specialty-3-kings-colours",
    "weaving",
    "specialty-3",
    "King's Colours",
    "major",
    "Allies within 20 ft gain +1 Artisan bonus to saves against mental effects and +1 to Aid checks involving coordinated action.",
    "specialization"
  ],
  [
    "weaving-specialty-3-conquerors-standard",
    "weaving",
    "specialty-3",
    "Conqueror's Standard",
    "superior",
    "Once/encounter for 1 minute, allies in 30 ft gain +1 Artisan bonus to attack rolls after they reduce an enemy to 0 HP; bonus lasts until end of their next turn.",
    "specialization"
  ],
  [
    "weaving-specialty-3-sovereign-standard",
    "weaving",
    "specialty-3",
    "Sovereign Standard",
    "superior",
    "30-ft aura: allies gain +1 Artisan bonus to saves and damage equal to Core Tier on first hit each round; once/day aura also grants temp HP equal to 3 × Core Tier when activated.",
    "specialization"
  ],
  [
    "bookmaking-universal-perfect-index",
    "bookmaking",
    "",
    "Perfect Index",
    "minor",
    "Find a known entry in the work immediately rather than spending extended search time.",
    "universal"
  ],
  [
    "bookmaking-universal-preserved-knowledge",
    "bookmaking",
    "",
    "Preserved Knowledge",
    "minor",
    "Book/map/formula resists ordinary water, age and environmental damage.",
    "universal"
  ],
  [
    "bookmaking-universal-master-copy",
    "bookmaking",
    "",
    "Master Copy",
    "standard",
    "Copying a formula/text from this master takes 50% less downtime.",
    "universal"
  ],
  [
    "bookmaking-universal-encoded-script",
    "bookmaking",
    "",
    "Encoded Script",
    "standard",
    "+2 Artisan bonus to conceal or protect the text from unauthorised reading.",
    "universal"
  ],
  [
    "bookmaking-universal-reference-tabs",
    "bookmaking",
    "",
    "Reference Tabs",
    "standard",
    "Once per 10 minutes, gain +1 Artisan bonus to one Recall Knowledge check using the work's documented subject.",
    "universal"
  ],
  [
    "bookmaking-specialty-1-indexed-arcana",
    "bookmaking",
    "specialty-1",
    "Indexed Arcana",
    "minor",
    "+1 Artisan bonus to Recall Knowledge about spells recorded in the grimoire and instantly locate any known entry.",
    "specialization"
  ],
  [
    "bookmaking-specialty-1-mnemonic-pages",
    "bookmaking",
    "specialty-1",
    "Mnemonic Pages",
    "standard",
    "Once/day during preparation, swap one prepared/recorded spell choice of an appropriate rank without needing another full preparation period.",
    "specialization"
  ],
  [
    "bookmaking-specialty-1-resonant-chapter",
    "bookmaking",
    "specialty-1",
    "Resonant Chapter",
    "major",
    "Choose one spell trait/theme; spells of that theme gain +1 Artisan bonus to damage/healing per spell rank or +1 to one associated counteract/check, chosen at creation.",
    "specialization"
  ],
  [
    "bookmaking-specialty-1-spell-echo",
    "bookmaking",
    "specialty-1",
    "Spell Echo",
    "major",
    "Once/encounter after casting a spell from/through the grimoire, repeat one non-damaging minor rider or 50% of bonus damage/healing against the same or a second valid target.",
    "specialization"
  ],
  [
    "bookmaking-specialty-1-archmage-codex",
    "bookmaking",
    "specialty-1",
    "Archmage Codex",
    "superior",
    "Once/day for 1 minute choose one mode: +25% spell range, ignore resistance equal to Core Tier, or add +1 spell damage/healing die.",
    "specialization"
  ],
  [
    "bookmaking-specialty-1-endless-grimoire",
    "bookmaking",
    "specialty-1",
    "Endless Grimoire",
    "superior",
    "Once/day recover one expended spell slot or equivalent spell resource of a rank no higher than half Core Tier rounded up, subject to GM conversion for non-slot casters.",
    "specialization"
  ],
  [
    "bookmaking-specialty-2-scholars-index",
    "bookmaking",
    "specialty-2",
    "Scholar's Index",
    "minor",
    "+1 Artisan bonus to research checks using the chronicle's documented subject.",
    "specialization"
  ],
  [
    "bookmaking-specialty-2-lore-codex",
    "bookmaking",
    "specialty-2",
    "Lore Codex",
    "standard",
    "After 10 minutes study, gain trained-equivalent access to one narrow Lore for 8 hours, or +1 Artisan bonus if already trained.",
    "specialization"
  ],
  [
    "bookmaking-specialty-2-crafting-manual",
    "bookmaking",
    "specialty-2",
    "Crafting Manual",
    "major",
    "For one recipe/category, reduce crafting downtime by 20% and gain +2 Artisan bonus to the first project check each day.",
    "specialization"
  ],
  [
    "bookmaking-specialty-2-tactical-treatise",
    "bookmaking",
    "specialty-2",
    "Tactical Treatise",
    "major",
    "After study, once/encounter gain +2 Artisan bonus to one attack, save or Recall Knowledge check against the documented enemy/tactic.",
    "specialization"
  ],
  [
    "bookmaking-specialty-2-masters-testament",
    "bookmaking",
    "specialty-2",
    "Master's Testament",
    "superior",
    "After daily study, gain temporary access to one approved feat/technique for which you meet level prerequisites until next preparations.",
    "specialization"
  ],
  [
    "bookmaking-specialty-2-legendary-chronicle",
    "bookmaking",
    "specialty-2",
    "Legendary Chronicle",
    "superior",
    "During preparations choose one documented discipline; up to six readers gain +1 Artisan bonus to related skill checks and one once/day reroll in that discipline.",
    "specialization"
  ],
  [
    "bookmaking-specialty-3-surveyors-mark",
    "bookmaking",
    "specialty-3",
    "Surveyor's Mark",
    "minor",
    "+1 Artisan bonus to navigation and Reconnoiter-style checks in mapped territory.",
    "specialization"
  ],
  [
    "bookmaking-specialty-3-safe-passage",
    "bookmaking",
    "specialty-3",
    "Safe Passage",
    "standard",
    "Party reduces non-combat travel delay from known mundane hazards by 25% in mapped territory.",
    "specialization"
  ],
  [
    "bookmaking-specialty-3-resource-survey",
    "bookmaking",
    "specialty-3",
    "Resource Survey",
    "major",
    "Map can reveal one hidden or underexploited resource site after successful survey; Kingdom extraction from it gains +1 project bonus.",
    "specialization"
  ],
  [
    "bookmaking-specialty-3-strategic-map",
    "bookmaking",
    "specialty-3",
    "Strategic Map",
    "major",
    "Armies/parties using the map gain +1 Artisan bonus to initiative or strategic movement checks in the mapped region.",
    "specialization"
  ],
  [
    "bookmaking-specialty-3-hidden-paths",
    "bookmaking",
    "specialty-3",
    "Hidden Paths",
    "superior",
    "Discover or establish a secret route that reduces travel time by 25% and grants +2 Artisan bonus to avoid detection while using it.",
    "specialization"
  ],
  [
    "bookmaking-specialty-3-world-atlas",
    "bookmaking",
    "specialty-3",
    "World Atlas",
    "superior",
    "Atlas magically updates known mapped holdings; once per Kingdom turn designate one mapped region to gain a strong temporary bonus to travel, resource extraction or settlement planning.",
    "specialization"
  ],
  [
    "tailoring-universal-perfect-fit",
    "tailoring",
    "",
    "Perfect Fit",
    "minor",
    "Reduce worn garment Bulk by 1 where sensible and remove minor fitting penalties.",
    "universal"
  ],
  [
    "tailoring-universal-reinforced-seam",
    "tailoring",
    "",
    "Reinforced Seam",
    "minor",
    "+10% garment HP and +1 Hardness.",
    "universal"
  ],
  [
    "tailoring-universal-hidden-pocketing",
    "tailoring",
    "",
    "Hidden Pocketing",
    "standard",
    "+2 Artisan bonus to conceal one appropriately sized carried object.",
    "universal"
  ],
  [
    "tailoring-universal-quick-access-cut",
    "tailoring",
    "",
    "Quick-Access Cut",
    "standard",
    "Once per round, draw one stored light object as part of the action used to activate/use it.",
    "universal"
  ],
  [
    "tailoring-universal-layered-lining",
    "tailoring",
    "",
    "Layered Lining",
    "standard",
    "Garment can accept one eligible secondary textile/leather component without increasing Bulk.",
    "universal"
  ],
  [
    "tailoring-specialty-1-combat-cut",
    "tailoring",
    "specialty-1",
    "Combat Cut",
    "minor",
    "Reduce one minor worn-equipment movement/fitting penalty and +1 Artisan bonus to Acrobatics checks involving the garment's mobility.",
    "specialization"
  ],
  [
    "tailoring-specialty-1-quickdraw-harness",
    "tailoring",
    "specialty-1",
    "Quickdraw Harness",
    "standard",
    "Once per round, draw one secured light weapon/item as part of the action used to wield or activate it.",
    "specialization"
  ],
  [
    "tailoring-specialty-1-vital-reinforcement",
    "tailoring",
    "specialty-1",
    "Vital Reinforcement",
    "major",
    "While attuned to worn armour/garment, gain Max HP equal to 5 × Core Tier. Does not stack with another Max-HP Artisan Mark.",
    "specialization"
  ],
  [
    "tailoring-specialty-1-reactive-weave",
    "tailoring",
    "specialty-1",
    "Reactive Weave",
    "major",
    "Reaction once/round when damaged: reduce damage by Core Tier + 2; if attack was a critical hit, reduce by twice that amount.",
    "specialization"
  ],
  [
    "tailoring-specialty-1-war-skin",
    "tailoring",
    "specialty-1",
    "War-Skin",
    "superior",
    "Worn armour gains +1 AC beyond Core progression, +5 ft Speed and physical resistance equal to Core Tier. Does not stack with another AC-over-Core effect.",
    "specialization"
  ],
  [
    "tailoring-specialty-1-war-skin-regeneration",
    "tailoring",
    "specialty-1",
    "War-Skin Regeneration",
    "superior",
    "At start of each turn gain temp HP equal to 2 × Core Tier if you have none; if you took no damage since your previous turn, gain 3 × Core Tier instead.",
    "specialization"
  ],
  [
    "tailoring-specialty-2-silent-stitch",
    "tailoring",
    "specialty-2",
    "Silent Stitch",
    "minor",
    "+1 Artisan bonus to Stealth checks where clothing noise would matter.",
    "specialization"
  ],
  [
    "tailoring-specialty-2-chameleon-cloth",
    "tailoring",
    "specialty-2",
    "Chameleon Cloth",
    "standard",
    "+2 Artisan bonus to Hide/Sneak while stationary or moving at half Speed in a chosen environment palette.",
    "specialization"
  ],
  [
    "tailoring-specialty-2-many-faced-weave",
    "tailoring",
    "specialty-2",
    "Many-Faced Weave",
    "major",
    "As a 1-minute adjustment, alter apparent clothing, silhouette and facial framing; gain +2 Artisan bonus to impersonation/disguise checks.",
    "specialization"
  ],
  [
    "tailoring-specialty-2-shadow-mantle",
    "tailoring",
    "specialty-2",
    "Shadow Mantle",
    "major",
    "Once/encounter for 1 minute gain concealment while in dim light or darkness; first successful Strike each round does not end it.",
    "specialization"
  ],
  [
    "tailoring-specialty-2-phase-veil",
    "tailoring",
    "specialty-2",
    "Phase Veil",
    "superior",
    "Once/encounter for 1 round become partially incorporeal: move through creatures, gain physical resistance equal to 2 × Core Tier and ignore difficult terrain.",
    "specialization"
  ],
  [
    "tailoring-specialty-2-null-mantle",
    "tailoring",
    "specialty-2",
    "Null Mantle",
    "superior",
    "Once/day for 1 minute become invisible to mundane sight and gain +2 Artisan bonus against magical detection/counteract attempts; attacking suppresses invisibility until start of next turn.",
    "specialization"
  ],
  [
    "tailoring-specialty-3-court-finish",
    "tailoring",
    "specialty-3",
    "Court Finish",
    "minor",
    "+1 Artisan bonus to Society checks involving formal protocol, heraldry or court presentation.",
    "specialization"
  ],
  [
    "tailoring-specialty-3-envoys-raiment",
    "tailoring",
    "specialty-3",
    "Envoy's Raiment",
    "standard",
    "+2 Artisan bonus to Diplomacy when acting in an official recognised capacity.",
    "specialization"
  ],
  [
    "tailoring-specialty-3-commanders-mantle",
    "tailoring",
    "specialty-3",
    "Commander's Mantle",
    "major",
    "Allies within 15 ft gain +1 Artisan bonus to Aid and saves against fear while wearer is conscious and visibly acting as leader.",
    "specialization"
  ],
  [
    "tailoring-specialty-3-judicators-robes",
    "tailoring",
    "specialty-3",
    "Judicator's Robes",
    "major",
    "+2 Artisan bonus to Sense Motive and checks to detect deliberate lies or enforce formal authority; once/encounter designate one creature as under judgement, granting +1 to allies' first save against it.",
    "specialization"
  ],
  [
    "tailoring-specialty-3-sovereign-presence",
    "tailoring",
    "specialty-3",
    "Sovereign Presence",
    "superior",
    "30-ft aura for 1 minute once/encounter: allies gain +1 Artisan bonus to saves and enemies take -1 Artisan penalty to fear/mental saves against the wearer.",
    "specialization"
  ],
  [
    "tailoring-specialty-3-coronation-regalia",
    "tailoring",
    "specialty-3",
    "Coronation Regalia",
    "superior",
    "While worn by the recognised office-holder, grant Max HP equal to 5 × Core Tier, +1 Artisan bonus to Diplomacy/Intimidation, and once/day give allies within 30 ft temp HP equal to 3 × Core Tier.",
    "specialization"
  ]
];


const NON_ITEM_EFFECT = /\b(?:army|armies|settlement|kingdom|road|roads|bridge|bridges|dock|docks|fortress|fortresses|aqueduct|monument|monuments|district|infrastructure|public works|regional|siege foundry|civic)\b/i;
const ITEM_GROUP_PATTERNS = Object.freeze({
  weapon: /\b(?:weapon|weapons|strike|strikes|attack|attacks|ammunition|bow|crossbow|blade|edge)\b/i,
  armor: /\b(?:armour|armor|garment|garments|robe|robes|cloak|cloaks|mantle|mantles|clothing)\b/i,
  shield: /\bshield|shields\b/i,
  spellFocus: /\b(?:spell focus|focus|grimoire|spellbook|codex|wand|sceptre|scepter|implement|holy symbol|relic|censer|rune|runes|enchant(?:ment|ed)?)\b/i,
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function slug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[’']/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

function validItemGroups(effect, professionId) {
  const explicit = Object.entries(ITEM_GROUP_PATTERNS)
    .filter(([, pattern]) => pattern.test(effect))
    .map(([group]) => group);
  if (explicit.length) return explicit;
  if (NON_ITEM_EFFECT.test(effect)) return [];
  return [...(ARTISAN_PROFESSION_RULES[professionId]?.itemGroups ?? [])];
}

function stackGroup(effect) {
  const match = /does not stack with (?:another|other) ([^.]+?)(?: effect)?\./i.exec(effect);
  return match ? slug(match[1]) : "";
}

function makeDefinition([id, professionId, specializationId, name, grade, effectSummary, source]) {
  const profession = ARTISAN_PROFESSION_RULES[professionId];
  const gradeRules = ARTISAN_MARK_GRADE_RULES[grade];
  const feature = SPECIALISATION_FEATURES.find((entry) => (
    entry.professionId === professionId && entry.specializationId === specializationId
  ));
  return Object.freeze({
    schemaVersion: ARTISAN_MARK_SCHEMA_VERSION,
    id,
    name,
    professionId,
    profession: profession?.label ?? professionId,
    specializationId,
    specialisation: feature?.specialization ?? "",
    source,
    grade,
    capacityCost: gradeRules.capacityCost,
    minimumTier: gradeRules.minimumAnchorTier,
    anchorSlotTypes: Object.freeze([...(profession?.anchorSlotTypes ?? ["core"])]),
    minimumAnchorTier: gradeRules.minimumAnchorTier,
    requiresCoreTierAnchors: /beyond Core|above Core|Core-exceeding|Over-Potency/i.test(effectSummary),
    validItemGroups: Object.freeze(validItemGroups(effectSummary, professionId)),
    requiredMaterialIds: Object.freeze([...(profession?.materialIds ?? [])]),
    materialUnits: gradeRules.materialUnits,
    materialTierOffset: gradeRules.materialTierOffset,
    artisanDayMultiplier: gradeRules.artisanDayMultiplier,
    scalingSource: /Core Tier|Core T\d|at T\d|T\d[–-]/i.test(effectSummary) ? "core-tier" : "fixed",
    stackGroup: stackGroup(effectSummary),
    effectSummary,
    effects: Object.freeze([{ kind: "rules-text", text: effectSummary }]),
    synergyTags: Object.freeze([]),
  });
}

export const ARTISAN_MARK_DEFINITIONS = Object.freeze(MARK_ROWS.map(makeDefinition));

const MARK_BY_ID = new Map(ARTISAN_MARK_DEFINITIONS.map((mark) => [mark.id, mark]));
const FEATURES_BY_KEY = new Map(SPECIALISATION_FEATURES.map((feature) => [
  `${feature.professionId}:${feature.specializationId}`,
  feature,
]));

export function getArtisanMarkDefinition(id) {
  const definition = MARK_BY_ID.get(String(id ?? "").trim());
  return definition ? clone(definition) : null;
}

export function listArtisanMarks({
  professionIds = [],
  specializations = [],
  itemGroup = "",
} = {}) {
  const professionSet = new Set(professionIds);
  const specialtySet = new Set(specializations.map((entry) => (
    typeof entry === "string"
      ? entry
      : `${entry.professionId}:${entry.specializationId ?? entry.specialtyId}`
  )));
  return ARTISAN_MARK_DEFINITIONS
    .filter((mark) => professionSet.size === 0 || professionSet.has(mark.professionId))
    .filter((mark) => (
      mark.source === "universal"
      || specialtySet.has(`${mark.professionId}:${mark.specializationId}`)
    ))
    .filter((mark) => !itemGroup || mark.validItemGroups.includes(itemGroup))
    .map(clone);
}

export function getSpecialisationFeatures(professionId, specializationId) {
  const feature = FEATURES_BY_KEY.get(`${professionId}:${specializationId}`);
  return feature ? clone(feature) : null;
}

export function getSpecialisationFeaturesByName(profession, specialisation) {
  const professionName = String(profession ?? "").trim().toLowerCase();
  const specialisationName = String(specialisation ?? "").trim().toLowerCase();
  const feature = SPECIALISATION_FEATURES.find((entry) => (
    entry.profession.toLowerCase() === professionName
    && entry.specialization.toLowerCase() === specialisationName
  ));
  return feature ? clone(feature) : null;
}
