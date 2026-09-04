# Wrathmaker

A Foundry VTT module for custom Pathfinder 2e house rules. It adds character professions, material and tier controls to PF2e weapons, armor, and crafted spell focuses, tiered crafting resources and resource gathering, custom Apex ability-boost items, campaign Hero and Nephilim Points, escalating multi-side flanking penalties, and shared vehicle-aware Hexploration travel. A GM-facing control panel manages the configurable systems during play.

## Compatibility

- Foundry VTT 13 and 14
- Pathfinder Second Edition 7.1 or newer
- Material-tier item support: weapons, armor, and held spell focuses
- Stackable tiered resources for every material, including color-specific Dragon Scales
- PF2e skill-based gathering with GM-controlled environments and tier availability
- A three-tab player Workbench with recipe selection, Party Stash reservations, downtime Work Blocks, and confirmed completion
- Eleven compendium-backed character professions with automatic Lore progression and feat grants
- Thirty worn Apex ability items with exact +1 through +5 modifier increases
- Persistent Hero Points up to 10 and party-level Nephilim Points up to 10
- Automatic token-based custom flanking
- Party-sheet Hexploration, vehicles, haulers, riders, daily assignments, progress tracking, and travel-feat checks
- In-game world settings and per-material tier editors
- Extensible through world configuration and a public module API

The visible module name is **Wrathmaker**. Its internal id remains `pf2e-crafting-material-tiers` so existing worlds keep their saved settings and item selections during the rename.

## Installation

### Install from Foundry

1. Open Foundry's **Add-on Modules** screen and choose **Install Module**.
2. Paste this Manifest URL:

   ```text
   https://github.com/HittBoyy123/Foundry-Module/releases/latest/download/module.json
   ```

3. Select **Install**, then enable **Wrathmaker** in the world's Manage Modules screen.
4. Open a supported weapon, armor, or Wrathmaker Spell Focus sheet and choose **Material** and **Tier** directly below **Quantity**.

This same link lets Foundry detect future Wrathmaker releases automatically.

### Manual installation

Download `wrathmaker-v0.18.0.zip` from the latest GitHub release and extract its contents into a folder named `pf2e-crafting-material-tiers` under Foundry's `Data/modules` folder. Restart Foundry and enable **Wrathmaker**.

The GM settings panel is under **Configure Settings → Module Settings → Wrathmaker → Open Control Panel**.

## Apex ability items

The **Wrathmaker Apex Ability Items** compendium contains 30 original worn equipment items: five each for Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma. Their Item Boost values range from +1 to +5. Belts represent Strength, rings Dexterity, amulets Constitution, circlets Intelligence, sashes Wisdom, and brooches Charisma; none of the collection uses armor, weapons, or boots.

Every item carries PF2e's **Apex**, **Invested**, and **Magical** traits and the `item-boost` other tag. Once a Wrathmaker item is invested and worn, the character sheet shows PF2e's familiar circled **A** beside its attribute. Click each **A** independently to activate Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma items together. A filled **A** is active and an outlined **A** is available.

Wrathmaker applies the exact additive modifier from the active item. Different attributes stack; if several active items affect the same attribute, only the strongest one applies. Dropping or uninvesting an item suspends its bonus until it is worn and invested again. Existing v0.8/v0.9 items retain their previous selected state until their **A** is first toggled.

The collection uses five progressive item levels—1, 5, 9, 13, and 17—but deliberately has no purchase prices so the GM can award and value these campaign-specific items as needed.

## Character professions

Every PF2e character sheet gains a native-style **Profession** field beside **Deity**. Its search or menu button opens the Wrathmaker profession picker, which reads the **Wrathmaker Professions** compendium and manages the character's starting profession and later profession-development choices. The sheet field shows the starting profession plus a count when additional professions are active.

The picker uses the PF2e party sheet's green textured masthead, brown framing, parchment surfaces, crimson headings, and gold controls. On the character's Feats tab, Wrathmaker adds a dedicated **Profession Feats** section. Each selected profession is the parent entry, with its profession-created specialty choices, Additional Lore, Specialty Crafting, and determined bonus feat nested underneath using PF2e's native item-grant hierarchy. The actual Lore skill remains in the Lore list, and feats the character owned independently are left in their normal section.

The available professions are **Blacksmithing, Alchemy, Enchanting, Leatherwork, Carpentry, Stonemasonry, Glassmaking, Pottery, Weaving, Bookmaking,** and **Tailoring**. Their 33 specialisations now carry their Notion-guide names, summaries, associated Lore, and descriptive **Signature**, **Mastery**, and **Legacy** stages. These stages deliberately contain no unresolved numerical benefits yet.

Selecting a profession creates normal PF2e items on the character:

