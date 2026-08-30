import { MODULE_ID, MODULE_TITLE } from "./constants.js";
import { createPublicApi } from "./api.js";
import { createRulesConfigApplication } from "./config-app.js";
import { getRulesConfig, refreshPreparedData, registerRulesSetting } from "./config-store.js";
import { installFlankingBridge } from "./flanking.js";
import { installRuleElementBridge, registerPreparedItemHooks } from "./integration.js";
import { registerItemSheetHooks } from "./item-sheet.js";

let bridgeInstalled = false;
let flankingInstalled = false;

Hooks.once("init", () => {
  if (game.system.id !== "pf2e") {
    console.error(`${MODULE_ID} | ${MODULE_TITLE} requires the Pathfinder Second Edition system.`);
    return;
  }

  registerRulesSetting();
  const RulesConfigApplication = createRulesConfigApplication();
  game.settings.registerMenu(MODULE_ID, "rulesMenu", {
    name: "CMT.Settings.Menu.Name",
    label: "CMT.Settings.Menu.Label",
    hint: "CMT.Settings.Menu.Hint",
    icon: "fa-solid fa-hammer",
    type: RulesConfigApplication,
    restricted: true,
  });

  bridgeInstalled = installRuleElementBridge(getRulesConfig);
  flankingInstalled = installFlankingBridge(getRulesConfig);
  registerPreparedItemHooks(getRulesConfig);
  registerItemSheetHooks(getRulesConfig);

  const module = game.modules.get(MODULE_ID);
  if (module) module.api = createPublicApi();
});

Hooks.once("ready", () => {
  if (game.system.id !== "pf2e") return;
  if (bridgeInstalled || flankingInstalled) refreshPreparedData();
  Hooks.callAll(`${MODULE_ID}.ready`, game.modules.get(MODULE_ID)?.api);
  const unavailable = [
    !bridgeInstalled ? "item automation" : null,
    !flankingInstalled ? "flanking automation" : null,
  ].filter(Boolean);
  console.info(`${MODULE_ID} | Ready${unavailable.length ? ` (${unavailable.join(" and ")} unavailable)` : ""}.`);
});
