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
  config.traitsDescriptions[VOIDBORN_TRAIT] = "This creature takes half damage from weapons and spells unless they use Omnipotentium. Its damage is halved against creatures wearing Omnipotentium armour. Other resistances, immunities, saving throws and Shield Block apply normally.";
}

export function hasVoidProtection(actor) {
  const traits = actor?.system?.traits?.value ?? [];
  if (traits.includes?.(VOIDBORN_TRAIT) || traits.has?.(VOIDBORN_TRAIT)) return true;
  return items(actor).some(item => item.type === "effect" && flags(item).voidProtection === true && !item.system?.expired && !item.isExpired);
}
export function isOmnipotentium(item) {
  const data = flags(item);
  return (data.material === "omnipotisium" && Number(data.tier) >= 1 && Number(data.tier) <= 6)
    || (data.crafting?.core?.materialId === "omnipotisium" && Number(data.crafting.core.tier) >= 1 && Number(data.crafting.core.tier) <= 6);
}
export function hasOmnipotentiumFrame(item) {
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
    const bypass = ["weapon", "melee"].includes(item.type) ? isOmnipotentium(item) : item.type === "spell" && items(source).some(focus =>
      getCraftingItemType(focus) === "spellFocus" && isActiveSpellFocus(focus) && isPrimarySpellFocus(focus, config)
      && (isOmnipotentium(focus) || hasOmnipotentiumFrame(focus)));
    if (!bypass) reasons.push("Void Protection: half damage");
  }
  if (hasVoidProtection(source) && items(target).some(armor => armor.type === "armor" && armor.isEquipped === true && isOmnipotentium(armor))) {
    reasons.push("Omnipotentium armour: half damage from a void creature");
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
  game.settings.register(MODULE_ID, "voidReferenceCleanup", { scope: "world", config: false, type: Object, default: {} });
  Hooks.once("ready", async () => {
    if (!installVoidDamageBridge()) console.warn(`${MODULE_ID} | Void damage bridge was not installed.`);
    const primaryGM = game.users?.contents?.filter(user => user.active && user.isGM).sort((a,b) => a.id.localeCompare(b.id))[0];
    if (game.user.isGM && (!primaryGM || primaryGM.id === game.user.id)) {
      // Rename only stock names from earlier previews; preserve quantities and custom names.
      const oldNames = new Set(["Omnipotisium Ingot", "Omnipotassium Ingot", "Omnipotisium Ingots", "Omnipotisium", "Omnipotassium", "Omnipotassium Ingots"]);
      const candidates = [...game.items.contents, ...(game.actors?.contents ?? []).flatMap(actor => items(actor))];
      for (const item of candidates) {
        if (flags(item).resource?.materialId === "omnipotisium" && (Number(item.system?.price?.value?.gp) > 0 || Number(flags(item).resource.pricePerUnitGp) > 0)) {
          try { await item.update({ "system.price.value": { pp: 0, gp: 0, sp: 0, cp: 0 }, [`flags.${MODULE_ID}.resource.pricePerUnitGp`]: 0,
            "system.description.value": CRAFTING_RESOURCE_SOURCES.find(source => flags(source).resource?.materialId === "omnipotisium")?.system.description.value }); }
          catch (error) { console.warn(`${MODULE_ID} | Could not remove legacy ingot price`, error); }
        }
        if (flags(item).resource?.materialId === "omnipotisium" && oldNames.has(item.name)) {
          try { await item.update({ name: CRAFTING_RESOURCE_SOURCES.find(source => flags(source).resource?.materialId === "omnipotisium" && flags(source).resource.tier === flags(item).resource.tier)?.name ?? item.name }); }
          catch (error) { console.warn(`${MODULE_ID} | Could not rename ingots`, error); }
        }
      }
      try {
        const cleanup = game.settings.get(MODULE_ID, "voidReferenceCleanup");
        if (!cleanup.completed) {
          const pack = game.packs.get(`${MODULE_ID}.void-protection`);
          const reference = await pack?.getDocument("wmVoidProtect001");
          if (reference?.flags?.[MODULE_ID]?.voidProtection) {
            // Only world sidebar references: never touch effects embedded on creatures.
            const copies = game.items.contents.filter(item => item.type === "effect" && flags(item).voidProtection === true
              && item.name === "Void Protection" && item.system?.slug === "wrathmaker-void-protection" && !item.system?.rules?.length);
            // Keep source copies in a hidden world setting before removing the redundant references.
            await game.settings.set(MODULE_ID, "voidReferenceCleanup", { completed: false, backup: cleanup.backup ?? copies.map(item => item.toObject()) });
            if (copies.length) await Item.deleteDocuments(copies.map(item => item.id));
            await game.settings.set(MODULE_ID, "voidReferenceCleanup", { completed: true, backup: cleanup.backup ?? copies.map(item => item.toObject()) });
          }
        }
      } catch (error) { console.warn(`${MODULE_ID} | Could not archive sidebar Void Protection references`, error); }
    }
  });
}
