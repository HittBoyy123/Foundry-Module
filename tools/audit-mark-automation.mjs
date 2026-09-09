import fs from "node:fs";
import { ARTISAN_MARK_DEFINITIONS } from "../content/artisan-marks.js";
import { rulesForArtisanMark, markConfigurationChoices, markAppliesToItem } from "../scripts/artisan-mark-effects.js";
import { MARK_ITEM_POWER } from "../content/mark-power.js";
import { markDescriptionHtml } from "../scripts/mark-formulas.js";
import { timedMarkRules } from "../scripts/mark-activation-effects.js";

const rows = ARTISAN_MARK_DEFINITIONS.map(mark => {
  const samples = mark.validItemGroups.map(type => {
    const item = { id: "audit", type, isRaised: true, system: { baseItem: "steel-shield", damage: { dice: 1 } }, flags: {} };
    if (!markAppliesToItem(mark, type, item)) return [];
    return rulesForArtisanMark({ ...mark, configuration: { choice: markConfigurationChoices(mark.id)[0] } }, item);
  }).flat();
  const html = markDescriptionHtml(mark.effectSummary, { tier: 4, level: 10, dc: 28 });
  let timed = false;
  try { timed = Boolean(timedMarkRules(mark, { id: "audit", flags: { "pf2e-crafting-material-tiers": { tier: 4 } } },
    { configuration: { choice: markConfigurationChoices(mark.id)[0] } })); } catch { /* configured-choice requirement */ }
  return { id: mark.id, name: mark.name, category: mark.categories.join(", "),
    ruleKeys: [...new Set(samples.map(rule => rule.key))], itemStats: Boolean(MARK_ITEM_POWER[mark.id]),
    activation: Boolean(mark.activation), timed, clickableFormula: /@Damage|@Check/.test(html) };
});
const escape = text => String(text).replaceAll("|", "\\|");
const doc = ["# Artisan Mark Automation Audit", "",
  "Coverage inventory, not proof of complete automation. Rule presence does not verify every rider, activation, target, frequency, or live Foundry behaviour. Supported timed-effect buttons spend uses and apply self-effects. Other action cards provide readouts/roll links only; posting a card does not resolve an activation.", "",
  `Reviewed ${rows.length} catalogue entries. Structure and project entries are kept separate from carried-item effects.`, "",
  "| Mark | Category | Native rule adapters | Item-stat adapter | Activation readout | Timed self-effect | Roll links at T4 |",
  "|---|---|---|---|---|---|---|",
  ...rows.map(row => `| ${escape(row.name)} (${row.id}) | ${row.category} | ${row.ruleKeys.join(", ") || "None"} | ${row.itemStats ? "Yes" : "No / inspect direct adapters"} | ${row.activation ? "Yes — partial" : "No"} | ${row.timed ? "Yes — manual riders remain" : "No"} | ${row.clickableFormula ? "Yes" : "No"} |`),
  "", "## Still required before claiming complete automation", "",
  "- Review each description against its rules, including conditional and secondary riders.",
  "- Implement and verify activation use limits, timed effects, targeting and permissions.",
  "- Resolve consumable inputs, paid essences, spell-slot recovery and damage-interception transactions explicitly.",
  "- Preserve narrative/GM-dependent constraints rather than silently replacing them with unrelated PF2e item abilities.",
  "- Test in Foundry, including item upgrades, actor transfers, equipment state and multiple users.", ""].join("\n");
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync("docs/mark-automation-audit.md", doc);
console.log(`Audited ${rows.length} marks; ${rows.filter(row => row.ruleKeys.length).length} have native rule adapters, ${rows.filter(row => row.activation).length} activation readouts. See docs/mark-automation-audit.md.`);
