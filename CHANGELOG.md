# Changelog

## 0.17.0 — player Workbench (2026-09-04)

- Added a separate PF2e-styled Craft/Gather/Projects Workbench available from the party sheet, Items Directory, and Module Settings.
- Added broad Recipe Material Matrix bands for weapons, shields, armor, and spell focuses, with base-item category validation and mixed-tier structural components.
- Added persistent crafting projects on the PF2e party actor with exact Party Stash stack reservations that cannot be double-booked by another active project.
- Added 1–5 artisan-day Crafting Work Blocks using Wrathmaker's critical-success, success, failure, and critical-failure Progress rules.
- Added GM-authoritative final completion with a live reservation recheck, a Party Stash transaction lock, exact before/after resource quantities, real PF2e item creation, Core and maker provenance, and inventory rollback on failure.
- Added cancellation that releases all unconsumed reservations and completed-project history for the party.

## 0.16.0 — unified settings and configurable profession specialties

- Renamed the enhanced flanking AC breakdowns to `Outnumbered (Flanked)` at three combatants and `Surrounded (Flanked)` at four or more combatants so they read naturally beside PF2e's `Off-Guard (Flanked)` label.
- Restyled the Game Settings window with the party sheet's green textured masthead, gray section bars, parchment surfaces, crimson accents, and gold controls.
- Shortened the settings copy and compacted the feature controls for quicker use during play.
- Made Wrathmaker flanking a permanent world rule and removed its toggle and numeric options from the control panel; legacy settings migrate to the canonical -2/-3/-4 rule and oversized thresholds.
- Added a Professions & Specialties section with an editor for all three specialty names and descriptions on each of the eleven professions.
- Applied edited specialty details to the profession picker and synchronized specialty feats and Lore entries on existing characters.
- Migrated world rules to schema version 14 while preserving existing crafting, gathering, Hexploration, and material settings.

## 0.15.1 — PF2e 7.3.1 enhanced-flanking fix

- Fixed enhanced flanking modifiers being discarded during PF2e 7.3.1 Armor Class preparation because AC synthetic factories do not receive the eventual attack test options.
- Moved the melee and active-flanking restrictions onto the PF2e modifier predicate so the final -3 or -4 circumstance penalty is evaluated in the contextual attack roll while ranged attacks remain excluded.

## 0.15.0 — native profession feat trees and rebuilt flanking

- Restyled the profession picker with the PF2e party sheet's green textured masthead, brown framing, parchment surfaces, crimson headings, and gold controls.
- Added a dedicated **Profession Feats** section to the character Feats tab.
- Linked each selected profession to its Wrathmaker-created specialties, Additional Lore, Specialty Crafting, and determined bonus feat using PF2e's native nested item-grant hierarchy.
- Kept managed Lore skills in the Lore list and left independently owned feats in their normal PF2e sections.
- Rebuilt Wrathmaker flanking detection around a required opposite-side melee pair while preserving PF2e's normal two-person Off-guard behavior.
- Applied final contextual circumstance penalties of -3 with three qualifying melee combatants and -4 with four or more, without double-stacking the ordinary -2 Off-guard penalty.
- Doubled only the enhanced thresholds against targets more than one size category larger than the largest qualifying flanker, requiring six combatants for -3 and eight for -4 while retaining ordinary two-person Off-guard.
- Restricted all enhanced flanking benefits to melee attacks that can currently reach the target, including reach weapons, and excluded ranged attacks.
- Updated PF2e actor and token integration so the flanking bridge patches the concrete creature document classes and native token flanking method.

## 0.14.0 — profession progression and development

- Changed automatic profession Lore progression to trained at level 1, expert at level 3, master at level 7, and legendary at level 15.
- Removed the redundant “Lore” suffix from the managed profession skill names while preserving the underlying PF2e Lore item type.
- Added level 4, 10, and 16 profession-development choices: a character can select a specialty of their starting profession or learn a different new profession at each milestone.
- Added managed specialty Lore skills that follow the same 1/3/7/15 progression as their parent profession.
- Added support for multiple active milestone professions and their complete Wrathmaker benefits without replacing the starting profession.
- Increased picker card spacing and allowed detail text to wrap so profession descriptions no longer overlap.
- Added bundled matching profession artwork for Alchemy, Pottery, and Tailoring.

## 0.13.0 — character professions

- Added a native-style **Profession** field beside Deity on the PF2e character overview.
- Added a **Wrathmaker Professions** compendium with Blacksmithing, Alchemy, Enchanting, Leatherwork, Carpentry, Stonemasonry, Glassmaking, Pottery, Weaving, Bookmaking, and Tailoring.
- Added a player-facing profession picker that reads the compendium-backed definitions and allows one active profession per character.
- Added an automatically managed profession Lore skill that is trained at level 1, expert at level 4, master at level 10, and legendary at level 16.
- Added visible PF2e Additional Lore and Specialty Crafting feat grants for every profession, including a custom Enchanting specialty.
- Added Quick Repair for Blacksmithing, Alchemical Crafting for Alchemy, Magical Crafting for Enchanting, Experienced Tracker for Leatherwork, and Hefty Hauler for Carpentry.
- Reserved three named placeholder specialty records on every profession for later campaign definitions.
- Added a +2 circumstance bonus framework for relevant profession checks and connected current material-gathering checks to it.
- Added profession helpers to the public API and grouped the new compendium under **Pathfinder 2E Wrathmaker**.

