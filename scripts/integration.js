import { MODULE_ID } from "./constants.js";
import { calculateItemEffects, insertTierLabel } from "./model.js";

const PATCH_MARKER = Symbol.for(`${MODULE_ID}.prepareRuleElements`);
const adjustedPrices = new WeakSet();
let warnedAboutBridge = false;

function getFlags(item) {
  return item.getFlag?.(MODULE_ID) ?? item.flags?.[MODULE_ID];
}

function calculateItem(item, config) {
  return calculateItemEffects({
    itemType: item.type,
    itemId: item.id ?? item._id ?? "item",
    itemName: item.name ?? "Item",
    flags: getFlags(item),
    config,
  });
}

export function buildItemRuleElements(item, config) {
  if (!item?.actor || !item?.type) return [];
  if (item.type === "armor" && item.isEquipped === false) return [];
  return calculateItem(item, config).rules;
}

/**
 * Layer the crafted display name and price on PF2e's prepared values. Source
 * fields remain unchanged, so rune naming and ordinary item pricing stay intact.
 */
export function applyPreparedItemPresentation(item, config) {
  if (!item?.type || !item.system) return false;
  const result = calculateItem(item, config);
  if (!result.active) return false;

  if (item.isIdentified !== false) {
    const baseName = item._source?.name ?? item.name;
    item.name = insertTierLabel(item.name, baseName, result.presentation.label);
    if (result.dragonScale) {
      item.name = insertTierLabel(item.name, baseName, result.dragonScale.name);
    }
  }

  if (item.system.traits && result.effectiveRarity) {
    item.system.traits.rarity = result.effectiveRarity;
  }

  const price = item.system.price?.value;
  const priceGp = result.priceGp;
  if (price && typeof price === "object" && priceGp > 0 && !adjustedPrices.has(price)) {
    const gp = Math.floor(priceGp);
    const cp = Math.round((priceGp - gp) * 100);
    const adjusted = typeof price.plus === "function"
      ? price.plus({ gp, cp })
      : Object.assign(Object.create(Object.getPrototypeOf(price)), price, {
        gp: (Number(price.gp) || 0) + gp,
        cp: (Number(price.cp) || 0) + cp,
      });
    item.system.price.value = adjusted;
    adjustedPrices.add(adjusted);
  }
  return true;
}

export function registerPreparedItemHooks(getConfig) {
  Hooks.on("prepareItemData", (item) => {
    try {
      applyPreparedItemPresentation(item, getConfig());
    } catch (error) {
      console.error(`${MODULE_ID} | Could not prepare the crafting-material name and price for ${item?.name ?? "an item"}.`, error);
    }
  });
}

/**
 * Add module-generated rule sources only while PF2e prepares the owning actor.
 * Nothing is written to item.system.rules or any other PF2e source field.
 */
export function installRuleElementBridge(getConfig) {
  const ItemClass = CONFIG.Item?.documentClass;
  const prototype = ItemClass?.prototype;
  const original = prototype?.prepareRuleElements;
  if (typeof original !== "function") {
    console.error(`${MODULE_ID} | PF2e Item.prepareRuleElements was not found; bonuses cannot be automated.`);
    return false;
  }
  if (original[PATCH_MARKER]) return true;

  function prepareRuleElementsWithCraftingMaterial(...args) {
    let generatedRules = [];
    try {
      const config = getConfig();
      applyPreparedItemPresentation(this, config);
      generatedRules = buildItemRuleElements(this, config);
    } catch (error) {
      console.error(`${MODULE_ID} | Could not calculate crafting-material rules for ${this?.name ?? "an item"}.`, error);
    }
    if (generatedRules.length === 0) return original.apply(this, args);

    const storedRules = this.system?.rules;
    if (!Array.isArray(storedRules)) return original.apply(this, args);
    const originalLength = storedRules.length;
    try {
      storedRules.push(...generatedRules);
      return original.apply(this, args);
    } catch (error) {
      if (!warnedAboutBridge) {
        warnedAboutBridge = true;
        console.error(`${MODULE_ID} | PF2e rejected the generated rule element. Core item data was not changed.`, error);
      }
      if (storedRules.length > originalLength) storedRules.splice(originalLength);
      return original.apply(this, args);
    } finally {
      if (storedRules.length > originalLength) storedRules.splice(originalLength);
    }
  }

  Object.defineProperty(prepareRuleElementsWithCraftingMaterial, PATCH_MARKER, { value: true });
  Object.defineProperty(prepareRuleElementsWithCraftingMaterial, "name", { value: original.name });
  prototype.prepareRuleElements = prepareRuleElementsWithCraftingMaterial;
  return true;
}
