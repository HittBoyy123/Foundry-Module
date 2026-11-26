import { DEFAULT_RULES_CONFIG, MODULE_ID } from "./constants.js";
import { normalizeRulesConfig } from "./model.js";
export function oreConfig() {
  try { const raw=globalThis.game?.settings?.get?.(MODULE_ID,"rulesConfig"); if(raw && (typeof raw === "string" || raw.materials)) return normalizeRulesConfig(raw); } catch {}
  return DEFAULT_RULES_CONFIG;
}
export function materialTiers(config, id) { return config.materials?.[id]?.customOre ? [config.materials[id].oreTier] : [1,2,3,4,5,6]; }
export function metalEquivalent(id, config = oreConfig()) { return config.materials?.[id]?.customOre || id === "omnipotisium" ? "metal" : id; }
export function oreHasProperty(id, tag, config = oreConfig()) { return config.materials?.[id]?.enabled !== false && config.materials?.[id]?.propertyTags?.includes(tag) === true; }
export function newCustomOre(config, name, id) {
  if (!name?.trim() || !/^[a-z][a-z0-9-]*$/.test(id) || Object.hasOwn(config.materials,id)) throw new Error("Enter a unique ore name.");
  const updated = structuredClone(config);
  updated.materials[id] = { ...structuredClone(config.materials.metal), label: name.trim(), customOre: true, oreTier: 1,
    extraDamageDice: 0, propertyTags: [], tierLabels: {1:name.trim()}, tierBonuses:{1:0}, tierPricesGp:{1:0}, tierRarities:{1:"unique"} };
  return updated;
}
export function customOreResource(id, material) {
  return { name: material.label + " Ingots", type: "equipment", img: "icons/commodities/metal/ingot-stamped-steel.webp",
    system: { quantity: 1, level: {value:({1:1,2:4,3:8,4:12,5:16,6:20,7:20})[material.oreTier]}, price:{value:{gp:0},per:1}, stackGroup:null, bulk:{value:0.2}, equipped:{carryType:"worn"}, rules:[], traits:{value:["precious"],otherTags:["wrathmaker-resource"],rarity:"unique"}, description:{value:"<p>GM-awarded custom ore. One ingot supplies one Resource Unit. No standard market value.</p>"} },
    flags:{[MODULE_ID]:{resource:{schemaVersion:1,materialId:id,tier:material.oreTier,unit:"ingot",unitsPerItem:1,pricePerUnitGp:0}}} };
}