- A visible profession feat containing the profession's relevant-check automation.
- A plainly named profession Lore skill—such as **Blacksmithing** or **Enchanting**, without a redundant “Lore” suffix—and the **Additional Lore** feat.
- **Specialty Crafting** preselected for that profession. Enchanting uses a Wrathmaker specialty because Enchanting is not one of PF2e's standard Specialty Crafting choices.
- The determined additional feat: **Quick Repair** for Blacksmithing, **Alchemical Crafting** for Alchemy, **Magical Crafting** for Enchanting, **Experienced Tracker** for Leatherwork, and **Hefty Hauler** for Carpentry. The remaining profession feats stay marked *To be determined*.

Profession Lore advances automatically from **trained at level 1**, to **expert at level 3**, **master at level 7**, and **legendary at level 15**. Wrathmaker updates only the Lore items it created and preserves unrelated Lore skills and feats.

At character levels **4, 10, and 16**, the picker unlocks one profession-development choice. Each choice can be either one of the three specialties belonging to the starting profession or a different new profession. New professions receive their normal Wrathmaker Lore, Specialty Crafting, and determined bonus-feat package. A specialty creates its own visible Lore skill and uses the same 1/3/7/15 proficiency progression as its parent profession. Duplicate professions and duplicate specialties are rejected.

Relevant profession checks receive a **+2 circumstance bonus**. The current gathering mappings are Metal → Blacksmithing, Herbs/Mushrooms → Alchemy, Mana Crystals → Enchanting, Leather/Dragon Scales → Leatherwork, Wood → Carpentry, and Stone → Stonemasonry. Glassmaking, Pottery, Weaving, Bookmaking, and Tailoring are ready for their future resource and recipe categories. PF2e's ordinary Specialty Crafting bonus remains a circumstance bonus, so it does not double-stack with the profession bonus on the same check.

Alchemy, Pottery, and Tailoring use bundled Wrathmaker artwork so their picker and compendium entries remain available even when a Foundry installation lacks the referenced core icon path.

## Campaign points

Character Hero Points use PF2e's normal header control with a maximum of **10** instead of 3. Their value is stored on the character normally and Wrathmaker does not perform a session reset, so unspent Hero Points carry into later sessions.

Every PF2e party sheet also displays **Nephilim Points** in its native green header. The tracker has 10 pips, persists on that party actor, and can be set from 0 through 10 by a user who can edit the party. Clicking an empty pip sets the total to that value; clicking the highest filled pip removes one, and right-clicking the tracker also removes one.

## Compendium organization

Foundry groups every module compendium under **Pathfinder 2E Wrathmaker** in the Compendium Packs sidebar. The folder contains the Apex Ability Items, Crafting Items, Crafting Resources, and Professions packs and is the parent for future Wrathmaker packs.

## In-game control panel

The Wrathmaker control panel stores world-level settings and applies changes immediately to prepared actors and items.

- **Crafting material rules** turns all material and tier controls, names, prices, rarities, and bonuses on or off without deleting item selections.
- **Resource gathering** enables the player gathering screen, defaults rewards to the native PF2e party Stash, and can read the current Stolen Lands Scene Region's terrain and level. The GM's active environment and maximum tier remain the fallback.
- **Hexploration travel** turns Wrathmaker's additions to the native party **Exploration** tab and shared prepared travel Speed on or off.
- **Professions & Specialties** lists all eleven professions. Each **Edit** pop-out changes its three specialisation names, overview, associated Lore, and Signature/Mastery/Legacy descriptions; the picker and managed character entries update from the world configuration.
- Every crafting material has an **Edit** button that opens its own pop-out.
- The material pop-out edits the material name, enabled state, weapon/armor/spell-focus availability, PF2e bonus type, and all six tier names, bonuses, added prices, and PF2e rarities.
- Dragon Scales use a specialized editor for dragon-color names, resistance damage types, and six editable resistance values.
- The complete configuration is presented through named fields and material pop-outs; no raw-code or JSON editor is exposed in-game.

Wrathmaker's flanking rule is permanently enabled and no longer appears as a configurable control. Only a GM can open this world-settings menu. Turning an optional system off is reversible and does not remove saved item flags or custom definitions.

## Publishing a new version

1. Update the version in `module.json` and `package.json`.
2. Commit and push the changes.
3. Create and push a matching tag such as `v0.14.0`.

The included GitHub Actions workflow validates the module, builds a Foundry-ready ZIP, and publishes both the ZIP and `module.json` to a GitHub Release. The tag must match the version in `module.json`.

## Default rules

Wrathmaker items have three independent layers: the ordinary **PF2e base item**, one **Core Material**, and zero or more **Artisan Marks**. The Core replaces fundamental, property, resilient, striking, and reinforcing-style rune progression on that prepared item; the original PF2e source fields remain untouched.

