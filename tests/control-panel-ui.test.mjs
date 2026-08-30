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
