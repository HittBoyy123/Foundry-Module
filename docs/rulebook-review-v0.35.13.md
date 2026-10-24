# Rulebook changes for Wrathmaker v0.35.13

Reviewed 24 October 2026 against **Pathfinder 2e Ash's Rules (2).docx**, the latest supplied copy, using its extracted paragraphs and tables. Its opening identifies v0.35.12, while its closing scope and development tracker still refer to v0.35.8 and v0.35.11. This is not a review of subsequent edits to the live Google Doc. The original file has not been changed.

Keep the existing fonts, slate table headings, alternating grey rows and playtest disclaimer. Update the edition to **v0.35.13 — 24 October 2026**, the closing scope statement, development tracker and table of contents.

## 1. Replace the Nephilim bond introduction and distinct-choice restriction

Each shared party Nephilim point unlocks one bond slot for every member of that party. Character level does not determine the number of bonds. Choosing a bond does not spend points. Repeat selections stack, including repeated save or attribute choices.

Slots activate in order. If the shared total falls, excess slots become inactive without losing their choices. They reactivate when points return. A character with no party has no active allowance. Members of multiple parties use the highest single party total, not the sum. The shared tracker remains capped at ten points.

Existing level-5, 10, 15 and 20 selections occupy slots 1, 2, 3 and 4. Keep the original six-bond table; Ao's Toughness still scales its HP benefit with character level.

### Add: bonds unlocked at two shared points

These use normal bond slots and become inactive below two points even if placed in slot one.

| Bond | Benefit |
| --- | --- |
| Ao's Communion | +3 AC while another party member has the same active bond. |
| Ao's Pincer | +3 to attack rolls while another party member has the same active bond. |
| Nephilim Charge | Move at least 20 feet immediately before the next melee Strike on the same turn to gain +3 to that attack. Enable the Charge roll option after moving. It clears after the melee attack or a combat turn change. Movement is player-confirmed. |
| Valor of Ao | +4 to a saving throw of your choice while another party member has the same active bond. Each holder chooses their own save. |
| Ao's Stamina | One extra prepared or spontaneous spell slot at each accessible rank per selection. Normal preparation, casting and resting apply. |

Ally bonds have no distance limit. Repeating your own bond stacks its benefit; extra qualifying allies do not multiply that benefit. Stamina excludes cantrips, focus and innate spell uses. It adds slots once per rank, not once per spellcasting entry; the first eligible entry receives that rank's extra slots.

## 2. Add the crafting-time amendment

New projects take one-third less base time than the previous rules: **new days = max(1, ceiling(previous base days × 2 ÷ 3))**. This applies after the earlier 20% reduction and rounding. Examples: 3 days become 2, 4 become 3, 6 become 4, and 8 become 6. One-day and two-day durations stay unchanged. Existing projects retain their recorded requirements and progress. Costs and teamwork bonuses are unchanged.

Update worked examples to the current Workbench preview. Do not apply the reduction a second time to the displayed value. Optional upgrade additions can still add work beyond the reduced base.

## 3. Replace automatic table-roll wording

Replace the automatic-roll wording in the Work Block results paragraph, Edge result 4, “When a Masterstroke is earned”, and the critical-success crafting example with:

A critical success saves the Work Block and pauses before applying progress. Roll the Crafting Edge table manually: d3 normally, or Final Block (d4) if accelerated work could complete the contribution. The Workbench identifies the die to use.

Spend **1 Hero Point** on the lead crafter's sheet to reroll either the Edge or Masterstroke table and **choose either result**. Record the point spent manually before rerolling. The confirmation form does not deduct Hero Points.

If Masterstroke Opportunity completes the contribution at 100% work, roll the appropriate weapon or equipment d8 table. Reroll incompatible results. The one-Masterstroke-per-item limit remains, including through upgrades; consumables and ammunition do not gain Masterstrokes. An ineligible Opportunity uses Accelerated Work.

