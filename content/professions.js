import { getSpecialisationFeaturesByName } from "./artisan-marks.js";

const MODULE_ID = "pf2e-crafting-material-tiers";

export const PROFESSION_SCHEMA_VERSION = 4;

export const PF2E_PROFESSION_FEAT_UUIDS = Object.freeze({
  additionalLore: "Compendium.pf2e.feats-srd.Item.BocFD2KV0qgUC76x",
  specialtyCrafting: "Compendium.pf2e.feats-srd.Item.QLeMH5mQgh28sa5o",
  quickRepair: "Compendium.pf2e.feats-srd.Item.ASy9AKEIRxPYUi5o",
  alchemicalCrafting: "Compendium.pf2e.feats-srd.Item.is3Oz9wt11lNq62K",
  magicalCrafting: "Compendium.pf2e.feats-srd.Item.xWY5omyIcILNR7y1",
  experiencedTracker: "Compendium.pf2e.feats-srd.Item.urQZwmzg2kS53vd5",
  heftyHauler: "Compendium.pf2e.feats-srd.Item.C0Tcelg3BAPhML6J",
});

export const SPECIALIZATION_STAGE_KEYS = Object.freeze(["signature", "mastery", "legacy"]);

function specialization(profession, id, label, description, stages) {
  const authoritative = getSpecialisationFeaturesByName(profession, label);
  const resolvedStages = authoritative?.stages
    ? Object.fromEntries(SPECIALIZATION_STAGE_KEYS.map((key) => [
      key,
      [authoritative.stages[key].name, authoritative.stages[key].description],
    ]))
    : stages;
  return Object.freeze({
    id,
    label,
    description,
    proficiency: Object.freeze({
      label: `${profession}: ${label}`,
      description: `Dedicated Lore for ${label}. It follows the existing ${profession} proficiency progression; no separate numerical benefit is assigned yet.`,
    }),
    stages: Object.freeze(Object.fromEntries(SPECIALIZATION_STAGE_KEYS.map((key) => Object.freeze([
      key,
      Object.freeze({
        label: resolvedStages[key][0],
        description: resolvedStages[key][1],
      }),
    ])))),
  });
}