## 0.12.0 — Kingmaker-aware gathering and party-stash rewards

- Restyled the gathering window with Wrathmaker's shared PF2e party-sheet palette: gray `#605856`, red `#5E0000`, soft parchment `#E7D9CF`, and yellow `#E9D7A1`.
- Added explicit dark text colors to gathering statistics, descriptions, controls, yields, and results so values remain readable under PF2e and Foundry themes.
- Added optional active Scene/Region integration for Kingmaker and other Hexploration maps.
- Read PF2e Region Environment behaviors to restrict gathering resources by the selected character's current terrain.
- Parsed level labels from Foundry Region or Scene names and mapped levels 1/4/8/12/16/20 to gathering Tiers 1–6.
- Kept the GM's active environment and maximum tier as a safe fallback for maps without compatible region metadata.
- Added each resource tier to the task dropdown label.
- Added a world setting for reward destination, defaulting to the native PF2e Party Stash with Gathering Character as the alternative.
- Added party membership and edit-permission checks before awarding or stacking resources.
- Migrated world rules to schema version 13 while preserving existing gathering settings.

## 0.11.0 — Crafting resources, recipes, and gathering

- Added a player-facing **Gather Resources** application inspired by established Foundry gathering workflows without requiring another module.
- Added Forest, Plains, Mountains, Wetlands, Underground, Arcane Nexus, and Dragon Hunting Grounds environments.
- Added a GM-controlled active environment; players see only that environment while GMs can inspect them all.
- Added a GM-controlled maximum resource tier, defaulting to Tier 1, so higher-tier tasks can be revealed as the campaign advances.
- Added one validated gathering task for every one of the 66 Wrathmaker resource items.
- Added PF2e Crafting, Nature, Survival, and Arcana checks using each resource tier's level-based DC.
- Added configurable per-outcome bundle yields, defaulting to one bundle on Success and two on Critical Success.
- Added automatic, permission-checked resource awards that merge matching stacks by Wrathmaker flags rather than displayed item name.
- Added a PF2e-styled gathering result card to chat and a gathering toggle to the Wrathmaker Game Settings screen.
- Added public API access for environments, tasks, validation, previews, outcome resolution, and opening the gathering screen.
- Migrated world rules to schema version 12 with gathering enabled by default.
- Added a **Wrathmaker Crafting Resources** compendium with 66 stackable PF2e Treasure items.
- Added one inventory resource for all six Metal, Wood, Stone, Leather/Hide, Herbs/Mushrooms, and Mana Crystal tiers.
- Added all 30 combinations of Black, Blue, Green, Red, and White Dragon Scales across the six Dragon age tiers.
- Recorded material id, tier, resource unit, bundle size, and optional Dragon color under module flags without assigning premature prices or recipe quantities.
- Added stable PF2e category mapping for Light, Medium, and Heavy Armor; Simple, Martial, and Advanced Weapons; Shields; and Spell Focuses.
- Added public API helpers for category lookup, resource metadata, category listings, and future recipe keys.
- Kept unarmored defenses, unarmed attacks, and unrelated physical items outside the recipe-category system.
- Assigned raw-resource Levels 1, 4, 8, 12, 16, and 20 to Tiers 1–6 respectively.
- Added standard PF2e level-based crafting DCs of 15, 19, 24, 30, 35, and 40.
- Added on-the-fly PF2e difficulty adjustments from Incredibly Easy (−10) through Incredibly Hard (+10) without rewriting resource items.
- Added an independent recipe schema inspired by established Foundry crafting workflows without adding a runtime dependency.
- Added validated OR ingredient sets containing required AND groups with resource alternatives inside each group.
- Added non-destructive inventory summaries and craftability previews based on module flags and resource bundle sizes rather than displayed item names.
- Added whole-recipe allocation so one material stack cannot satisfy multiple required groups simultaneously.
- Added target-category validation, tier-based check previews, stable tool references for later use, and selected-PF2e-item result definitions.
- Added public API helpers to validate recipes, summarize resource inventories, and evaluate craftability; resource consumption and result creation remain reserved for the confirmed GM-authoritative transaction layer.

## 0.10.0 — Campaign progression and multiple Apex items

