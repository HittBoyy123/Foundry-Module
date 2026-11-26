# Rulebook review — v0.35.14

Reviewed 26 November 2026 against the latest supplied **Pathfinder 2e Ash's Rules (2).docx**, using its extracted paragraphs and tables. The original document and live Google Doc have not been edited. Preserve the document's existing fonts, slate headings, alternating grey table rows and playtest disclaimer.

## 1. Replace the Omnipotentium section and its six-tier table

Remove the Omni Iron, Omni Steel, Creation Steel, Fate Steel, Eternal Steel and Iron's Blood tier rows. Replace them with:

| Material | Tier | Default material bonus | Additional weapon dice | Availability |
| --- | --- | --- | --- | --- |
| Omnipotentium Ingots | 7 | +6 | +1 weapon damage die, added alongside Striking | GM-awarded only; no gathering or standard market value |

Omnipotentium is the only Tier 7 material. It can replace the core material when crafting eligible weapons and armour. Its material bonus follows the normal attack, armour and focus rules. The GM may change its material bonus and additional weapon dice in the Custom Ores editor.

An Omnipotentium weapon, or a spell cast through an active focus with an Omnipotentium frame, bypasses Voidborn half-damage protection. Other resistances and immunities still apply. Worn Omnipotentium armour halves damage received from Voidborn attackers.

Tier 7 crafting Work Blocks have a base DC of 70, before recipe adjustments or a GM override. Normal structural resources use Tiers 5–6, and mandatory Mana Gem catalysts use Tier 6. Normal materials remain capped at Tier 6.

## 2. Amend the general material and Striking wording

The introduction, material/DC explanation and enchanting section currently state that materials never add weapon dice. Replace that wording with:

Standard material tiers grant their normal bonuses without extra weapon damage dice. Striking runes increase base weapon damage dice. Custom ores may grant additional weapon damage dice, using the weapon's die size and adding alongside Striking. The GM controls that extra-dice value for each custom ore. Omnipotentium defaults to one extra die.

Example: a weapon with a d8 damage die and a Striking rune normally rolls 2d8. Default Omnipotentium adds another d8, making 3d8 before other applicable damage modifiers.

## 3. Add a GM subsection: Custom Ores

Open Wrathmaker → Control Panel → Custom Ores. Select Add Custom Ore, give it a unique name, and edit its single tier, material bonus and extra weapon dice. Other custom ores use Tiers 1–6; Omnipotentium is fixed at Tier 7. Save Material, then use Add Ingot to Compendium to create or update its resource reference.

The Voidborn property enables the same protection and bypass rules as Omnipotentium. Other comma-separated tags are descriptive and do not create automatic effects. Custom ores are GM-awarded, cannot be gathered, and have no standard sale price. Changes to material bonuses apply to existing equipment using that material as well as newly crafted items.

## 4. Update the Nephilim Bonds explanation

If the supplied document's level-5/10/15/20 rule and distinct-choice restriction remain, replace them using the v0.35.13 review: one slot per shared party point, repeated choices stack, and excess slots deactivate when points fall.

Add this paragraph for Communion, Pincer and Valor:

These bonds form a party-wide connection. Another member of the same party must have the same active bond. There is no distance limit and no requirement to share a scene. The Bond Aura effect shows Active or Waiting for a matching ally. Communion grants +3 AC, Pincer grants +3 to attack rolls, and Valor grants +4 to your chosen saving throw. Each repeated selection grants its normal bonus; having more matching allies does not multiply it. The aura indicator adds no separate bonus.

## 5. Update version, tracker and migration notes

Set the edition and closing scope to v0.35.14 — 26 November 2026. Add Custom Ores and party-wide Nephilim bond indicators to the implemented tracker. Update the table of contents if Custom Ores gains its own heading.

For existing Foundry worlds: restart after updating and run Refresh All with a GM connected. Old Omnipotentium ingots and crafted equipment become Tier 7; quantities and Striking runes remain. Retired stock Omni tier references are removed from the compendium. Existing bond choices are retained.

## Earlier amendments still required in the supplied copy

This review supplements [the v0.35.13 rulebook review](https://github.com/HittBoyy123/Foundry-Module/releases/download/v0.35.13/rulebook-review-v0.35.13.md). That document covers the shared Nephilim point rules, shorter crafting times, manual Edge/Masterstroke resolution and Hero Points, GM DC controls, named-role teamwork, batch consumables/ammunition/scrolls, tool bonuses and Gate Attenuators. Apply those sections if they have not yet been copied into your current rulebook. This review supersedes any earlier six-tier Omnipotentium or absolute no-material-damage-dice wording.