| Core Tier | Weapon attack | Extra weapon dice | Spell attack / DC | Armor AC / saves | Artisan Capacity | Resource Unit value |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | +0 | 0 | +0 | +0 | 1 | 3 gp |
| 2 | +1 | 1 | +1 | +1 | 2 | 15 gp |
| 3 | +2 | 2 | +2 | +2 | 3 | 85 gp |
| 4 | +3 | 2 | +3 | +3 | 4 | 350 gp |
| 5 | +4 | 3 | +4 | +4 | 6 | 1,600 gp |
| 6 | +5 | 4 | +5 | +5 | 8 | 11,000 gp |

Shields use the same Core progression as a durability multiplier: each progression step adds **3 Hardness** and **30 HP**, after which Broken Threshold is recalculated.

| Tier | Metal | Wood | Stone | Leather / Hide | Herbs / Mushrooms | Mana Crystals |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Iron | Softwood | Fieldstone | Rawhide | Greenleaf | Faint Mana Crystal |
| 2 | Steel | Hardwood | Granite | Hardened Leather | Embercap | Charged Mana Crystal |
| 3 | Cold Iron | Blackwood | Obsidian | Ironhide | Ghostmoss | Resonant Mana Crystal |
| 4 | Mithril | Darkmoon | Runestone | Moonhide | Moonbloom | Arcane Prism |
| 5 | Adamantium | Starwood | Celestite | Titanhide | Starspore | Astral Crystal |
| 6 | Dark Iron | Godwood | Worldstone | Primordial Hide | Worldroot | Aetherheart Crystal |

Metal, wood, stone, leather/hide, herbs/mushrooms, and mana crystals are available as configurable Core Materials for weapons, armor, and shields; Metal and Wood are also available for spell focuses. A weapon receives its Core attack modifier and extra damage dice. Equipped armor receives the Core modifier to AC and all three saves. The default modifier type is **untyped**, and the GM can change flat Core modifiers to item, status, or circumstance in the material editor without changing the module code.

Wrathmaker includes all **253 Artisan Marks** from the campaign guide: five universal Marks for each of the eleven professions and six specialist Marks for each of the 33 specialisations. Minor, Standard, Major, and Superior Marks cost **0, 1, 2, and 3 Capacity**, require Anchors of at least **Tier 1, 2, 3, and 4**, and add their configured specialist stock and artisan-days to the project. Required structural secondary components remain no lower than **Core Tier − 2**.

## Crafting resources and recipe categories

The **Wrathmaker Crafting Resources** compendium contains stackable PF2e Treasure items that the GM can award immediately:

- Six Metal Ingots, Wood Lumber resources, Stone Blocks, Leather/Hide Sheets, Herb/Mushroom Bundles, and Mana Crystal bundles—one for every configured tier.
- Thirty Dragon Scale lots covering all six age tiers in Black, Blue, Green, Red, and White.
- Mana Crystals and Dragon Scales retain their physical lot names, while each inventory quantity consistently represents one Wrathmaker **Resource Unit**.

That is **66 resource items** in total. Each Resource Unit has **0.2 Bulk**, so five units make 1 Bulk, and each carries the current playtest per-unit value shown in the Core table. Material family, Tier, tags, optional Dragon color, effects, eligibility, and future specialisation hooks are stored under Wrathmaker flags, so recipes remain reliable if displayed names are customized.

Every raw resource also has a PF2e item level and a standard level-based crafting DC:

| Resource tier | Item level | Base crafting DC |
| ---: | ---: | ---: |
| 1 | 1 | 15 |
| 2 | 4 | 19 |
| 3 | 8 | 24 |
| 4 | 12 | 30 |
| 5 | 16 | 35 |
| 6 | 20 | 40 |

The base DC is not increased automatically by the item's displayed rarity. When a check is made, the GM can instead select PF2e's normal difficulty adjustment: Incredibly Easy −10, Very Easy −5, Easy −2, Normal ±0, Hard +2, Very Hard +5, or Incredibly Hard +10. This keeps the tier progression predictable while allowing situational difficulty to be decided at the table without editing the material item.

Wrathmaker also provides stable category ids for future category-wide resource costs:

| PF2e item | Wrathmaker recipe category |
| --- | --- |
| Light armor | `armor.light` |
| Medium armor | `armor.medium` |
| Heavy armor | `armor.heavy` |
| Simple weapon | `weapon.simple` |
| Martial weapon | `weapon.martial` |
| Advanced weapon | `weapon.advanced` |
| Shield | `shield` |
| Spell Focus | `spell-focus` |

