const WEAPON_CATEGORIES = Object.freeze(["weapon.simple", "weapon.martial", "weapon.advanced"]);

const secondary = (id, label, units, materialIds, options = {}) => Object.freeze({
  id,
  label,
  units,
  materialIds: Object.freeze(materialIds),
  optional: options.optional === true,
  structural: options.structural !== false,
});

function weapon(id, label, coreUnits, coreMaterialIds, secondaries = []) {
  return Object.freeze({
    id: `weapon-${id}`,
    label,
    group: "weapon",
    categoryIds: WEAPON_CATEGORIES,
    coreUnits,
    coreMaterialIds: Object.freeze(coreMaterialIds),
    secondaries: Object.freeze(secondaries),
  });
}

function recipe(id, label, group, categoryIds, coreUnits, coreMaterialIds, secondaries = []) {
  return Object.freeze({
    id,
    label,
    group,
    categoryIds: Object.freeze(categoryIds),
    coreUnits,
    coreMaterialIds: Object.freeze(coreMaterialIds),
    secondaries: Object.freeze(secondaries),
  });
}

/**
 * Broad recipe bands from the Wrathmaker Recipe Material Matrix. These are
 * deliberately chassis recipes rather than copies of every PF2e equipment
 * entry. A dropped base item supplies its normal PF2e data and category.
 */
