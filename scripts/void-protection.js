import { CRAFTING_RESOURCE_SOURCES } from "../content/crafting-resources.js";
import { MODULE_ID } from "./constants.js";
import { getRulesConfig } from "./config-store.js";
import { getCraftingItemType } from "./model.js";
import { isActiveSpellFocus, isPrimarySpellFocus } from "./integration.js";

const items = actor => Array.from(actor?.items?.contents ?? actor?.items ?? []);
const flags = item => item?.flags?.[MODULE_ID] ?? {};
import { VOID_PROTECTION_SOURCE } from "../content/void-protection.js";
export { VOID_PROTECTION_SOURCE };

export const VOIDBORN_TRAIT = "wrathmaker-voidborn";
export function registerVoidbornTrait(config = CONFIG.PF2E) {
  config.creatureTraits[VOIDBORN_TRAIT] = "Voidborn";
  config.traitsDescriptions[VOIDBORN_TRAIT] = "This creature takes half damage from weapons and spells unless they use Omnipotassium. Its damage is halved against creatures wearing Omnipotassium armour. Other resistances, immunities, saving throws and Shield Block apply normally.";
}

export function hasVoidProtection(actor) {
  const traits = actor?.system?.traits?.value ?? [];
  if (traits.includes?.(VOIDBORN_TRAIT) || traits.has?.(VOIDBORN_TRAIT)) return true;
  return items(actor).some(item => item.type === "effect" && flags(item).voidProtection === true && !item.system?.expired && !item.isExpired);
}
export function isOmnipotassium(item) {
  const data = flags(item);
  return (data.material === "omnipotisium" && Number(data.tier) >= 1 && Number(data.tier) <= 6)
    || (data.crafting?.core?.materialId === "omnipotisium" && Number(data.crafting.core.tier) >= 1 && Number(data.crafting.core.tier) <= 6);
}
export function hasOmnipotassiumFrame(item) {
  return flags(item).crafting?.omnipotisiumFrame === true || flags(item).crafting?.components?.some(component => component.materialId === "omnipotisium"
    && Number(component.tier) >= 1 && Number(component.tier) <= 6 && Number(component.quantityCommitted) > 0
    && component.classification === "required-secondary" && /frame/.test(component.slotType || component.id));
}

export function voidDamageAdjustment(target, { item, damage, final = false }, config = getRulesConfig()) {
  const total = typeof damage === "number" ? damage : damage?.total;
  if (final || !(total > 0)) return [];
  const source = item?.actor ?? item?.parent;
  const reasons = [];
  if (hasVoidProtection(target) && ["weapon", "melee", "spell"].includes(item?.type)) {
    const bypass = ["weapon", "melee"].includes(item.type) ? isOmnipotassium(item) : item.type === "spell" && items(source).some(focus =>
      getCraftingItemType(focus) === "spellFocus" && isActiveSpellFocus(focus) && isPrimarySpellFocus(focus, config)
      && (isOmnipotassium(focus) || hasOmnipotassiumFrame(focus)));
    if (!bypass) reasons.push("Void Protection: half damage");
  }
  if (hasVoidProtection(source) && items(target).some(armor => armor.type === "armor" && armor.isEquipped === true && isOmnipotassium(armor))) {
    reasons.push("Omnipotassium armour: half damage from a void creature");
  }
  return reasons;
}

const PATCH = Symbol.for(`${MODULE_ID}.voidDamage`);
export function installVoidDamageBridge(ActorClass = CONFIG.Actor.documentClass) {
  let prototype = ActorClass?.prototype;
  while (prototype && !Object.hasOwn(prototype, "applyDamage")) prototype = Object.getPrototypeOf(prototype);
  if (!prototype || prototype[PATCH]) return false;
  const original = prototype.applyDamage;
  prototype.applyDamage = function(options, ...rest) {
    const reasons = voidDamageAdjustment(this, options);
    if (!reasons.length) return original.call(this, options, ...rest);
    // Native DamageRoll.alter preserves damage types and instances for IWR and shield blocking.
    const multiplier = 0.5 ** reasons.length;
    const damage = typeof options.damage === "number" ? Math.floor(options.damage * multiplier) : options.damage.alter(multiplier, 0);
    return original.call(this, { ...options, damage, breakdown: [...(options.breakdown ?? []), ...reasons] }, ...rest);
  };
  Object.defineProperty(prototype, PATCH, { value: true });
  return true;
}

export function registerVoidProtection() {
  registerVoidbornTrait();
  Hooks.once("ready", async () => {
    if (!installVoidDamageBridge()) console.warn(`${MODULE_ID} | Void damage bridge was not installed.`);
    const primaryGM = game.users?.contents?.filter(user => user.active && user.isGM).sort((a,b) => a.id.localeCompare(b.id))[0];
    if (game.user.isGM && (!primaryGM || primaryGM.id === game.user.id)) {
      // Rename only stock names from earlier previews; preserve quantities and custom names.
      const oldNames = new Set(["Omnipotisium Ingot", "Omnipotassium Ingot", "Omnipotisium Ingots", "Omnipotisium", "Omnipotassium", "Omnipotassium Ingots"]);
      const candidates = [...game.items.contents, ...(game.actors?.contents ?? []).flatMap(actor => items(actor))];
      for (const item of candidates) {
        if (flags(item).resource?.materialId === "omnipotisium" && oldNames.has(item.name)) {
          try { await item.update({ name: CRAFTING_RESOURCE_SOURCES.find(source => flags(source).resource?.materialId === "omnipotisium" && flags(source).resource.tier === flags(item).resource.tier)?.name ?? item.name }); }
          catch (error) { console.warn(`${MODULE_ID} | Could not rename ingots`, error); }
        }
      }
      const ingots = CRAFTING_RESOURCE_SOURCES.filter(item => flags(item).resource?.materialId === "omnipotisium");
      const sources = [...ingots, VOID_PROTECTION_SOURCE].filter(source => !game.items.contents.some(item =>
        source.type === "equipment" ? flags(item).resource?.materialId === "omnipotisium" && flags(item).resource.tier === flags(source).resource.tier : flags(item).voidProtection === true));
      try { if (sources.length) await Item.createDocuments(sources.map(source => { const copy = structuredClone(source); delete copy._id; return copy; })); }
      catch (error) { ui.notifications.error(`Could not create Omnipotassium reference items: ${error.message}`); }
    }
  });
}