The lead crafter's owner or a GM selects the project and clicks **Complete Craft** (tooltip: “Resolve crafting tables”). Select the final Edge, eligible Masterstroke and any conserved resource, then choose **Apply Final Results**. Opening tables leaves this window open. Closing it leaves the roll pending. Confirmation applies progress and benefits once; normal project completion then creates the item with its selected Masterstroke.

This does not allow a new crafting check while results are pending. Ordinary successes and failures retain their normal work outcomes.

## 4. Correct Masterstroke activation text

Replace “Limited benefits apply automatically to the first eligible roll or hit” with:

Equipped Masterstroke items add entries to the Actions tab. Passive effects remain automatic. Chosen benefits must be armed before their eligible roll or hit; arming does not spend the use until the benefit applies. Entries remain visible after being spent. Uses follow the item when transferred. Daily uses also refresh through Rest for the Night; encounter uses refresh in a new combat or through the GM's Start New Encounter control.

## 5. Add GM controls

**Custom DC:** in Workbench → Projects, select an unfinished project and choose Set DC. Enter a whole-number DC or leave blank to restore the recipe default. Only GMs can edit it. The normal recipe DC is displayed in brackets to GMs. Workbench DC readouts are hidden from players. A saved pending check retains its original DC; changes apply to future checks.

**Edit existing Masterstrokes:** GMs and assistant GMs can use the item's Details tab, below Striking Rune on weapons, to add, replace or remove one compatible Masterstroke. This works for existing crafted or world items. Replacing the effect resets its limited uses. Finish or cancel an active upgrade first. Crafting Edges remain project outcomes rather than permanent weapon abilities.

## 6. Correct the existing teamwork table

The supplied document still bases faster work on headcount. Keep the +1 per additional artisan, maximum +5, but replace its work-rate column with this rule:

| Team composition | Work rate |
| --- | --- |
| Lead present, one or more named support roles unfilled | ×1 |
| Lead and all named support roles filled | ×1.25 |

Generic assistants add to the roll but do not independently unlock a faster work rate. Older projects retain their recorded rate. Every participating artisan commits the same calendar downtime; fractional progress carries forward.

## 7. Carry forward missing v0.35.12 content

The supplied copy still needs the implemented categories marked as available in its development tracker and explained in the relevant crafting sections:

- **Consumables:** one to four identical potions, oils, elixirs or alchemical bombs per batch. Alchemy lead, Glassmaking support. Each item requires one Herbs/Mushrooms unit and one container-stock unit; magical items also require one Mana Gem. Costs scale with quantity; duration remains the same as one dose.
- **Ammunition:** batches of ten, up to forty per project. Mundane ammunition uses Tier 1. Magical variants use their item-level material threshold. Arrows/bolts/darts use Wood and Metal; firearm ammunition uses Metal and Herbs; sling ammunition uses Stone or Metal. Magical ammunition additionally costs one Mana Gem per projectile. Magazines and charged containers remain outside this workflow.
- **Scrolls:** Bookmaking lead, Enchanting support. A participating character must know the spell and remain involved. No prepared slot or available slot is consumed. Cantrips cannot become scrolls. The highest spell rank accessible to a participant limits the scroll rank. Each scroll costs one Wood and one Mana Gem at the selected tier; batches contain one to four identical scrolls. The spellbook selector groups spells by rank, shows material tier and lets you choose a legal heightened rank.
- **Material thresholds by item level:** Tier 1: 0–1; Tier 2: 2–4; Tier 3: 5–8; Tier 4: 9–12; Tier 5: 13–16; Tier 6: 17–20. These are crafting thresholds, not gathering-zone thresholds. Higher material tier does not automatically upgrade the selected item variant.
- Update Bookmaking, Alchemy, Glassmaking and Enchanting profession examples to include these roles. Wands remain planned.

The previous v0.35.12 review referred to the older (1) document and incorrectly treated all consumable durations as two base days. Use the current Workbench values and the time rule above; do not copy historical duration claims blindly.

## Verification and limits

465 automated tests pass for this release. Local files were installed with backups. Recent UI changes have not yet been visually verified in a running Foundry world. This review supplies edits and replacement wording; it does not claim to be a reformatted or rendered replacement DOCX.