PF2e's own `system.category` field performs the armor and weapon classification, so every heavy armor automatically shares the `armor.heavy` cost group without maintaining a separate list of item names. Unarmored defenses, unarmed attacks, ordinary equipment, consumables, and unrelated treasure are intentionally excluded. Future recipe records can use keys such as `armor.heavy:metal:tier-4`; only the resource quantity for that category needs to be supplied when the campaign's costs are decided.

### Recipe foundation

Wrathmaker keeps its crafting implementation independent, but follows the proven workflow used by Fabricate and other Foundry crafting modules: recipe definitions are separate from inventory items, requirements are checked before anything is consumed, and the final result remains a real PF2e item rather than a module-specific substitute.

A recipe selects one supported PF2e category and one material tier. Its ingredients are arranged as:

1. **Ingredient sets (OR):** any complete set may satisfy the recipe.
2. **Groups within a set (AND):** every group in the selected set is required.
3. **Resource options within a group (OR):** one allowed material option satisfies that group.

For example, Heavy Armor might require `6 Steel Ingots` **and** either `2 Leather Sheets` **or** `2 Hardwood Lumber`. The allocator considers the whole recipe before declaring it craftable, so a single inventory stack cannot be reused to satisfy two separate groups.

Resource matching uses the material, tier, Dragon color, and bundle-size data stored under Wrathmaker flags. Renaming `Steel Ingot` on its PF2e item sheet therefore does not break a recipe. Recipe validation rejects missing groups, unknown categories, invalid tiers, and incomplete quantities before the recipe is made available to players.

The public API exposes both the non-destructive recipe preview and the persistent project model. It can validate recipes and Make & Marks state, summarize resource inventories, calculate tier DCs, reserve exact Party Stash stacks without removing them, advance 1–5 day Work Blocks, revalidate live stock, and build an auditable final consumption plan.

### Player Workbench

Open **Wrathmaker Workbench** from the Items Directory header or its Module Settings entry. Its three tabs follow the campaign guide:

- **Craft** accepts a dragged PF2e weapon, armor, shield, or Wrathmaker Spell Focus. Choose its broad recipe, Core Material, and Core Tier, then drag in any participating PCs or NPCs. Each contributor exposes only the universal and specialisation Marks they know which can apply to the current item. Choose a Lead Artisan for the Crafting checks; the live preview spends Capacity immediately, selects a valid component Anchor, adds specialist stock and labour, and subtracts stock already reserved by another active project.
- **Gather** opens the existing region-aware gathering screen; there is no second Wrathmaker inventory.
- **Projects** tracks status, progress, artisan-days, exact reserved stacks, and the project history for the selected PF2e party.

Creating a project reserves the exact source stacks but leaves their quantities visibly present in the native Party Stash. Those reserved quantities cannot satisfy another project. Cancelling releases unconsumed reservations. A Lead Artisan advances the project by rolling Crafting after committing a **1–5 day Work Block**: Critical Success produces 150% Progress rounded up, Success 100%, Failure 50% rounded down (minimum 1 when at least 2 days were worked), and Critical Failure 0.

When the required Progress is complete, **Complete Project** opens a final confirmation listing every Party Stash quantity before and after consumption. Wrathmaker sends a player's confirmation to one active GM, locks that Party Stash against overlapping completions, and checks the live stacks again; changed, missing, or renamed resource data blocks completion. Once confirmed, the materials are updated, a real PF2e item is created in the party's existing Stash with its Core, contributors, Marks, Anchors, effect text, effective Tier, and maker provenance, and the project becomes read-only history. The completed item's sheet exposes these rules under **Applied Artisan Marks**. If item creation or project saving fails, the inventory update is rolled back. An active GM must therefore be connected when a player completes a project.

Broad recipes currently cover the campaign guide's weapon groups, shield chassis, light/medium/heavy armor constructions, and spell-focus forms. Required structural secondaries accept material from **Core Tier − 2** through the Core Tier, while the Core itself must match the selected Tier exactly.

### Gathering resources

Wrathmaker includes an independent, Fabricate-inspired gathering screen for all 66 crafting resources. Players can open **Gather Resources** from the Items Directory header or from Wrathmaker's settings entry, then choose an owned character and visible resource task. Every task option ends with its tier, such as `Gather Steel Ingot — Tier 2`, for quick comparison in the native dropdown.

By default, **Use current Stolen Lands / Scene region** is enabled. Wrathmaker checks which Foundry Region contains the selected character's token and reads PF2e's Environment behavior from that Region. A Forest region offers Wood, Leather/Hide, and Herbs/Mushrooms; Mountain terrain offers Metal and Stone; Swamp terrain uses Wetlands; and PF2e's Plains and Underground terrain map directly to their gathering environments. If the map uses environment data on the Scene instead of a containing Region, the Scene is used as the fallback.

