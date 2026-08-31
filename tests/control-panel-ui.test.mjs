import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("control panel exposes only friendly settings actions", async () => {
  const [application, template] = await Promise.all([
    readSource("../scripts/config-app.js"),
    readSource("../templates/rules-config.hbs"),
  ]);

  assert.doesNotMatch(application, /AdvancedRulesConfig|openAdvanced|data-action=["']advanced/);
  assert.doesNotMatch(template, /Advanced JSON|data-action=["']advanced/);
  assert.match(template, /data-action="editMaterial"/);
  assert.match(template, /data-action="reset"/);
  assert.match(template, /name="hexploration\.enabled"/);
});

test("control panel uses opaque PF2e-inspired surfaces", async () => {
  const css = await readSource("../styles/module.css");

  assert.match(css, /--cmt-parchment:\s*#[0-9a-f]{6}/i);
  assert.match(css, /--cmt-crimson:\s*#[0-9a-f]{6}/i);
  assert.match(css, /--cmt-charcoal:\s*#[0-9a-f]{6}/i);
  assert.match(css, /\.cmt-material-card\s*\{[^}]*background:\s*var\(--cmt-charcoal\)/s);
  assert.match(css, /\.cmt-setting-card\s*\{[^}]*background:\s*var\(--cmt-crimson\)/s);
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