export const SPECIALTIES_BY_PROFESSION = Object.freeze({
  blacksmithing: Object.freeze([
    specialization("Blacksmithing", "specialty-1", "Hellforging", "Infernal weapons and armour shaped through fear, flame, sacrifice, and battle-tested tempers.", {
      signature: ["Hellforged Temper", "Placeholder for creating or converting compatible equipment with an approved infernal identity, such as fire, retaliation, fear, or wounded-state themes."],
      mastery: ["Infernal Reclamation", "Placeholder for repairing, upgrading, converting, and reclaiming materials from Hellforged equipment more efficiently."],
      legacy: ["The Hellforge", "Placeholder for a workshop or kingdom project capable of producing infernal military equipment and supporting specialised armies."],
    }),
    specialization("Blacksmithing", "specialty-2", "Radiant Forging", "Protective and cleansing equipment that channels light, healing, and defence of others.", {
      signature: ["Radiant Temper", "Placeholder for creating compatible gear centred on protection, cleansing, light, healing, and opposition to corruption or undeath."],
      mastery: ["Consecrated Reforging", "Placeholder for efficient repair, conversion, and upgrading of Radiant equipment without defining final material costs."],
      legacy: ["Beacon Works", "Placeholder for temples, hospitals, protective wards, civic lighting, and anti-undead settlement works."],
    }),
    specialization("Blacksmithing", "specialty-3", "Azlanti Artifice", "Ancient magitek, reverse-engineered machinery, original devices, and advanced infrastructure.", {
      signature: ["Lost Artifice", "Placeholder for repairing, studying, recreating, or inventing devices that combine conventional materials with mana-powered technology."],
      mastery: ["Reverse Engineering", "Placeholder for learning formulae from recovered devices and reproducing their principles without assigning research times or costs."],
      legacy: ["Reclaimed Infrastructure", "Placeholder for power systems, teleportation, automated workshops, constructs, waterworks, and advanced siege projects."],
    }),
  ]),
  alchemy: Object.freeze([
    specialization("Alchemy", "specialty-1", "Grand Apothecary", "Refined potions and elixirs tailored for stability, duration, delivery, or specialised outcomes.", {
      signature: ["Refined Formula", "Placeholder for choosing an approved qualitative refinement when creating a potion or elixir, such as concentrated, extended, efficient, rapid, or stable."],
      mastery: ["Batch Refinement", "Placeholder for more reliable batches, improved yield, and reduced waste without setting final quantities."],
      legacy: ["Public Apothecary", "Placeholder for hospitals, disease response, military medicine, and settlement recovery projects."],
    }),
    specialization("Alchemy", "specialty-2", "Venomcraft", "Custom toxins shaped around delivery, persistence, concealment, onset, or a chosen quarry.", {
      signature: ["Toxin Refinement", "Placeholder for applying an approved toxin property such as lingering, adhesive, swift, subtle, selective, or volatile."],
      mastery: ["Venom Harvesting", "Placeholder for improved harvesting, preservation, antidote work, and batch reliability without final numerical yield."],
      legacy: ["Civic Toxicology", "Placeholder for antivenoms, pest control, agricultural treatment, and specialist settlement services."],
    }),
    specialization("Alchemy", "specialty-3", "Transmutative Alchemy", "Controlled material conversion and the creation of specialist composite substances.", {
      signature: ["Material Conversion", "Placeholder for transforming compatible resources or assisting another artisan in producing a new composite material."],
      mastery: ["Composite Refinement", "Placeholder for stabilising hybrid materials, reducing conversion loss, and recording repeatable transmutation formulae."],
      legacy: ["Transmutation Foundry", "Placeholder for kingdom-scale conversion of surplus commodities and access to unusual manufactured resources."],
    }),
  ]),
  enchanting: Object.freeze([
    specialization("Enchanting", "specialty-1", "Aethercasting", "Controlled magical enhancements and the incremental upgrading of empowered items.", {
      signature: ["Empowerment", "Placeholder for placing one approved Aethercast enhancement onto a compatible item without defining its final value."],
      mastery: ["Incremental Enchantment", "Placeholder for upgrading or replacing an existing enhancement without rebuilding the entire item."],
      legacy: ["Arcane Infrastructure", "Placeholder for powered workshops, communication, heating, wards, and other permanent magical services."],
    }),
    specialization("Enchanting", "specialty-2", "Essencebinding", "Approved item traits and harvested essences bound safely into qualifying equipment.", {
      signature: ["Bind Essence", "Placeholder for binding one approved trait or creature-derived essence to a compatible item."],
      mastery: ["Stable Binding", "Placeholder for safer transfer, replacement, preservation, and recovery of bound essences."],
      legacy: ["Essence Archive", "Placeholder for a settlement collection that identifies, stores, researches, and distributes supernatural essences."],
    }),
    specialization("Enchanting", "specialty-3", "Runecarving", "Efficient rune creation, upgrading, transfer, and linked Rune Echoes.", {
      signature: ["Rune Echoing", "Placeholder for producing a linked or secondary rune for another qualifying item under future cost and eligibility rules."],
      mastery: ["Incremental Runework", "Placeholder for transferring, upgrading, repairing, or reproducing runes with reduced waste."],
      legacy: ["Runic Network", "Placeholder for civic wards, marked roads, defensive inscriptions, and rune-supported infrastructure."],
    }),
  ]),
  leatherwork: Object.freeze([
    specialization("Leatherwork", "specialty-1", "Wyrmcraft", "Dragon-scale equipment that preserves an adaptation belonging to the source dragon.", {
      signature: ["Draconic Essence", "Placeholder for retaining one approved quality associated with a dragon's colour, age, habitat, or nature."],
      mastery: ["Scale Conservation", "Placeholder for preparing, repairing, and upgrading dragon-scale work with less waste and better preservation."],
      legacy: ["Wyrmward Atelier", "Placeholder for dragon-hunting equipment, settlement wards, trophies, and specialist draconic commissions."],
    }),
    specialization("Leatherwork", "specialty-2", "Beastbinding", "Prepared hides that preserve a useful natural quality of the creature they came from.", {
      signature: ["Preserve the Beast", "Placeholder for retaining one approved natural, environmental, movement, or sensory quality from a harvested creature."],
      mastery: ["Master Harvester", "Placeholder for improved hide recovery, preservation, identification, and reuse without final yield values."],
      legacy: ["Bestiary Workshop", "Placeholder for expedition outfitting, monster-harvest services, and a settlement trade in specialised hides."],
    }),
    specialization("Leatherwork", "specialty-3", "Mantlecraft", "Prestigious and protective mantles, cloaks, robes, and environmental garments.", {
      signature: ["Great Mantles", "Placeholder for garments offering an approved environmental, exploration, cultural, or prestige identity."],
      mastery: ["Luxury Craftsmanship", "Placeholder for exceptional finishing, repair, presentation, and the future treatment of crafted mantles as luxury goods."],
      legacy: ["Royal Clothier", "Placeholder for diplomatic gifts, court dress, luxury exports, and ceremonial settlement projects."],
    }),
  ]),
  carpentry: Object.freeze([
    specialization("Carpentry", "specialty-1", "Warbowyer", "Engineered bows, crossbows, ballistae, loading systems, and specialist ammunition.", {
      signature: ["Engineered Ranged Weapons", "Placeholder for approved weapon modifications, loading mechanisms, reinforced limbs, specialised strings, and ammunition compatibility."],
      mastery: ["Specialist Ammunition", "Placeholder for efficiently producing and maintaining discovered ammunition recipes and ranged-weapon components."],
      legacy: ["Arsenal of the Bow", "Placeholder for equipping archers, settlement towers, ballista emplacements, and armies."],
    }),
    specialization("Carpentry", "specialty-2", "Masterwright", "Bridges, roads, docks, fieldworks, buildings, and major wooden structures.", {
      signature: ["Great Works", "Placeholder for planning and constructing major wooden structures as well as practical fieldworks during adventures."],
      mastery: ["Efficient Repairs", "Placeholder for improved construction, reinforcement, maintenance, salvage, and repair of wooden works."],
      legacy: ["Kingdom Builder", "Placeholder for roads, bridges, docks, palisades, settlements, and kingdom construction projects."],
    }),
    specialization("Carpentry", "specialty-3", "Warcarving", "Combat forms and utility carvings applied to wooden weapons, shields, and tools.", {
      signature: ["Carved Form", "Placeholder for adding one approved Warcarving property to compatible wooden equipment."],
      mastery: ["Greater Warcarvings", "Placeholder for discovering, combining, transferring, and maintaining advanced carved forms."],
      legacy: ["Totemic Works", "Placeholder for carved guardians, cultural monuments, war totems, and settlement-scale wooden wards."],
    }),
  ]),
  stonemason: Object.freeze([
    specialization("Stonemasonry", "specialty-1", "Megalithics", "Monumental works, fortresses, roads, aqueducts, walls, and major civil structures.", {
      signature: ["Monumental Design", "Placeholder for planning and creating Great Works whose form, purpose, and required resources are approved project by project."],
      mastery: ["Master Masonry", "Placeholder for reliable surveying, reinforcement, repair, salvage, and efficient use of worked stone."],
      legacy: ["Enduring Realm", "Placeholder for fortresses, roads, aqueducts, monuments, walls, and kingdom-scale public works."],
    }),
    specialization("Stonemasonry", "specialty-2", "Runemasonry", "Wardstones and enduring magical inscriptions that protect places rather than carried items.", {
      signature: ["Wardstone", "Placeholder for carving an approved persistent ward, alarm, sanctuary, boundary, or environmental effect into a location."],
      mastery: ["Enduring Inscription", "Placeholder for stabilising, repairing, linking, relocating, or safely deactivating runic stonework."],
      legacy: ["Network of Wards", "Placeholder for protected roads, settlement boundaries, sanctuaries, warning stones, and regional ward networks."],
    }),
    specialization("Stonemasonry", "specialty-3", "Titanmasonry", "Stone wargear, constructs, siege engines, and powerful Titanic forms.", {
      signature: ["Titanic Form", "Placeholder for an approved property applied to stone equipment, construct bodies, or siege components."],
      mastery: ["Construct Masonry", "Placeholder for assembling, repairing, reinforcing, and reclaiming large stone mechanisms and construct frames."],
      legacy: ["Colossus Works", "Placeholder for monumental guardians, siege foundries, colossal statues, and army-scale stone projects."],
    }),
  ]),
  glassmaking: Object.freeze([
    specialization("Glassmaking", "specialty-1", "Prismcraft", "Lenses and prisms that focus, split, redirect, or transform light and magical energy.", {
      signature: ["Focused Prism", "Placeholder for creating an optical or arcane component with one approved focusing, splitting, redirecting, or filtering function."],
      mastery: ["Precision Optics", "Placeholder for calibration, miniaturisation, repair, and reliable reproduction of specialist lenses and prisms."],
      legacy: ["Beacon Network", "Placeholder for observatories, lighthouses, signalling systems, illumination, and arcane energy relays."],
    }),
    specialization("Glassmaking", "specialty-2", "Mirrorcraft", "Reflective magic, illusions, scrying, communication, and linked mirrors.", {
      signature: ["Bound Reflection", "Placeholder for an approved reflective, revealing, concealing, communicating, or scrying property."],
      mastery: ["Linked Mirrors", "Placeholder for attuning, repairing, securing, and reproducing compatible mirrors as part of a controlled network."],
      legacy: ["Looking-Glass Network", "Placeholder for long-distance communication, observation, public information, and defensive mirror installations."],
    }),
    specialization("Glassmaking", "specialty-3", "Aetherglass", "Mana batteries, spell reservoirs, magical circuitry, construct cores, and powered components.", {
      signature: ["Arcane Vessel", "Placeholder for glass components that safely store, channel, regulate, or release magical energy."],
      mastery: ["Stable Reservoir", "Placeholder for improved containment, recharge, repair, compatibility, and recovery of aetherglass components."],
      legacy: ["Aethergrid", "Placeholder for settlement power storage, magical distribution, construct support, and advanced workshop infrastructure."],
    }),
  ]),
  pottery: Object.freeze([
    specialization("Pottery", "specialty-1", "Ceramancy", "Living clay, terracotta constructs, ceramic armour, figurines, and guardians.", {
      signature: ["Awakened Clay", "Placeholder for shaping an approved animated, responsive, protective, or creature-like ceramic creation."],
      mastery: ["Kiln-Bound Forms", "Placeholder for stronger firing, reliable animation, repair, reshaping, and recovery of prepared clay."],
      legacy: ["Terracotta Host", "Placeholder for civic guardians, ceremonial figures, labouring constructs, and defensive terracotta works."],
    }),
    specialization("Pottery", "specialty-2", "Reliquarycraft", "Vessels that preserve blessings, curses, spirits, essences, and planar energy.", {
      signature: ["Sealed Essence", "Placeholder for containing one approved supernatural presence or influence inside a purpose-built vessel."],
      mastery: ["Enduring Vessel", "Placeholder for safer sealing, transport, identification, transfer, repair, and controlled release."],
      legacy: ["Reliquary Vault", "Placeholder for temples, archives, spirit houses, quarantine stores, and settlement-scale supernatural containment."],
    }),
    specialization("Pottery", "specialty-3", "Pyroceramics", "Crucibles, bomb casings, heat-resistant vessels, magical kilns, and industrial ceramics.", {
      signature: ["Forgeware", "Placeholder for a heat-, pressure-, reaction-, or impact-resistant ceramic component designed for a specific craft."],
      mastery: ["Thermal Mastery", "Placeholder for reliable firing, repair, reuse, safe handling, and specialist kiln processes."],
      legacy: ["Grand Kilns", "Placeholder for industrial ceramics, alchemical production, foundry support, fireproof construction, and settlement manufacturing."],
    }),
  ]),
  weaving: Object.freeze([
    specialization("Weaving", "specialty-1", "Aetherweaving", "Manathread and magical cloth that carry enchantments, wards, and arcane patterns.", {
      signature: ["Manathread", "Placeholder for creating a magical textile component able to host an approved enchantment, ward, resistance, or arcane pattern."],
      mastery: ["Resonant Weave", "Placeholder for stabilising, repairing, combining, reclaiming, and reworking magical thread and cloth."],
      legacy: ["Aetherloom", "Placeholder for magical textile workshops, civic wards, specialist uniforms, and settlement enchantment projects."],
    }),
    specialization("Weaving", "specialty-2", "Ironweaving", "Warcloth, armour backing, nets, ropes, bowstrings, sails, and resilient reinforcement.", {
      signature: ["Warcloth", "Placeholder for one approved structural, restraining, protective, or load-bearing property on a compatible textile component."],
      mastery: ["Reinforced Weave", "Placeholder for improved durability, repair, recovery, fitting, and production of demanding technical textiles."],
      legacy: ["Realmworks Textile", "Placeholder for army outfitting, rigging, sails, bridges, nets, logistics, and large-scale reinforced fabrics."],
    }),
    specialization("Weaving", "specialty-3", "Heraldweaving", "Standards, banners, and tapestries supporting morale, identity, armies, and prestige.", {
      signature: ["Living Standard", "Placeholder for a banner or tapestry carrying an approved identity, morale, rallying, ceremonial, or communicative purpose."],
      mastery: ["Battle Heraldry", "Placeholder for preserving, repairing, adapting, documenting, and reproducing meaningful standards."],
      legacy: ["Banner of the Realm", "Placeholder for army standards, public ceremonies, diplomatic gifts, cultural records, and kingdom prestige."],
    }),
  ]),
  bookmaking: Object.freeze([
    specialization("Bookmaking", "specialty-1", "Grimoirecraft", "Living spellbooks and codices with enhanced memory, resonance, organisation, and access.", {
      signature: ["Living Grimoire", "Placeholder for a spellbook or codex with one approved memory, access, resonance, indexing, or protective quality."],
      mastery: ["Resonant Binding", "Placeholder for repairing, expanding, reorganising, copying, securing, and preserving magical books."],
      legacy: ["Great Library", "Placeholder for magical archives, public learning, spell research, secure collections, and learned settlement institutions."],
    }),
    specialization("Bookmaking", "specialty-2", "Chroniclecraft", "Lore, formulae, techniques, and Codices of Mastery that make recorded knowledge usable.", {
      signature: ["Codex of Mastery", "Placeholder for recording one approved body of Lore, formulae, techniques, testimony, or practical instruction."],
      mastery: ["Perfect Record", "Placeholder for verification, indexing, restoration, translation, copying, and protection against lost or corrupted knowledge."],
      legacy: ["Archive of Ages", "Placeholder for legal records, histories, formula libraries, schools, and knowledge shared across a kingdom."],
    }),
    specialization("Bookmaking", "specialty-3", "Grand Cartography", "Master atlases for exploration, resources, roads, armies, settlements, and expansion.", {
      signature: ["Master Atlas", "Placeholder for a map or atlas that records an approved route, resource, hazard, boundary, settlement, or exploration insight."],
      mastery: ["Living Survey", "Placeholder for updating, reconciling, copying, protecting, and expanding maps as new information is discovered."],
      legacy: ["Royal Cartographic Office", "Placeholder for kingdom surveys, roads, borders, armies, resource planning, settlement growth, and exploration records."],
    }),
  ]),
  tailoring: Object.freeze([
    specialization("Tailoring", "specialty-1", "Battlestitching", "Combat garments and armour liners designed for movement, access, protection, and adaptation.", {
      signature: ["Battle Garment", "Placeholder for one approved mobility, resistance, access, fitting, or protective quality on compatible clothing or armour lining."],
      mastery: ["Adaptive Fitting", "Placeholder for refitting, repairing, reinforcing, reclaiming, and upgrading combat garments for a new wearer or purpose."],
      legacy: ["Military Atelier", "Placeholder for specialised uniforms, expedition clothing, army outfitting, and protective public equipment."],
    }),
    specialization("Tailoring", "specialty-2", "Veilcraft", "Supernatural disguises, stealth clothing, concealing mantles, and perception-altering garments.", {
      signature: ["Veiled Garment", "Placeholder for one approved disguise, concealment, misdirection, identity, or perception-altering quality."],
      mastery: ["Perfect Masquerade", "Placeholder for tailoring, retuning, repairing, concealing, and safely changing the identity held by a veil."],
      legacy: ["House of Veils", "Placeholder for diplomacy, intelligence work, theatre, ceremonial disguise, secure couriers, and covert kingdom projects."],
    }),
    specialization("Tailoring", "specialty-3", "Regaliacraft", "Vestments of authority supporting diplomacy, leadership, morale, royal courts, and prestige.", {
      signature: ["Vestment of Authority", "Placeholder for regalia carrying an approved ceremonial, diplomatic, leadership, morale, or institutional identity."],
      mastery: ["Courtly Craft", "Placeholder for authenticating, restoring, adapting, documenting, and reproducing significant regalia."],
      legacy: ["Royal Regalia", "Placeholder for coronations, courts, diplomatic gifts, public offices, national identity, and kingdom prestige."],
    }),
  ]),
});