The location's level sets the highest available resource tier using the existing campaign thresholds: levels 1, 4, 8, 12, 16, and 20 unlock Tiers 1–6. Wrathmaker recognises a level in a Scene or Region name such as `Narlmarches — Level 8` or `Kamelands Lv. 4`. A GM can therefore use the Kingmaker map's own locations by applying the appropriate PF2e Environment behavior and adding the noted level to the Region name. When the current map has no compatible Region, environment, or level metadata, the **Active gathering environment** and **Maximum available resource tier** settings continue to control availability exactly as before.

Gathering rewards default to **Party Stash**. Wrathmaker finds the PF2e party containing the selected character and adds or merges the resource on that party actor, so it appears in the native **Stash** tab for everyone. The GM can change **Gathered resource destination** to **Gathering Character** in Wrathmaker Game Settings. If Party Stash is selected but the character has not been added to a PF2e party, the gathering button is disabled with a visible explanation instead of silently putting the reward somewhere else.

The supplied environments are **Forest, Plains, Mountains, Wetlands, Underground, Arcane Nexus,** and **Dragon Hunting Grounds**. Environments compose reusable tasks rather than containing copied reward items. This means one task definition can be offered in several suitable environments while its reward continues to point to the stable material, tier, and Dragon-color flags in the resource compendium.

Default PF2e checks are:

| Resource | Skill |
| --- | --- |
| Metal and Stone | Crafting |
| Wood and Herbs/Mushrooms | Nature |
| Leather/Hide and Dragon Scales | Survival |
| Mana Crystals | Arcana |

The check uses the resource's existing tier level and DC. A **Success** awards five Resource Units and a **Critical Success** awards ten; Failure and Critical Failure award nothing. The party makes one shared gathering result rather than multiplying the yield per participant. Awarded resources merge into an identical stack in the configured destination or create the correct PF2e Treasure item when no stack exists.

Each task currently displays a default attempt time of 60 minutes, but Wrathmaker does not advance world time automatically. Task records already keep their skill, DC adjustment, time, outcome quantities, environments, and future tool references separate so a later GM editor can change these without rewriting the gathering code. Stamina, finite resource nodes, weather gates, random events, and blind gathering are not enforced in this first gathering pass.

## Crafted spell focus

The **Wrathmaker Crafting Items** compendium contains one reusable **Spell Focus** equipment item. Drag it to a spellcaster, hold it in one hand, and choose Metal or Wood plus a Tier on its item sheet. Its prepared name becomes the selected material name followed by “Spell Focus,” such as `Steel Spell Focus` or `Starwood Spell Focus`.

While held, the focus adds the tier bonus to every spell attack and spell DC on the character: +0 at Tier 1, then +1 through +5 at Tiers 2–6. It does not change spell damage, spell slots, traditions, or proficiency ranks. Putting it away removes the modifiers during normal PF2e actor preparation, and if more than one focus is held only the strongest applies. Only Metal and Wood support focuses by default, but the GM can enable or disable the Spell Focus category independently in each material editor.

Dragon Scales are an armor-only enhancement rather than a replacement Core. Metal and Leather/Hide armor sheets gain Dragon Scale and Scale Tier controls. Their default age tiers are **Hatchling, Juvenile, Youth, Adult, Ancient, and Arch Dragon**; the GM can still rename every tier. Black, Blue, Green, Red, and White scales default to acid, electricity, poison, fire, and cold resistance respectively. Their default resistance progression is **1, 4, 8, 12, 16, and 20**, and every value and damage type remains editable. A configured resistance is generated only while the armor is equipped, without changing the armor's PF2e source rules.

Tier 1 creates no zero-value rule element, keeping roll breakdowns uncluttered. Selecting either field saves both choices and activates the configured tier rule for that item.

On configured items, Wrathmaker suppresses PF2e rune progression in prepared data and builds the display name from the source base item plus its Core, such as `Steel Bastard Sword`. The item sheet adds a compact **Make & Marks** strip showing Core, Mark count, and used/maximum Capacity. Committed Resource Units contribute their current playtest value, and the Core Tier supplies PF2e rarity. The original rune, name, price, rarity, and rules source data remains unchanged if Wrathmaker is disabled.

## Custom flanking

Wrathmaker calculates flanking from creature tokens on the active scene and updates attack-context AC automatically when tokens move or relevant actor state changes.

