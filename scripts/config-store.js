import { MODULE_ID, cloneDefaultRulesConfig } from "./constants.js";
import { normalizeRulesConfig } from "./model.js";

export const RULES_SETTING = "rulesConfig";

let cachedConfig = null;

export function registerRulesSetting() {
  game.settings.register(MODULE_ID, RULES_SETTING, {
    name: "CMT.Settings.Rules.Name",
    hint: "CMT.Settings.Rules.Hint",
    scope: "world",
    config: false,
    type: String,
    default: JSON.stringify(cloneDefaultRulesConfig()),
    onChange: () => {
      cachedConfig = null;
      refreshPreparedData();
    },
  });
}

export function getRulesConfig() {
  if (cachedConfig) return cachedConfig;
  try {
    cachedConfig = normalizeRulesConfig(game.settings.get(MODULE_ID, RULES_SETTING));
  } catch (error) {
    console.error(`${MODULE_ID} | Invalid saved configuration; using defaults.`, error);
    cachedConfig = normalizeRulesConfig(cloneDefaultRulesConfig());
  }
  return cachedConfig;
}

export async function setRulesConfig(value) {
  const normalized = normalizeRulesConfig(value);
  await game.settings.set(MODULE_ID, RULES_SETTING, JSON.stringify(normalized));
  cachedConfig = normalized;
  return normalized;
}

export async function resetRulesConfig() {
  return setRulesConfig(cloneDefaultRulesConfig());
}

export function refreshPreparedData() {
  const actors = new Set([
    ...(game.actors?.contents ?? []),
    ...(globalThis.canvas?.tokens?.placeables ?? []).map((token) => token.actor).filter(Boolean),
  ]);
  for (const actor of actors) {
    actor.reset?.();
    actor.render?.(false);
    for (const item of actor.items?.contents ?? []) item.render?.(false);
  }
  for (const item of game.items?.contents ?? []) {
    item.reset?.();
    item.render?.(false);
  }
}