export const PROFESSION_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "blacksmithing",
    name: "Blacksmithing",
    loreName: "Blacksmithing",
    craftingSpecialty: "blacksmithing",
    materialIds: Object.freeze(["metal"]),
    bonusFeatUuid: PF2E_PROFESSION_FEAT_UUIDS.quickRepair,
    bonusFeatName: "Quick Repair",
    img: "icons/tools/smithing/anvil.webp",
  }),
  Object.freeze({
    id: "alchemy",
    name: "Alchemy",
    loreName: "Alchemy",
    craftingSpecialty: "alchemy",
    materialIds: Object.freeze(["herbs"]),
    bonusFeatUuid: PF2E_PROFESSION_FEAT_UUIDS.alchemicalCrafting,
    bonusFeatName: "Alchemical Crafting",
    img: `modules/${MODULE_ID}/assets/professions/alchemy.png`,
  }),
  Object.freeze({
    id: "enchanting",
    name: "Enchanting",
    loreName: "Enchanting",
    craftingSpecialty: "enchanting",
    materialIds: Object.freeze(["mana-crystals"]),
    bonusFeatUuid: PF2E_PROFESSION_FEAT_UUIDS.magicalCrafting,
    bonusFeatName: "Magical Crafting",
    img: "icons/magic/symbols/runes-star-pentagon-magenta.webp",
  }),
  Object.freeze({
    id: "leatherwork",
    name: "Leatherwork",
    loreName: "Leatherworking",
    craftingSpecialty: "leatherworking",
    materialIds: Object.freeze(["leather", "dragon-scale"]),
    bonusFeatUuid: PF2E_PROFESSION_FEAT_UUIDS.experiencedTracker,
    bonusFeatName: "Experienced Tracker",
    img: "icons/tools/hand/needle-grey.webp",
  }),
  Object.freeze({
    id: "carpentry",
    name: "Carpentry",
    loreName: "Carpentry",
    craftingSpecialty: "woodworking",
    materialIds: Object.freeze(["wood"]),
    bonusFeatUuid: PF2E_PROFESSION_FEAT_UUIDS.heftyHauler,
    bonusFeatName: "Hefty Hauler",
    img: "icons/tools/hand/hammer-and-nail.webp",
  }),
  Object.freeze({
    id: "stonemason",
    name: "Stonemasonry",
    loreName: "Stonemasonry",
    craftingSpecialty: "stonemasonry",
    materialIds: Object.freeze(["stone"]),
    bonusFeatUuid: "",
    bonusFeatName: "To be determined",
    img: "icons/tools/hand/chisel-steel-brown.webp",
  }),
  Object.freeze({
    id: "glassmaking",
    name: "Glassmaking",
    loreName: "Glassmaking",
    craftingSpecialty: "glassmaking",
    materialIds: Object.freeze([]),
    bonusFeatUuid: "",
    bonusFeatName: "To be determined",
    img: "icons/commodities/materials/glass-orb-blue.webp",
  }),
  Object.freeze({
    id: "pottery",
    name: "Pottery",
    loreName: "Pottery",
    craftingSpecialty: "pottery",
    materialIds: Object.freeze([]),
    bonusFeatUuid: "",
    bonusFeatName: "To be determined",
    img: `modules/${MODULE_ID}/assets/professions/pottery.png`,
  }),
  Object.freeze({
    id: "weaving",
    name: "Weaving",
    loreName: "Weaving",
    craftingSpecialty: "weaving",
    materialIds: Object.freeze([]),
    bonusFeatUuid: "",
    bonusFeatName: "To be determined",
    img: "icons/tools/hand/needle-grey.webp",
  }),
  Object.freeze({
    id: "bookmaking",
    name: "Bookmaking",
    loreName: "Bookmaking",
    craftingSpecialty: "bookmaking",
    materialIds: Object.freeze([]),
    bonusFeatUuid: "",
    bonusFeatName: "To be determined",
    img: "icons/sundries/books/book-tooled-gold-brown.webp",
  }),
  Object.freeze({
    id: "tailoring",
    name: "Tailoring",
    loreName: "Tailoring",
    craftingSpecialty: "tailoring",
    materialIds: Object.freeze([]),
    bonusFeatUuid: "",
    bonusFeatName: "To be determined",
    img: `modules/${MODULE_ID}/assets/professions/tailoring.png`,
  }),
].map((profession) => Object.freeze({
  ...profession,
  checkBonus: 2,
  checkBonusType: "circumstance",
  specialties: SPECIALTIES_BY_PROFESSION[profession.id],
})));