export const CRAFTING_RECIPE_BANDS = Object.freeze([
  weapon("axe", "Axe", 3, ["metal"], [secondary("haft", "Haft", 1, ["wood"])]),
  weapon("bow", "Bow", 3, ["wood"], [
    secondary("string", "String", 1, ["herbs", "leather"]),
    secondary("grip", "Grip", 1, ["leather"]),
  ]),
  weapon("brawling", "Brawling Weapon", 2, ["metal", "leather"], [secondary("wrap", "Wrap or grip", 1, ["leather"])]),
  weapon("club", "Club", 2, ["wood", "metal", "stone"], [secondary("grip", "Grip", 1, ["leather"], { optional: true })]),
  weapon("crossbow", "Crossbow", 3, ["wood"], [
    secondary("mechanism", "Mechanism", 2, ["metal"]),
    secondary("string", "String", 1, ["herbs", "leather"]),
  ]),
  weapon("dart", "Dart or Light Thrown Weapon", 1, ["metal", "wood"]),
  weapon("firearm", "Firearm", 4, ["metal"], [
    secondary("stock", "Stock", 2, ["wood"]),
    secondary("grip", "Grip", 1, ["leather"]),
  ]),
  weapon("flail", "Flail", 4, ["metal"], [secondary("grip", "Grip", 1, ["wood", "leather"])]),
  weapon("hammer", "Hammer", 3, ["metal", "stone"], [secondary("haft", "Haft", 1, ["wood"])]),
  weapon("knife", "Knife", 2, ["metal"], [secondary("grip", "Grip", 1, ["leather", "wood"])]),
  weapon("pick", "Pick", 3, ["metal"], [secondary("haft", "Haft", 1, ["wood"])]),
  weapon("polearm", "Polearm", 3, ["metal"], [
    secondary("haft", "Long haft", 2, ["wood"]),
    secondary("grip", "Grip", 1, ["leather"]),
  ]),
  weapon("sling", "Sling", 2, ["leather", "herbs"], [secondary("staff", "Staff", 1, ["wood"], { optional: true })]),
  weapon("spear", "Spear", 2, ["metal", "stone"], [secondary("haft", "Haft", 2, ["wood"])]),
  weapon("sword", "Sword", 3, ["metal"], [secondary("grip", "Grip", 1, ["leather", "wood"])]),

  recipe("shield-buckler", "Buckler", "shield", ["shield"], 2, ["metal", "wood", "leather"], [secondary("strap", "Strap", 1, ["leather"])]),
  recipe("shield-light", "Light Shield", "shield", ["shield"], 3, ["wood", "metal", "leather"], [secondary("strap", "Strap", 1, ["leather"])]),
  recipe("shield-standard", "Standard Shield", "shield", ["shield"], 4, ["metal", "wood", "stone"], [
    secondary("strap", "Strap", 1, ["leather"]),
    secondary("fittings", "Fittings", 1, ["metal", "wood"]),
  ]),
  recipe("shield-tower", "Tower Shield", "shield", ["shield"], 6, ["metal", "wood", "stone"], [
    secondary("straps", "Straps", 2, ["leather"]),
    secondary("fittings", "Fittings", 1, ["metal", "wood"]),
  ]),
  recipe("shield-fortress", "Fortress or Oversized Shield", "shield", ["shield"], 8, ["metal", "wood", "stone"], [
    secondary("straps", "Straps", 2, ["leather"]),
    secondary("fittings", "Fittings", 2, ["metal", "wood"]),
  ]),

  recipe("armor-combat-clothing", "Combat Clothing", "armor", ["armor.light"], 3, ["herbs"], [secondary("lining", "Leather lining", 1, ["leather"])]),
  recipe("armor-light-flexible", "Light Flexible Armor", "armor", ["armor.light"], 4, ["leather", "herbs"], [
    secondary("lining", "Lining", 1, ["herbs", "leather"]),
    secondary("fittings", "Fittings", 1, ["metal", "wood"]),
  ]),
  recipe("armor-light-reinforced", "Reinforced Light Armor", "armor", ["armor.light"], 5, ["leather"], [
    secondary("lining", "Lining", 1, ["herbs"]),
    secondary("fittings", "Metal fittings", 1, ["metal"]),
  ]),
  recipe("armor-medium-hide", "Medium Hide or Layered Armor", "armor", ["armor.medium"], 6, ["leather"], [
    secondary("lining", "Lining", 2, ["herbs"]),
    secondary("fittings", "Metal fittings", 1, ["metal"]),
  ]),
  recipe("armor-medium-metal", "Medium Metal or Chain Armor", "armor", ["armor.medium"], 6, ["metal"], [
    secondary("backing", "Leather backing", 2, ["leather"]),
    secondary("lining", "Lining", 1, ["herbs"]),
  ]),
  recipe("armor-heavy", "Heavy Scale, Splint, or Mail", "armor", ["armor.heavy"], 8, ["metal", "stone"], [
    secondary("backing", "Leather backing", 2, ["leather"]),
    secondary("lining", "Lining", 1, ["herbs"]),
  ]),
  recipe("armor-full-plate", "Full Plate", "armor", ["armor.heavy"], 10, ["metal"], [
    secondary("backing", "Leather backing", 2, ["leather"]),
    secondary("lining", "Lining", 2, ["herbs"]),
  ]),

  recipe("focus-simple", "Simple Spell Focus", "spellFocus", ["spell-focus"], 2, ["mana-crystals", "stone"], [secondary("frame", "Frame", 1, ["metal", "wood"])]),
  recipe("focus-wand", "Wand", "spellFocus", ["spell-focus"], 2, ["wood", "metal"], [secondary("catalyst", "Mana catalyst", 1, ["mana-crystals"])]),
  recipe("focus-rod", "Rod, Sceptre, or Implement", "spellFocus", ["spell-focus"], 3, ["metal", "wood", "stone"], [secondary("catalyst", "Mana catalyst", 1, ["mana-crystals"])]),
  recipe("focus-staff", "Staff", "spellFocus", ["spell-focus"], 4, ["wood"], [
    secondary("catalyst", "Mana catalyst", 2, ["mana-crystals"]),
    secondary("grip", "Grip", 1, ["leather"]),
  ]),
  recipe("focus-orb", "Orb or Crystal Focus", "spellFocus", ["spell-focus"], 3, ["stone", "mana-crystals"], [
    secondary("lens", "Glass stock", 1, ["stone"]),
    secondary("frame", "Metal frame", 1, ["metal"]),
  ]),
  recipe("focus-grimoire", "Grimoire or Tome Focus", "spellFocus", ["spell-focus"], 4, ["wood"], [
    secondary("cover", "Leather cover", 1, ["leather"]),
    secondary("catalyst", "Mana catalyst", 1, ["mana-crystals"]),
  ]),
  recipe("focus-holy-symbol", "Holy Symbol or Relic Focus", "spellFocus", ["spell-focus"], 2, ["metal", "wood", "stone"], [secondary("catalyst", "Mana catalyst", 1, ["mana-crystals"])]),
  recipe("focus-censer", "Censer or Ritual Focus", "spellFocus", ["spell-focus"], 3, ["metal"], [
    secondary("reagent", "Herbal reagent", 1, ["herbs"]),
    secondary("catalyst", "Mana catalyst", 1, ["mana-crystals"]),
  ]),
  recipe("focus-instrument", "Instrument Focus", "spellFocus", ["spell-focus"], 4, ["wood", "metal"], [
    secondary("string", "String or reed stock", 1, ["herbs", "leather"]),
    secondary("catalyst", "Mana catalyst", 1, ["mana-crystals"]),
  ]),
  recipe("focus-jewellery", "Focus Jewellery", "spellFocus", ["spell-focus"], 2, ["metal", "stone"], [secondary("catalyst", "Mana catalyst", 1, ["mana-crystals"])]),
]);

export function listCraftingRecipeBands(group = "") {
  return CRAFTING_RECIPE_BANDS
    .filter((entry) => !group || entry.group === group)
    .map((entry) => JSON.parse(JSON.stringify(entry)));
}

export function getCraftingRecipeBand(id) {
  const band = CRAFTING_RECIPE_BANDS.find((entry) => entry.id === id);
  return band ? JSON.parse(JSON.stringify(band)) : null;
}
