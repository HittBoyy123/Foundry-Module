import { MODULE_ID } from "./constants.js";

const entry = (id, name, description, types = null, frequency = null) => ({ id, name, description, types, frequency });
export const WEAPON_MASTERSTROKES = Object.freeze([
  entry("perfect-balance", "Perfect Balance", "Reduce this weapon’s multiple attack penalty by 2 on every Strike, minimum 0."),
  entry("unerring-strike", "Unerring Strike", "Once per encounter, improve a failed Strike to a success. Critical failures are unaffected.", null, "encounter"),
  entry("unyielding-edge", "Unyielding Edge", "Ignore 10 points of resistance to this weapon’s physical damage. Immunities and Voidborn protection still apply."),
  entry("relentless-assault", "Relentless Assault", "Once per encounter after missing, immediately make another Strike with this weapon as a free action at the same multiple attack penalty. Both attacks count towards subsequent penalties.", null, "encounter"),
  entry("guardians-weapon", "Guardian’s Weapon", "After hitting, gain +2 circumstance AC until your next turn. Once per encounter also gain temporary HP equal to your level for 1 minute.", null, "encounter"),
  entry("overwhelming-impact", "Overwhelming Impact", "Once per turn on a critical hit, knock the target prone or push it up to 10 feet. The target can be up to two sizes larger.", null, "turn"),
  entry("artisans-triumph", "Artisan’s Triumph", "Once per day, improve a successful Strike to a critical success.", null, "day"),
  entry("limitless-channel", "Limitless Channel", "Gain one additional property-rune slot, allowing four total. Acquire and apply the rune separately."),
]);
export const EQUIPMENT_MASTERSTROKES = Object.freeze([
  entry("indomitable-construction", "Indomitable Construction", "Triple maximum HP and Broken Threshold; increase Hardness by 5."),
  entry("protective-finish", "Protective Finish", "Armour or raised shield: once per round, reduce damage from one hit by 10 after other reductions.", ["armor", "shield"], "round"),
  entry("defy-death", "Defy Death", "Armour: once per encounter, turn a critical hit against you into a normal hit.", ["armor"], "encounter"),
  entry("unbreakable-guard", "Unbreakable Guard", "Shield: +5 Hardness. Once per encounter when you Shield Block, the shield takes no damage; you take damage normally after Hardness.", ["shield"], "encounter"),
  entry("perfect-focus", "Perfect Focus", "Spell focus: once per encounter, improve a failed spell attack to a success, or make one target’s successful spell save a failure. Critical failures and successes are unaffected.", ["spellFocus"], "encounter"),
  entry("adamant-will", "Adamant Will", "Worn equipment: once per encounter, improve a failed saving throw to a success. Critical failures are unaffected.", ["worn"], "encounter"),
  entry("weightless-wonder", "Weightless Wonder", "The item has negligible Bulk. Worn armour also loses its Speed penalty and Strength-based check penalty."),
  entry("limitless-channel", "Limitless Channel", "Armour: gain one additional property-rune slot, allowing four total. Acquire and apply the rune separately.", ["armor"]),
]);
export const masterstrokeTable = category => category === "weapon" ? WEAPON_MASTERSTROKES : EQUIPMENT_MASTERSTROKES;
export function masterstrokeKind(item) {
  return item?.flags?.[MODULE_ID]?.itemType === "spellFocus" || item?.flags?.[MODULE_ID]?.crafting?.itemType === "spellFocus"
    || item?.system?.traits?.otherTags?.includes?.("spell-focus") || item?.system?.slug === "spell-focus" ? "spellFocus" : item?.type;
}
export const masterstrokeCategory = item => masterstrokeKind(item) === "weapon" ? "weapon" : "equipment";
export function eligibleMasterstroke(item, result, category = masterstrokeCategory(item)) {
  const effect = masterstrokeTable(category)[result - 1];
  if (!effect || category !== masterstrokeCategory(item)) return false;
  if (effect.id === "indomitable-construction" && !(Number(item?.system?.hp?.max) > 0)) return false;
  if (!effect.types) return true;
  return effect.types.includes(masterstrokeKind(item)) || (effect.types.includes("worn")
    && (item?.type === "armor" || String(item?.system?.usage?.value ?? "").startsWith("worn")));
}
export function currentMasterstroke(item) {
  if (item?.flags?.[MODULE_ID]?.upgradeProject) return null;
  const stroke = item?.flags?.[MODULE_ID]?.crafting?.masterstrokes?.[0];
  if (stroke?.edition !== "chad") return null;
  const definition = masterstrokeTable(stroke.category)[Number(stroke.result) - 1];
  return definition ? { ...stroke, ...definition, instanceId: stroke.id } : null;
}
export function usageKey(frequency, world = globalThis.game) {
  const combat = world?.combat;
  const encounter = combat?.started ? combat.id : `exploration-${world?.settings?.get?.(MODULE_ID, "masterstrokeEncounter") ?? 0}`;
  if (frequency === "day") return `day-${Math.floor(Number(world?.time?.worldTime ?? 0) / 86400)}`;
  if (frequency === "round") return `${encounter}:round-${combat?.round ?? 0}`;
  if (frequency === "turn") return `${encounter}:round-${combat?.round ?? 0}:turn-${combat?.turn ?? 0}`;
  return encounter;
}
export function masterstrokeAvailable(item, frequency = currentMasterstroke(item)?.frequency, world = globalThis.game) {
  return Boolean(currentMasterstroke(item)) && (!frequency || item.flags?.[MODULE_ID]?.crafting?.masterstrokeUses?.[frequency] !== usageKey(frequency, world));
}
