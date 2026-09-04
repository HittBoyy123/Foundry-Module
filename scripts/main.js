import { MODULE_ID, MODULE_TITLE } from "./constants.js";
import { createPublicApi } from "./api.js";
import { installAbilityBoostBridge, registerAbilityBoostSheetHooks } from "./ability-boosts.js";
import { installCampaignResourceBridge, registerCampaignResourceSheetHooks } from "./campaign-resources.js";
import { createRulesConfigApplication } from "./config-app.js";
import { getRulesConfig, refreshPreparedData, registerRulesSetting } from "./config-store.js";
import { installFlankingBridge } from "./flanking.js";
import { registerGathering } from "./gathering.js";
import { installHexploration } from "./hexploration.js";
import { installRuleElementBridge, registerPreparedItemHooks } from "./integration.js";
import { registerItemSheetHooks } from "./item-sheet.js";
import { registerProfessionHooks } from "./professions.js";
import { registerWorkbench } from "./workbench.js";

let bridgeInstalled = false;
let abilityBoostsInstalled = false;
let campaignResourcesInstalled = false;
let flankingInstalled = false;
let hexplorationInstalled = false;
let gatheringInstalled = false;
let professionsInstalled = false;
let workbenchInstalled = false;

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

  const GatheringApplication = registerGathering(getRulesConfig);
  game.settings.registerMenu(MODULE_ID, "gatheringMenu", {
    name: "CMT.Gathering.MenuName",
    label: "CMT.Gathering.Open",
    hint: "CMT.Gathering.MenuHint",
    icon: "fa-solid fa-basket-shopping",
    type: GatheringApplication,
    restricted: false,
  });
  gatheringInstalled = true;

  const WorkbenchApplication = registerWorkbench();
  game.settings.registerMenu(MODULE_ID, "workbenchMenu", {
    name: "CMT.Workbench.MenuName",
    label: "CMT.Workbench.Open",
    hint: "CMT.Workbench.MenuHint",
    icon: "fa-solid fa-hammer",
    type: WorkbenchApplication,
    restricted: false,
  });
  workbenchInstalled = true;

  bridgeInstalled = installRuleElementBridge(getRulesConfig);
  abilityBoostsInstalled = installAbilityBoostBridge();
  registerAbilityBoostSheetHooks();
  campaignResourcesInstalled = installCampaignResourceBridge();
  registerCampaignResourceSheetHooks();
  flankingInstalled = installFlankingBridge(getRulesConfig);
  hexplorationInstalled = installHexploration(getRulesConfig);
  registerPreparedItemHooks(getRulesConfig);
  registerItemSheetHooks(getRulesConfig);
  professionsInstalled = registerProfessionHooks();

  const module = game.modules.get(MODULE_ID);
  if (module) module.api = createPublicApi();
});

Hooks.once("ready", () => {
  if (game.system.id !== "pf2e") return;
  if (bridgeInstalled || abilityBoostsInstalled || campaignResourcesInstalled || flankingInstalled || hexplorationInstalled) {
    refreshPreparedData();
  }
  Hooks.callAll(`${MODULE_ID}.ready`, game.modules.get(MODULE_ID)?.api);
  const unavailable = [
    !bridgeInstalled ? "item automation" : null,
    !abilityBoostsInstalled ? "Apex item-boost automation" : null,
    !campaignResourcesInstalled ? "campaign resource automation" : null,
    !flankingInstalled ? "flanking automation" : null,
    !hexplorationInstalled ? "Hexploration automation" : null,
    !gatheringInstalled ? "gathering" : null,
    !professionsInstalled ? "professions" : null,
    !workbenchInstalled ? "Workbench" : null,
  ].filter(Boolean);
  console.info(`${MODULE_ID} | Ready${unavailable.length ? ` (${unavailable.join(" and ")} unavailable)` : ""}.`);
});
