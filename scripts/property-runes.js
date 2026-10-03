import { MODULE_ID } from "./constants.js";
import { getRulesConfig } from "./config-store.js";
import { calculateItemEffects } from "./model.js";
import { currentMasterstroke } from "./masterstroke-rules.js";

export const MANA_RUNE_LEVELS = [1, 4, 8, 12, 16, 20];
export function materialRuneSlots(item, config = getRulesConfig()) {
  if (!["weapon", "armor"].includes(item?.type) || item.system?.grade) return 0;
  const flags = item.flags?.[MODULE_ID];
  if (!flags?.material) return 0;
  const result = calculateItemEffects({ itemType: item.type, itemId: item.id ?? "preview", itemName: item.name, flags, config });
  const effect = result.previews.find(effect => effect.selectors?.includes(item.type === "armor" ? "ac" : "{item|_id}-attack"));
  return result.active ? Math.min(3, Math.max(0, Math.floor(effect?.value ?? 0))) + (currentMasterstroke(item)?.id === "limitless-channel" ? 1 : 0) : 0;
}

/** Supply slots during native preparation, then remove the temporary potency bonus. */
export function installMaterialRuneSlots(classes = CONFIG.PF2E.Item.documentClasses) {
  const marker = Symbol.for(`${MODULE_ID}.materialRuneSlots`);
  for (const type of ["weapon", "armor"]) {
    const prototype = classes[type]?.prototype;
    const original = prototype?.prepareBaseData;
    if (!original || original[marker]) continue;
    const wrapper = function(...args) {
      if (!this.flags?.[MODULE_ID]?.material) return original.apply(this, args);
      const slots = materialRuneSlots(this);
      if (!this.system.runes) return original.apply(this, args);
      this.system.runes.potency = slots;
      try { return original.apply(this, args); }
      finally { this.system.runes.potency = 0; }
    };
    Object.defineProperty(wrapper, marker, { value: true });
    prototype.prepareBaseData = wrapper;
  }
}