- Two qualifying opponents must first form a normal opposite-side flank. Wrathmaker passes that result into PF2e's attack context so PF2e applies its ordinary **-2 circumstance penalty from Off-guard** and all rules that depend on the target being Off-guard.
- With three qualifying melee combatants, Wrathmaker makes the final flanking penalty **-3 AC**.
- With four or more qualifying melee combatants, Wrathmaker caps the final flanking penalty at **-4 AC**.
- A third or fourth combatant can contribute from any reachable side once the original opposite-side pair has established the flank.
- Two adjacent combatants alone do not flank; the initial pair must surround the target on north/south or east/west sides.
- If the target is more than one size category larger than the largest qualifying flanker, the enhanced thresholds are doubled: six combatants are required for **-3 AC** and eight for **-4 AC**. Ordinary two-person Off-guard still works normally.
- A qualifying flanker must be opposed to the target, able to attack and flank under PF2e's prepared data, and have melee reach to the target.
- A target that PF2e marks as unflankable or immune to Off-guard receives no Wrathmaker flanking penalty.
- The three-/four-combatant result is evaluated for each attack. It applies only to a melee attack that can currently reach the target, including a qualifying reach weapon; ranged attacks never inherit the penalty, even when the target is surrounded.

Wrathmaker replaces token flanking detection while the rule is enabled, then hands the result back through PF2e's normal attack context so Off-guard, Sneak Attack, and similar downstream rules still work. At the enhanced thresholds, Wrathmaker supplies the **full -3 or -4 attack-contextual circumstance penalty**. PF2e's modifier stacking keeps the more severe circumstance penalty instead of adding both values, so the result cannot become -5 or -6 and is not stored as a blanket reduction on the enemy. The AC breakdown labels the three-combatant state `Outnumbered (Flanked)` and the four-or-more-combatant state `Surrounded (Flanked)`.

The default configuration is:

```json
{
  "flanking": {
    "enabled": true,
    "penalties": { "2": -2, "3": -3, "4": -4 },
    "maxNormalSizeDifference": 1,
    "oversizedParticipantsPerSide": 2,
    "requireOppositeSidesForTwo": true,
    "pf2eHandlesTwoSidedFlanking": true,
    "stackWithOffGuard": true
  }
}
```

The `penalties` values are the intended final circumstance penalties. `oversizedParticipantsPerSide` is retained as the stored setting name for compatibility, but now acts as the enhancement-threshold multiplier: its default of 2 changes the three-/four-combatant thresholds to six/eight when the target is oversized. The legacy `pf2eHandlesTwoSidedFlanking` and `stackWithOffGuard` fields remain readable so existing world settings migrate cleanly; the resolver always preserves PF2e's normal two-person Off-guard and uses modifier stacking for the enhanced total.

## Hexploration travel

Open a PF2e party sheet and select its existing **Exploration** tab. Wrathmaker extends that native view instead of adding a second tab. PF2e's own travel summary and member sidebar stay in place, including their typography and dividers; Wrathmaker adds travel setup, shared progress, riding status, modifiers, and the daily planner beneath the native exploration activities.

- **On foot** uses the slowest ground Speed among all party members.
- **Self-propelled vehicle** reads the selected world Vehicle actor's prepared drive Speed, falling back to the numeric Speed in its PF2e details. Party members marked **Riding** use that Speed; members left on foot can still slow the group.
- **Creature-pulled cart or vehicle** uses the slowest selected pulling creature's ground Speed. Pulling party members cannot also count as riders. An optional vehicle Speed limit can cap unusually fast haulers or supply a manual value for custom vehicle actors.
- On first GM load, Wrathmaker creates an Actor folder named **Wrathmaker Travel** with **Animals & Mounts** and **Vehicles & Transport** subfolders. Only Actors placed in the relevant folder appear in the travel selectors. World Actors named Riding Horse or Riding Drake are also recognized automatically.
- **Save Travel Plan** persists the selections to the party's Wrathmaker flags.
- **Begin Day & Share** saves the plan and posts its Speed, distance, vehicle, haulers, and chosen activities to chat.
- Each activity can be assigned to a specific party member or to the whole party. Its **Used** checkbox saves immediately so everyone sees current daily progress.
- **Assigned**, **Used**, and **Remaining** counters appear in both the travel sidebar and daily-activity header.
- The native travel summary stays live while Exploration is open, recalculating shared Speed, distance, and daily activities from the current party, transport, and travel modifiers without moving the sheet's scroll position.
- The sun-icon **New Day** control clears the Used checkboxes and the current Express Rider result while retaining the party's route setup and assignments.
- **Express Rider** can be assigned to any party member. Wrathmaker detects the feat on the selected character and rolls that character's PF2e **Nature** statistic from the compact d20 control.
- The Express Rider DC is automatic: Wrathmaker reads the Will DC of every selected pulling creature and affected traveller, then uses the highest. Changing the selected group or any of those Will DCs clears the previous result so the check can be rolled again against the current group.
- Express Rider can target up to six selected party members, including people walking alongside a vehicle. A success or critical success increases the selected mount and those travellers' relevant overland Speeds by half for the current day. A vehicle Speed limit and any unselected walkers continue to cap shared Speed normally.
- **Other travel effect or feat** supplies a named manual shared-Speed change for effects that are not yet automated.
- Wrathmaker preserves the party sheet's scroll position when a daily assignment, rider, hauler, modifier, or activity state refreshes the planner.

