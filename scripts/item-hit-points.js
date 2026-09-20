import { MODULE_ID } from "./constants.js";

const preparedHitPoints = new WeakMap();

/** Legacy items stored base HP. After an HP edit, store the actual displayed HP. */
export function addItemHitPointBonus(item, bonus) {
  const hp = item.system?.hp;
  if (!hp || !Number.isFinite(hp.max) || !Number.isFinite(bonus) || bonus <= 0) return;
  let state = preparedHitPoints.get(item.system);
  if (!state) {
    const sourceValue = item._source?.system?.hp?.value;
    const value = Number.isFinite(sourceValue) ? sourceValue : hp.value;
    const flags = item.flags?.[MODULE_ID] ?? item._source?.flags?.[MODULE_ID];
    state = {
      value,
      absolute: flags?.crafting?.hpValueMode === "absolute" || value === 0 || (Number.isFinite(sourceValue) && sourceValue > hp.max),
      bonus: 0,
    };
    preparedHitPoints.set(item.system, state);
  }
  state.bonus += bonus;
  hp.max += bonus;
  // Restore from source even if PF2e clamped an unowned item's value to its base max.
  hp.value = Math.max(0, Math.min(hp.max, state.absolute ? state.value : state.value + state.bonus));
  if (Object.hasOwn(hp, "brokenThreshold")) hp.brokenThreshold = Math.floor(hp.max / 2);
}

/** Called after PF2e validates damage/repair values, before they are persisted. */
export function preserveItemHitPointUpdate(item, changes) {
  const value = changes["system.hp.value"] ?? changes.system?.hp?.value;
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return false;
  const flags = item.flags?.[MODULE_ID] ?? item._source?.flags?.[MODULE_ID];
  if (!preparedHitPoints.get(item.system)?.bonus && flags?.crafting?.hpValueMode !== "absolute") return false;
  changes.flags ??= {};
  changes.flags[MODULE_ID] ??= {};
  changes.flags[MODULE_ID].crafting ??= {};
  changes.flags[MODULE_ID].crafting.hpValueMode = "absolute";
  return true;
}
