# Changelog

## 0.6.0 — Unified Exploration and travel rosters

- Merged Wrathmaker's travel planner into PF2e's existing party Exploration tab and removed the separate Hexploration navigation tab.
- Reused PF2e's native travel/member sidebar, including its label typography and dividers, while adding compact Assigned, Used, and Remaining progress plus member Riding or Walking status.
- Preserved the party sheet's scroll position when travel setup, assignments, daily progress, or modifier choices refresh.
- Added the `Wrathmaker Travel` Actor folder with `Animals & Mounts` and `Vehicles & Transport` subfolders so travel selectors no longer show every world Actor.
- Automatically recognized world Actors named Riding Horse or Riding Drake as available mounts, even outside the travel folder.
- Changed Express Rider to Nature only and removed the selectable check field.
- Added up to six selectable Express Rider beneficiaries, including party members walking beside a cart or vehicle, and included them in the shared-Speed calculation.
- Restyled Wrathmaker section bars and the Begin Day chat card to match the native PF2e Exploration brown-and-parchment presentation.
- Migrated saved party travel plans to schema version 3 while retaining existing setup, rolls, and assignments.

## 0.5.0 — Native daily travel planning

- Rebuilt the Wrathmaker Hexploration tab to match the PF2e party sheet's native two-column layout, brown section bars, parchment rows, compact travel summary, and member sidebar.
- Added explicit party-member assignment to each daily Hexploration activity.
- Added persistent Assigned, Used, and Remaining counters, with a Used checkbox on each activity that saves immediately for shared table tracking.
- Added a New Day control that clears activity progress and the day's Express Rider result without discarding travel setup or assignments.
- Added automatic Express Rider feat detection on party members, a selectable Nature or Survival check, a GM-set DC, and a player-usable PF2e dice roll button.
- Applied a successful or critically successful Express Rider check as a 50% increase to the selected pulling creature's travel Speed for the current day, while respecting vehicle limits and walking party members.
- Defaulted Express Rider to the campaign's requested Survival check and kept Nature available for standard PF2e play.
- Added a named manual travel-Speed modifier for other feats, effects, terrain, and future house rules.
- Added assignments, progress, and Express Rider results to the shared Hexploration chat card.
- Migrated saved party travel plans to schema version 2 without changing PF2e actor source data.

## 0.4.0 — Party Hexploration travel

- Added a Hexploration tab directly to the PF2e party sheet.
- Added on-foot, self-propelled vehicle, and creature-pulled cart/vehicle travel modes.
- Added world-vehicle selection, automatic PF2e vehicle Speed reading, an optional vehicle Speed limit, and pulling-creature selection.
- Added per-party-member Riding controls so walkers, riders, and haulers all contribute correctly to one shared party travel Speed.
- Applied the shared value to the party's prepared overland travel Speed without changing any creature's combat Speed or PF2e source data.
- Added the GM Core Hexploration activity progression: 1/2 activity at Speed 10 or less, then 1, 2, 3, and 4 activities at the standard thresholds.
- Added four daily planning rows for Travel, Reconnoiter, Fortify Camp, Map the Area, Subsist, and custom activities.
- Added Save Travel Plan and Begin Day & Share buttons; the latter posts the calculated plan to chat.
- Added a Hexploration master switch to the GM control panel.
- Added rules-schema version 7 migration and public API methods for reading, calculating, and updating party travel plans.

## 0.3.1 — PF2e control-panel styling

- Reworked the control panel and material pop-outs with opaque PF2e-inspired parchment, crimson, charcoal, and gold surfaces.
- Increased the contrast of descriptions, tier summaries, labels, inputs, and action buttons in both light and dark Foundry themes.
- Removed the Advanced JSON button, its editor action, template, and in-game localization so world rules can only be changed through the friendly controls.

## 0.3.0 — In-game control panel

- Replaced the primary raw-JSON settings screen with a GM-facing Wrathmaker control panel.
- Added master switches for crafting-material rules and enhanced flanking.
- Added editable three- and four-side flanking totals plus size and oversized-creature requirements.
- Added an Edit pop-out for every material.
- Made each material's display name, enabled state, weapon/armor availability, and all six tiers editable during play.
- Made tier crafted names, custom bonuses, added prices, and PF2e rarity mappings independently configurable per material.
- Kept the complete JSON editor available as an Advanced option.
- Refreshed prepared actors and world items immediately after settings changes.
- Added rules-schema version 6 migration; existing world and item settings remain intact.

## 0.2.1 — Additive flanking

- Left ordinary two-sided flanking entirely to PF2e's normal Off-guard automation.
- Changed Wrathmaker to add no modifier at two sides, -1 AC at three sides, and -2 AC at four sides.
- Preserved the intended combined totals of -2, -3, and -4 AC.
- Kept the three- and four-side adjustments untyped so they stack with PF2e's circumstance penalty from Off-guard.
- Added rules-schema version 5 migration and validation for escalating total penalties.

## 0.2.0 — Wrathmaker

- Renamed the visible module from PF2e Crafting Material Tiers to Wrathmaker.
- Kept the existing internal module id so installed worlds retain all material and tier flags.
- Added Material and Tier controls to PF2e armor sheets.
- Added a separate untyped armor AC modifier: +0 at Tier 1 through +5 at Tier 6.
- Limited the AC modifier to equipped armor.
- Scoped weapon attack and armor AC effects by item type so they cannot affect one another.
- Added configurable tier rarity: Common, Uncommon, Rare, then Unique for Tiers 4–6.
- Applied tier rarity to prepared weapon and armor data without rewriting PF2e source rarity.
- Added automatic four-side token flanking: opposite sides impose -2 AC, three occupied sides impose -3, and four impose -4.
- Required two qualifying flankers per side when a target is more than one size category larger than those flankers.
- Applied the flanking penalty as an untyped PF2e AC modifier so it stacks with Off-guard.
- Added automatic AC refreshes after token movement and relevant actor, item, and combatant changes.
- Added configurable flanking thresholds and penalties to the validated world rules.
- Added rules-schema version 4 migration for existing configurations.

## 0.1.3

- Added the supplied tier names for metal and wood.
- Added Common, Uncommon, Rare, Epic, Legendary, and Mythical tier names for stone, leather/hide, dragon scales, herbs/mushrooms, and mana crystals.
- Replaced the temporary tier prices with 0, 10, 25, 100, 1,000, and 5,000 gp.
- Tier dropdown options now show both tier number and the selected material's tier name.
- Updated the prepared name and price automatically when either selection changes.
- Added rules-schema version 3 migration while preserving existing custom per-material overrides.

## 0.1.2

- Moved Material and Tier directly below Quantity, before Hands, Bulk, Size, and Price.
- Matched both added select controls to PF2e's native physical-item select width.
- Added prepared tier names in rune-aware order, such as `+1 Striking Tier 2 Bastard Sword`.
- Added configurable placeholder tier prices from 1 gp at Tier 1 through 6 gp at Tier 6.
- Added optional per-material tier-name and tier-price overrides for future named materials.
- Kept generated names and added prices ephemeral; PF2e source names, base prices, materials, and runes are not rewritten.
- Added automatic migration of version 1 rules configuration to version 2.

## 0.1.1

- Replaced the large Crafting Material panel with two compact native-style rows beneath the physical item fields.
- Item sheets now show only Material and Tier.
- Removed the per-item enable toggle, bonus override, hints, and summary panel.
- Existing version 1 flags remain readable; their former enable and override properties are ignored.

## 0.1.0

- Initial material-tier data model, PF2e rule-element bridge, item controls, GM rules editor, and public API.