The daily allowance follows the Hexploration table used by PF2e:

| Shared Speed | Activities per day |
| ---: | ---: |
| 10 feet or less | 1/2 |
| 15–25 feet | 1 |
| 30–40 feet | 2 |
| 45–55 feet | 3 |
| 60 feet or more | 4 |

The four planning rows include Travel, Reconnoiter, Fortify Camp, Map the Area, Subsist, and Other. The optional note can identify a character or describe a custom activity. At Speed 10 or less, one planned activity is accepted and shown as requiring 2 days.

Wrathmaker applies the result only to the party actor's **prepared overland travel Speed**. It never rewrites the party source or any member's land, encounter, or combat Speed. Players who can update at least one member of the PF2e party can use the shared planner; other observers see it read-only.

## Data safety

Item choices are stored only here:

```json
{
  "flags": {
    "pf2e-crafting-material-tiers": {
      "schemaVersion": 4,
      "material": "metal",
      "tier": 2,
      "crafting": {
        "schemaVersion": 1,
        "core": { "materialId": "metal", "tier": 2 },
        "components": [],
        "artisanMarks": [],
        "synergies": [],
        "provenance": []
      }
    }
  }
}
```

The module never persists changes to the item's source `name`, `system.price`, `system.traits.rarity`, `system.runes`, `system.material`, `system.rules`, or any other PF2e source field. During data preparation it layers the display name, price, rarity, rune replacement, and shield durability onto prepared values. During actor preparation it temporarily presents generated `FlatModifier`, `DamageDice`, and `Resistance` rule sources to PF2e, then removes those sources immediately. The prepared presentation and modifiers remain available to sheets and rolls while the original item data stays intact.

Disabling or uninstalling the module leaves inert flags on previously configured items. All PF2e item and rune data remains intact.

Party travel plans are likewise stored only under `flags.pf2e-crafting-material-tiers.hexploration` on the party actor. Assignments, Used states, Express Rider results, affected traveller ids, and manual travel effects live in that versioned flag. Vehicle, creature, and character actors are referenced by id and are never modified. Wrathmaker creates travel-organizing Actor folders but does not move existing Actors into them.

Nephilim Points are stored under `flags.pf2e-crafting-material-tiers.nephilimPoints` on the party actor. Hero Point values remain in PF2e's native `system.resources.heroPoints.value`; Wrathmaker changes only the prepared maximum to 10 and does not reset the stored value.

Older item flags are read automatically and migrated in memory to the current Make & Marks structure. The former per-item enable and override values are ignored.

## Configuring material effects

For ordinary changes, use the in-game material pop-outs. The structure below is developer documentation for the validated world configuration and public API; it is not exposed as an in-game JSON editor.

The GM rules editor stores validated, versioned JSON. Top-level `tierLabels`, `tierPricesGp`, and `tierRarities` hold the shared fallback names, prices, and PF2e rarities. Each supplied material can override these values independently.

Every material has:

- `label`: the name shown on item sheets.
- `enabled`: whether the material is available.
- `itemTypes`: Wrathmaker crafting categories on which it appears (`weapon`, `armor`, `shield`, or `spellFocus`).
- `effects`: one or more generated PF2e flat modifiers or damage-dice effects.
- Optional effect `itemTypes`: limits an effect to weapons, armor, shields, spell focuses, or future crafting categories.
- Optional `tierLabels`: per-tier names that override the shared labels for this material.
- Optional `tierBonuses`: per-tier custom bonuses that override the shared bonus schedule for this material.
- Optional `tierPricesGp`: per-tier prices that override the shared prices for this material.
- Optional `tierRarities`: per-tier PF2e rarities that override the shared rarity schedule.

For example, this can later rename and reprice only Metal's Tier 2 without changing other materials:

```json
{
  "tierLabels": { "2": "Tempered Steel" },
  "tierPricesGp": { "2": 20 }
}
```

Place those two properties inside the `metal` material definition. Partial per-material maps are accepted; omitted tiers continue using the shared values.

The default weapon effect is:

```json
{
  "id": "weapon-attack",
  "kind": "flatModifier",
  "label": "Crafted {material} ({tierLabel})",
  "itemTypes": ["weapon"],
  "selectors": ["{item|_id}-attack"],
  "modifierType": "untyped",
  "value": {
    "mode": "tierBonus",
    "multiplier": 1,
    "offset": 0
  }
}
```

Weapon damage uses a second item-specific DamageDice effect tied to the Core progression table:

```json
{
  "id": "weapon-damage",
  "kind": "damageDice",
  "label": "{tierLabel} Core Material",
  "itemTypes": ["weapon"],
  "selectors": ["{item|_id}-damage"],
  "value": {
    "mode": "coreWeaponDice"
  }
}
```

Supported value modes are:

- `tierBonus`: the configured bonus for the item's tier.
- `tier`: the item's tier number itself.
- `fixed`: a fixed number in `value.value`.
- `coreWeaponDice`: the Core table's extra weapon-dice entry for the item's Tier.

`multiplier` and `offset` may modify `tierBonus` or `tier`. Effect labels can use `{material}`, `{materialId}`, `{tier}`, `{tierLabel}`, `{bonus}`, and `{item}` placeholders. Optional PF2e `predicate`, `force`, and `hideIfDisabled` fields are also accepted.

The default armor effects are scoped separately from weapon attacks. One targets AC and the other targets Fortitude, Reflex, and Will:

```json
{
  "id": "armor-ac",
  "kind": "flatModifier",
  "label": "Crafted {material} Armor ({tierLabel})",
  "itemTypes": ["armor"],
  "selectors": ["ac"],
  "modifierType": "untyped",
  "value": "tierBonus"
}
```

The save effect uses the same structure with `"selectors": ["fortitude", "reflex", "will"]`.

Metal and Wood also include a held spell-focus effect:

```json
{
  "id": "spell-focus-potency",
  "kind": "flatModifier",
  "label": "Crafted {material} Spell Focus ({tierLabel})",
  "itemTypes": ["spellFocus"],
  "selectors": ["spell-attack", "spell-dc"],
  "modifierType": "untyped",
  "value": "tierBonus"
}
```

Use a test actor when creating new PF2e selectors. A valid JSON definition can still have no visible effect if its selector is not meaningful to the chosen item type.

## Public API

Other modules can access:

```js
const api = game.modules.get("pf2e-crafting-material-tiers").api;
```

Available methods:

- `getRulesConfig()` / `setRulesConfig(config)` / `resetRulesConfig()`
- `validateRulesConfig(config)`
- `registerMaterial(id, definition)`
- `getItemData(item)` / `calculateItem(item)` / `updateItem(item, changes)`
- `listCraftingCategories()` / `categorizeCraftableItem(item)`
- `getCraftingResourceData(item)` / `getCraftingRecipeKey(item, { materialId, tier })`
- `calculateCraftingDC(tier, adjustment)` / `calculateResourceCraftingDC(item, adjustment)`
- `listCraftingDifficultyAdjustments()`
- `validateCraftingRecipe(recipe)` / `summarizeCraftingResources(items)`
- `evaluateCraftingRecipe(recipe, { targetItem, inventoryItems })`
- `normalizeCraftingState(state, defaults)` / `validateCraftingState(state)`
- `calculateArtisanCapacity(state)` / `getCoreTierProgression(tier)`
- `listArtisanMarks(options)` / `getArtisanMark(id)` / `getArtisanProfile(actor)`
- `buildArtisanAnchorSlots(recipe)` / `addArtisanMarksToRecipe(recipe, assignments)`
- `getArtisanMarkCapacity(assignments, coreTier)` / `getArtisanMarkLabourDays(assignments, coreTier)`
- `craftingRecipeSchemaVersion` and `craftingStateSchemaVersion` report the independent crafting schema versions.
- `listGatheringEnvironments()` / `listGatheringTasks(environmentId)`
- `validateGatheringEnvironment(environment)` / `validateGatheringTask(task)`
- `evaluateGatheringTask(task, options)` / `resolveGatheringOutcome(task, degree, resource)`
- `openGathering(options)` opens the player gathering screen.
- `gatheringSchemaVersion` reports the gathering environment/task schema.
- `getHexplorationPlan(party)` / `calculateHexploration(party)` / `updateHexplorationPlan(party, changes)`
- `getNephilimPoints(party)` / `updateNephilimPoints(party, value)`
- `heroPointsMax`, `nephilimPointsMax`, and `nephilimPointsSchemaVersion` report the campaign resource limits and schema.
- `hexplorationPlanSchemaVersion` reports the current saved party-plan schema.

The hook `pf2e-crafting-material-tiers.ready` fires with the API after Foundry is ready.

## Current scope

Wrathmaker currently automates Core Material progression for weapons, armor, shields, and spell focuses; provides contributor-aware selection for the complete Artisan Mark catalogue; validates Capacity and Anchors; reserves Mark materials; tracks Mark labour and provenance; and writes the selected rules onto completed PF2e items. Mark effects are preserved as authoritative rules text; individual PF2e Rule Element automation is only added where a Mark can be implemented safely without inventing unresolved targeting, activation, or campaign-state behaviour. Crafting Edge, Masterstroke, Complication, facility, and parallel-contribution resolution remain later Workbench layers.
