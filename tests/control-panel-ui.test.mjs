import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("control panel exposes only friendly settings actions", async () => {
  const [application, template, materialTemplate, professionTemplate, itemSheet] = await Promise.all([
    readSource("../scripts/config-app.js"),
    readSource("../templates/rules-config.hbs"),
    readSource("../templates/material-config.hbs"),
    readSource("../templates/profession-config.hbs"),
    readSource("../scripts/item-sheet.js"),
  ]);

  assert.doesNotMatch(application, /AdvancedRulesConfig|openAdvanced|data-action=["']advanced/);
  assert.doesNotMatch(template, /Advanced JSON|data-action=["']advanced/);
  assert.match(template, /data-action="editMaterial"/);
  assert.match(template, /data-action="editProfession"/);
  assert.match(template, /data-action="reset"/);
  assert.match(template, /name="hexploration\.enabled"/);
  assert.match(template, /name="gathering\.enabled"/);
  assert.match(template, /name="gathering\.environmentId"/);
  assert.match(template, /name="gathering\.maxTier"/);
  assert.match(template, /name="gathering\.useSceneRegion"/);
  assert.match(template, /name="gathering\.rewardDestination"/);
  assert.doesNotMatch(template, /name="flanking\.|FlankingOptions|flankingEnabled/);
  assert.match(materialTemplate, /name="material\.modifierType"/);
  assert.match(materialTemplate, /name="itemTypes\.spellFocus"/);
  assert.match(materialTemplate, /name="dragonColors\.\{\{id\}\}\.damageType"/);
  assert.match(professionTemplate, /name="specialties\.\{\{id\}\}\.label"/);
  assert.match(professionTemplate, /name="specialties\.\{\{id\}\}\.description"/);
  assert.match(professionTemplate, /name="specialties\.\{\{id\}\}\.proficiency\.label"/);
  assert.match(professionTemplate, /name="specialties\.\{\{\.\.\/id\}\}\.stages\.\{\{key\}\}\.label"/);
  assert.match(itemSheet, /data-cmt-field="dragon-scale-color"/);
  assert.match(itemSheet, /data-cmt-field="dragon-scale-tier"/);
  assert.match(itemSheet, /MakeMarks/);
  assert.match(itemSheet, /ItemSheet\.Capacity/);
  assert.match(itemSheet, /system\.runes\./);
});

test("control panel uses opaque PF2e-inspired surfaces", async () => {
  const css = await readSource("../styles/module.css");

  assert.match(css, /--cmt-parchment:\s*#[0-9a-f]{6}/i);
  assert.match(css, /--cmt-crimson:\s*#[0-9a-f]{6}/i);
  assert.match(css, /--cmt-charcoal:\s*#[0-9a-f]{6}/i);
  assert.match(css, /\.cmt-material-card\s*\{[^}]*background:\s*var\(--cmt-charcoal\)/s);
  assert.match(css, /--cmt-green:\s*#0d4b2a/i);
  assert.match(css, /\.cmt-dashboard-masthead\s*\{[^}]*background:\s*repeating-linear-gradient/s);
  assert.match(css, /\.cmt-setting-card\s*\{[^}]*background:\s*var\(--cmt-charcoal\)/s);
  assert.doesNotMatch(css, /color-mix\(|rgba\(/);
});

test("Hexploration uses the requested fixed palette", async () => {
  const css = await readSource("../styles/module.css");

  assert.match(css, /--cmt-hex-brown:\s*#605856/i);
  assert.match(css, /--cmt-hex-crimson:\s*#5e0000/i);
  assert.match(css, /--cmt-hex-soft:\s*#e7d9cf/i);
  assert.match(css, /--cmt-hex-yellow:\s*#e9d7a1/i);
  assert.match(css, /\.cmt-native-progress\s*\{[^}]*background:\s*#e7d9cf/is);
  assert.match(css, /\.cmt-native-travel-role\s*\{[^}]*background:\s*#e7d9cf/is);
  assert.match(css, /\.cmt-hex-count-badges span\s*\{[^}]*background:\s*#e7d9cf/is);
});

test("Hexploration party controls do not submit unknown fields through the PF2e actor form", async () => {
  const [application, template] = await Promise.all([
    readSource("../scripts/hexploration.js"),
    readSource("../templates/hexploration-tab.hbs"),
  ]);

  assert.doesNotMatch(template, /\sname=/);
  assert.match(template, /data-cmt-action="save"/);
  assert.match(template, /data-cmt-action="begin"/);
  assert.match(template, /cmt-hex-native-content/);
  assert.match(template, /data-cmt-field="activity-used"/);
  assert.match(template, /data-cmt-action="roll-express-rider"/);
  assert.match(template, /data-cmt-field="express-rider-beneficiary"/);
  assert.doesNotMatch(template, /data-cmt-field="express-rider-skill"/);
  assert.doesNotMatch(template, /data-cmt-field="express-rider-dc"/);
  assert.match(template, /cmt-hex-roll-button cmt-hex-icon-button/);
  assert.match(template, /cmt-hex-heading-action cmt-hex-icon-button/);
  assert.match(template, /fa-dice-d20/);
  assert.match(template, /fa-sun/);
  assert.match(application, /party\.setFlag\(MODULE_ID, "hexploration"/);
  assert.match(application, /data-tab="\$\{EXPLORATION_TAB_ID\}"/);
  assert.match(application, /rememberScrollPosition/);
  assert.match(application, /syncNativeTravelSummary/);
  assert.match(application, /synchronizePreparedTravelSpeed/);
  assert.match(application, /LIVE_SUMMARY_INTERVAL_MS\s*=\s*750/);
  assert.match(application, /Hooks\.on\("updateItem"/);
  assert.doesNotMatch(application, /link\.dataset\.tab/);
});

test("gathering exposes a PF2e-styled player workflow and safe inventory awards", async () => {
  const [application, template, chatTemplate, css] = await Promise.all([
    readSource("../scripts/gathering.js"),
    readSource("../templates/gathering.hbs"),
    readSource("../templates/gathering-chat.hbs"),
    readSource("../styles/module.css"),
  ]);

  assert.match(application, /Hooks\.on\("renderItemDirectory"/);
  assert.match(application, /recipient\?\.canUserModify\?\.\(game\.user, "update"\)/);
  assert.match(application, /recipient\.createEmbeddedDocuments\("Item"/);
  assert.match(application, /existing\.update\(\{ "system\.quantity"/);
  assert.match(application, /config\.gathering\?\.environmentId/);
  assert.match(application, /taskSource\.tier > region\.maxTier/);
  assert.match(application, /resolveGatheringRecipient/);
  assert.match(application, /resolveGatheringRegion/);
  assert.match(template, /name="actorId"/);
  assert.match(template, /name="environmentId"/);
  assert.match(template, /name="taskId"/);
  assert.match(template, /\{\{optionLabel\}\}/);
  assert.match(template, /rewardDestinationLabel/);
  assert.match(template, /fa-dice-d20/);
  assert.match(chatTemplate, /cmt-gathering-chat/);
  assert.match(css, /--cmt-gather-brown:\s*#605856/i);
  assert.match(css, /--cmt-gather-red:\s*#5e0000/i);
  assert.match(css, /--cmt-gather-soft:\s*#e7d9cf/i);
  assert.match(css, /--cmt-gather-yellow:\s*#e9d7a1/i);
  assert.match(css, /\.cmt-gathering-stat-grid dd\s*\{[^}]*color:\s*var\(--cmt-gather-ink\)/is);
});

test("Workbench exposes recipe planning, reservations, downtime, and confirmed consumption", async () => {
  const [application, template, chatTemplate, css, main, manifestSource] = await Promise.all([
    readSource("../scripts/workbench.js"),
    readSource("../templates/workbench.hbs"),
    readSource("../templates/crafting-work-chat.hbs"),
    readSource("../styles/module.css"),
    readSource("../scripts/main.js"),
    readSource("../module.json"),
  ]);
  const manifest = JSON.parse(manifestSource);

  assert.match(main, /registerWorkbench/);
  assert.match(main, /restricted:\s*false/);
  assert.equal(manifest.socket, true);
  assert.match(application, /party\.setFlag\(MODULE_ID, "workbench"/);
  assert.match(application, /reserveCraftingProject/);
  assert.match(application, /buildConsumptionPlan/);
  assert.match(application, /DialogV2\.confirm/);
  assert.match(application, /updateEmbeddedDocuments\("Item"/);
  assert.match(application, /createEmbeddedDocuments\("Item"/);
  assert.match(application, /rollbackUpdates/);
  assert.match(application, /WORKBENCH_SOCKET\s*=\s*`module\.\$\{MODULE_ID\}`/);
  assert.match(application, /type:\s*"complete-request"/);
  assert.match(application, /type:\s*"complete-response"/);
  assert.match(application, /activePrimaryGM/);
  assert.match(application, /party\.canUserModify\?\.\(requestingUser, "update"\)/);
  assert.match(application, /completionLocks/);
  assert.match(template, /data-cmt-workbench-tab="craft"/);
  assert.match(template, /data-cmt-workbench-tab="gather"/);
  assert.match(template, /data-cmt-workbench-tab="projects"/);
  assert.match(template, /data-cmt-workbench-drop="base-item"/);
  assert.match(template, /data-cmt-project-action="roll-work"/);
  assert.match(template, /data-cmt-project-action="complete"/);
  assert.match(chatTemplate, /cmt-crafting-chat/);
  assert.match(css, /--cmt-workbench-gray:\s*#605856/i);
  assert.match(css, /--cmt-workbench-red:\s*#5e0000/i);
  assert.match(css, /--cmt-workbench-paper:\s*#e7d9cf/i);
  assert.match(css, /--cmt-workbench-gold:\s*#e9d7a1/i);
});
