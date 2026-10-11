# Rulebook review for Wrathmaker v0.35.12

Reviewed 11 October 2026 against the supplied **Pathfinder 2e Ash’s Rules (1).docx**. Its opening identifies v0.35.8; its development tracker identifies v0.35.11 and includes later local-preview notes. This review covers that supplied copy, not subsequent edits to the live Google Doc. Keep the original document and apply the following changes using its existing headings, slate table headers and alternating grey rows.

## Edition and duplicate content

- Change the opening edition and closing scope statement to **v0.35.12, 11 October 2026**.
- Retain the playtest disclaimer.
- Remove the duplicated profession introduction and duplicated **What your profession grants** heading. Keep the more detailed paragraph specifying that Specialty Crafting scales with Crafting proficiency and does not stack with the profession circumstance bonus.
- Remove the sentence saying batch consumables, ammunition and revised teamwork are awaiting release.
- Refresh the table of contents after inserting the new sections below.

## Professions table

Update the existing rows without changing the table style:

| Profession | Examples of the trade | Current Workbench role |
|---|---|---|
| Alchemy | Potions, oils, elixirs, alchemical bombs and firearm propellant | Required lead for potion, oil, elixir and bomb recipes; supports propellant |
| Glassmaking | Vials, bottles, lenses and glass containers | Optional named container support for potion, oil, elixir and bomb recipes |
| Bookmaking | Books, bindings, writing surfaces and spell scrolls | Required lead for scroll crafting; broad equipment recipes remain available |
| Enchanting | Spell focuses, property runes and scroll inscription | Adds property runes; optional named support for scroll crafting |

## Replace the teamwork time rule

Filling the lead role and every named support role shown by the recipe grants a 1.25 work rate, or 25% more progress. The lead can craft alone where support is optional. Generic assistants do not replace named roles for this benefit. Every additional eligible artisan still gives +1 to Work Block rolls, up to +5. Existing projects may retain the teamwork calculation recorded when they were created.

Update the worked example: its 1.25 multiplier applies only when all named roles are filled, not merely because three people participate. Keep the applicable teamwork roll bonus separate from circumstance bonuses.

## Add batch consumables

Craft one to four identical potions, oils, elixirs or alchemical bombs in a batch. Select the actual level variant you want. Higher-tier materials do not upgrade a lower-level variant. Each item requires one Herbs or Mushrooms unit and one Stone unit for glass container stock; magical recipes also require one Mana Gem. Container stock follows the Core Tier minus two minimum, with a minimum of Tier 1. All resource costs multiply by quantity. Base work is two days for the batch before teamwork, and equipment size does not increase these costs. Alchemy leads; Glassmaking is the named optional support.

| Item level | Minimum material tier |
|---|---|
| 0–1 | 1 |
| 2–4 | 2 |
| 5–8 | 3 |
| 9–12 | 4 |
| 13–16 | 5 |
| 17–20 | 6 |

Native bomb damage, splash damage, persistent damage and elixir effects are retained. Bombs do not gain weapon material attack bonuses or property-rune slots. Consumables can earn Crafting Edges; without a compatible equipment Masterstroke, Masterstroke Opportunity becomes Accelerated Work.

## Add ammunition batches

Choose one to four batches of ten identical projectiles, producing 10–40 arrows, bolts, firearm rounds, sling ammunition or blowgun darts. Mundane ammunition uses Tier 1 materials. Magical ammunition uses the item-level tier table above and adds one Mana Gem per projectile. Base work remains the same as one batch.

| Ammunition | Physical materials per ten |
|---|---|
| Arrows, bolts and blowgun darts | 1 Wood and 1 Metal |
| Firearm rounds | 1 Metal and 1 Herbs or Mushrooms |
| Sling ammunition | 1 Stone or Metal |

The selected Core material determines the lead profession; named support roles determine the teamwork rate. Magazines, batteries and tanks are not included.

## Add spell scroll crafting

Bookmaking is the required lead and Enchanting is the optional named support. At least one participating character must know the selected spell in their spellbook or repertoire. That character must remain assigned and still know it when work is rolled and when the project completes. A spellcasting ally without a profession can occupy an assistant slot to supply a spell. No preparation or available spell slot is required, and no slot is spent.

Use the searchable spell list and its book button to read spell details. Cantrips, focus spells and rituals are excluded. Use + beside a spell to choose its scroll rank; − clears its selection. The lowest rank is the spell’s base rank, and the highest is the highest available spell rank among participating casters, capped at 10. Spending daily spell slots does not reduce this limit. The material column shows the minimum tier at base rank, and the rank chooser shows the tier for each higher rank.

Each scroll requires one Wood and one Mana Gem at the selected tier. The native scroll item level determines the tier through the table above. Craft one to four identical scrolls; costs multiply by quantity, while base work stays two days before teamwork. The finished scroll stores the chosen spell and heightened rank. Wands and charged staffs are not implemented by this workflow.

## Correct Masterstroke activation and resting

Replace the paragraph saying every limited benefit applies automatically to the first eligible roll. Passive Masterstrokes remain automatic. Player-controlled abilities such as Artisan’s Triumph must be armed from the Actions tab before their qualifying roll. Actions display the Masterstroke name, frequency, requirements and effect, with their action cost and remaining uses. Spent abilities remain visible. Daily uses refresh with Rest for the Night as well as the daily reset; encounter uses refresh with a new encounter. Uses stay with the source item.

## Update development tracker and recipe reference

- Batch consumables: **Implemented — v0.35.12**.
- Ammunition: **Implemented — v0.35.12**, for the five projectile forms listed above; exclude magazines, batteries and tanks.
- Scrolls: **Implemented — v0.35.12**.
- Alchemical items: **Partial — bombs and elixirs implemented in v0.35.12; dedicated alchemical tools remain future work**.
- Replace the old one-dose-only consumables entry and remove the obsolete total of 45 recipe groups. Add the supported batch and scroll categories to the recipe reference.
- Keep fundamental rune creation, spell-storing wands, charged staffs and unimplemented individual equipment recipes marked Partial or Proposed.

## Add a GM demonstration note

Open Wrathmaker Demo Tools and run Create Profession Example Characters. This creates eleven level-5 characters, one per core profession, using installed PF2e iconic foundations, and saves them in the Wrathmaker Profession Examples world compendium. Six are spellcasters and five are not. Assign player ownership deliberately when using them for demonstrations. Re-running the tool preserves existing examples rather than resetting them.

## Before uploading the edited document

Retain the existing typefaces, colours and table formatting. Recheck pagination, table row breaks, headings and the refreshed contents list. This release provides an update checklist rather than a replacement DOCX; the original supplied document has not been modified.