const PROFESSION_CHECK_SELECTORS = Object.freeze(["arcana", "crafting", "nature", "survival"]);

function professionDescription(profession) {
  const bonusFeat = profession.bonusFeatUuid
    ? `<li><strong>Additional feat:</strong> ${profession.bonusFeatName}</li>`
    : "<li><strong>Additional feat:</strong> To be determined</li>";
  const specialties = profession.specialties
    .map((specialty) => `<li><strong>${specialty.label}:</strong> ${specialty.description}</li>`)
    .join("");

  return [
    `<p><strong>${profession.name} Profession</strong></p>`,
    "<p>This is a Wrathmaker profession chosen at 1st level. It supplies the appropriate Specialty Crafting benefit and Additional Lore for the profession.</p>",
    "<ul>",
    `<li><strong>Profession Lore:</strong> ${profession.loreName}</li>`,
    "<li><strong>Automatic Lore proficiency:</strong> trained at level 1, expert at level 3, master at level 7, and legendary at level 15.</li>",
    "<li><strong>Profession development:</strong> at levels 4, 10, and 16, choose a specialty of the starting profession or learn a new profession.</li>",
    `<li><strong>Relevant profession checks:</strong> +${profession.checkBonus} ${profession.checkBonusType} bonus.</li>`,
    bonusFeat,
    "</ul>",
    "<p><strong>Specialisations</strong></p>",
    `<ol>${specialties}</ol>`,
    "<p><em>Signature, Mastery, and Legacy benefits follow the Wrathmaker profession rules. Artisan Marks are selected and anchored to items in the Wrathmaker Workbench.</em></p>",
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