- Added independent Apex activation for all six attributes, allowing different Wrathmaker Apex items to be active at the same time.
- Reused PF2e's native circled **A** display: filled markers are active and outlined markers are available to activate.
- Kept worn and invested requirements, and limited same-attribute duplicates to the strongest active Item Boost.
- Preserved ordinary PF2e Apex handling for non-Wrathmaker items and retained the selected state of existing Wrathmaker items until first toggled.
- Added an explicit module-owned active flag so the multi-item house rule no longer depends on PF2e's single-Apex selector.
- Increased the native character Hero Point maximum from 3 to 10 without adding a session reset, allowing stored points to carry between sessions.
- Added a persistent 0–10 Nephilim Point tracker to the PF2e party header.
- Grouped all Wrathmaker compendiums under one **Pathfinder 2E Wrathmaker** folder in the Compendium Packs sidebar.
- Replaced the generic Stone, Leather/Hide, Herbs/Mushrooms, and Mana Crystal tier labels with material-specific six-tier names.
- Migrated only unchanged generic tier placeholders to the new names, preserving every individually customized GM label.
- Migrated world rules to schema version 11.

## 0.9.0 — Weapon damage and spell focuses

- Added a second weapon modifier that increases damage by twice the configured tier bonus: +2, +4, +6, +8, and +10 at Tiers 2–6.
- Kept the existing Tier 2–6 weapon attack progression at +1 through +5.
- Added Metal and Wood as default materials for a new held Spell Focus crafting category.
- Added a configurable **Spell Focus** to the **Wrathmaker Crafting Items** compendium; while held, it applies the tier bonus to all spell attacks and spell DCs.
- Added Spell Focus availability to each material's GM editor, while enabling it only for Metal and Wood by default.
- Migrated existing world rules to schema version 10 without replacing customized material names, tier bonuses, prices, rarities, or modifier types.

## 0.8.0 — Apex ability items

- Added the **Wrathmaker Apex Ability Items** compendium with 30 original worn items: five each for Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma.
- Added exact additive ability-modifier values from +1 through +5 while preserving PF2e's investment and single-selected-Apex-item workflow.
- Tagged every item with the PF2e Apex, Invested, and Magical traits plus the `item-boost` other tag.
- Added brief item descriptions, progressive item levels, and six original accessory-family illustrations.
- Kept the custom bonuses inactive unless an item is invested, selected as the active Apex item, and worn.

## 0.7.2 — Dragon Scale age tiers

- Replaced the generic Dragon Scale tier names with Hatchling, Juvenile, Youth, Adult, Ancient, and Arch Dragon.
- Migrated existing worlds that still use the default Common–Mythical scale names while preserving GM-customized scale names.
- Kept Dragon Scale resistance values, prices, rarities, colors, and damage-type mappings independently editable.
- Migrated world rules to schema version 9.

## 0.7.1 — Melee-only enhanced flanking

- Changed the extra three-/four-side AC adjustment from a blanket target penalty to an attack-contextual modifier.
- Limited the adjustment to melee attacks that can reach the target, including normal and extended-reach weapons.
- Prevented ranged attacks from receiving Wrathmaker's enhanced-flanking benefit when firing at a surrounded target.
- Matched contextual actor clones back to their active scene tokens so PF2e can evaluate the modifier during an attack.

## 0.7.0 — Dragon Scale resistance and reliable settings saves

- Changed Dragon Scales from a replacement base material into an armor-only enhancement for Metal and Leather/Hide armor.
- Added editable Black, Blue, Green, Red, and White dragon-color names with configurable PF2e resistance damage types.
- Added six editable Dragon Scale resistance values; they default to 0 until the campaign values are decided.
- Added Dragon Scale and Scale Tier controls to eligible armor sheets and generated an equipped-only PF2e Resistance rule.
- Layered Dragon Scale name, price, and rarity on top of the selected base armor material without rewriting PF2e source data.
- Fixed dotted Foundry form fields being read as missing data, which caused false blank material-name errors and disabled every Wrathmaker system after saving.
- Added an editable PF2e bonus type to ordinary material rules, defaulting to Untyped.
- Migrated rules to schema version 8 and item flags to schema version 3 while preserving existing world and item data.

## 0.6.2 — Automatic Express Rider Will DC

- Removed the manual Express Rider DC field and calculated the check DC from the highest prepared Will DC among selected pulling creatures and affected travellers.
- Invalidated the previous daily Express Rider result whenever its selected targets or their Will DCs change, preventing an old roll from being reused against a different group.
- Added a compact read-only highest-Will-DC display and disabled rolling when a selected actor has no available Will statistic.
- Replaced the Roll Nature text button with a PF2e-style d20 icon and replaced the New Day text button with a sun icon, retaining accessible labels and explanatory tooltips.
- Added the calculated Express Rider DC to the shared Begin Day chat card and migrated travel plans to schema version 4.

## 0.6.1 — Live travel summary and exact palette

- Kept PF2e's native party travel summary synchronized with the current Wrathmaker travel plan while the Exploration tab is open.
- Recalculated shared Speed, feet per minute, miles per hour, miles per day, and Hexploration activities immediately when party member, vehicle, mount, item, or effect data changes.
- Updated Assigned, Used, and Remaining readouts alongside the native summary without forcing a full party-sheet rerender or moving the user's scroll position.
- Applied the requested Hexploration palette exactly: gray `#605856`, red `#5E0000`, soft parchment `#E7D9CF`, and yellow `#E9D7A1`.

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
