# Wrathmaker

A Foundry VTT module for custom Pathfinder 2e house rules. It adds material and tier controls to PF2e weapons, armor, and crafted spell focuses, tiered crafting resources and resource gathering, custom Apex ability-boost items, campaign Hero and Nephilim Points, escalating multi-side flanking penalties, and shared vehicle-aware Hexploration travel. A GM-facing control panel manages the configurable systems during play.

## Compatibility

- Foundry VTT 13 and 14
- Pathfinder Second Edition 7.1 or newer
- Material-tier item support: weapons, armor, and held spell focuses
- Stackable tiered resources for every material, including color-specific Dragon Scales
- PF2e skill-based gathering with GM-controlled environments and tier availability
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

Download `wrathmaker-v0.11.0.zip` from the latest GitHub release and extract its contents into a folder named `pf2e-crafting-material-tiers` under Foundry's `Data/modules` folder. Restart Foundry and enable **Wrathmaker**.

The GM settings panel is under **Configure Settings → Module Settings → Wrathmaker → Open Control Panel**.

## Apex ability items

The **Wrathmaker Apex Ability Items** compendium contains 30 original worn equipment items: five each for Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma. Their Item Boost values range from +1 to +5. Belts represent Strength, rings Dexterity, amulets Constitution, circlets Intelligence, sashes Wisdom, and brooches Charisma; none of the collection uses armor, weapons, or boots.

Every item carries PF2e's **Apex**, **Invested**, and **Magical** traits and the `item-boost` other tag. Once a Wrathmaker item is invested and worn, the character sheet shows PF2e's familiar circled **A** beside its attribute. Click each **A** independently to activate Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma items together. A filled **A** is active and an outlined **A** is available.

Wrathmaker applies the exact additive modifier from the active item. Different attributes stack; if several active items affect the same attribute, only the strongest one applies. Dropping or uninvesting an item suspends its bonus until it is worn and invested again. Existing v0.8/v0.9 items retain their previous selected state until their **A** is first toggled.

The collection uses five progressive item levels—1, 5, 9, 13, and 17—but deliberately has no purchase prices so the GM can award and value these campaign-specific items as needed.

## Campaign points

Character Hero Points use PF2e's normal header control with a maximum of **10** instead of 3. Their value is stored on the character normally and Wrathmaker does not perform a session reset, so unspent Hero Points carry into later sessions.

Every PF2e party sheet also displays **Nephilim Points** in its native green header. The tracker has 10 pips, persists on that party actor, and can be set from 0 through 10 by a user who can edit the party. Clicking an empty pip sets the total to that value; clicking the highest filled pip removes one, and right-clicking the tracker also removes one.

## Compendium organization

Foundry groups every module compendium under **Pathfinder 2E Wrathmaker** in the Compendium Packs sidebar. The folder contains the Apex Ability Items, Crafting Items, and Crafting Resources packs and is the parent for future Wrathmaker packs.

## In-game control panel

The Wrathmaker control panel stores world-level settings and applies changes immediately to prepared actors and items.

- **Crafting material rules** turns all material and tier controls, names, prices, rarities, and bonuses on or off without deleting item selections.
- **Resource gathering** enables the player gathering screen and lets the GM choose the active environment and maximum available material tier.
- **Enhanced flanking** turns only Wrathmaker's three- and four-side adjustments on or off. PF2e's ordinary two-sided flanking remains unchanged.
- **Hexploration travel** turns Wrathmaker's additions to the native party **Exploration** tab and shared prepared travel Speed on or off.
- The flanking section also edits the final three- and four-side AC totals, the normal size difference, and how many flankers are needed per side against an oversized target.
- Every crafting material has an **Edit** button that opens its own pop-out.
- The material pop-out edits the material name, enabled state, weapon/armor/spell-focus availability, PF2e bonus type, and all six tier names, bonuses, added prices, and PF2e rarities.
- Dragon Scales use a specialized editor for dragon-color names, resistance damage types, and six editable resistance values.
- The complete configuration is presented through named fields and material pop-outs; no raw-code or JSON editor is exposed in-game.

Only a GM can open this world-settings menu. Turning a system off is reversible and does not remove saved item flags or custom definitions.

## Publishing a new version

1. Update the version in `module.json` and `package.json`.
2. Commit and push the changes.
3. Create and push a matching tag such as `v0.11.0`.

The included GitHub Actions workflow validates the module, builds a Foundry-ready ZIP, and publishes both the ZIP and `module.json` to a GitHub Release. The tag must match the version in `module.json`.

## Default rules

| Tier | Attack / focus | Weapon damage | Added price | PF2e rarity |
| ---: | ---: | ---: | ---: | --- |
| 1 | +0 | +0 | 0 gp | Common |
| 2 | +1 | +2 | 10 gp | Uncommon |
| 3 | +2 | +4 | 25 gp | Rare |
| 4 | +3 | +6 | 100 gp | Unique |
| 5 | +4 | +8 | 1,000 gp | Unique |
| 6 | +5 | +10 | 5,000 gp | Unique |

| Tier | Metal | Wood | Stone | Leather / Hide | Herbs / Mushrooms | Mana Crystals |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Iron | Softwood | Fieldstone | Rawhide | Greenleaf | Faint Mana Crystal |
| 2 | Steel | Hardwood | Granite | Hardened Leather | Embercap | Charged Mana Crystal |
| 3 | Cold Iron | Blackwood | Obsidian | Ironhide | Ghostmoss | Resonant Mana Crystal |
| 4 | Mithril | Darkmoon | Runestone | Moonhide | Moonbloom | Arcane Prism |
| 5 | Adamantium | Starwood | Celestite | Titanhide | Starspore | Astral Crystal |
| 6 | Dark Iron | Godwood | Worldstone | Primordial Hide | Worldroot | Aetherheart Crystal |

Metal, wood, stone, leather/hide, herbs/mushrooms, and mana crystals are available as base materials for weapons and armor. A crafted weapon adds the tier bonus to its own attack rolls and twice the tier bonus to its own damage rolls. Armor adds the tier bonus only to AC and only while equipped. The default bonus type is **untyped**, and the GM can change it to item, status, or circumstance in the material editor without changing the module code.

## Crafting resources and recipe categories

The **Wrathmaker Crafting Resources** compendium contains stackable PF2e Treasure items that the GM can award immediately:

- Six Metal Ingots, Wood Lumber resources, Stone Blocks, Leather/Hide Sheets, Herb/Mushroom Bundles, and Mana Crystal bundles—one for every configured tier.
- Thirty Dragon Scale bundles covering all six age tiers in Black, Blue, Green, Red, and White. One inventory quantity represents five scales.
- Mana Crystal bundles represent ten crystals per inventory quantity. Every other resource currently represents one crafting unit.

That is **66 resource items** in total. They deliberately have no automatic sale price or consumption rule yet. Their material id, tier, unit size, and optional Dragon color are stored under Wrathmaker flags, so future recipes remain reliable if the displayed names are customized.

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

The current API is deliberately a non-destructive foundation: it validates recipes, summarizes resource inventories, verifies the selected PF2e result category, calculates the tier DC and difficulty adjustment, and returns the exact allocation that would be required. It does **not** consume resources or create the finished item yet. That later transaction will require explicit confirmation and a GM-authoritative update, allowing the eventual player crafting screen, shopping list, and persistent projects to share the same safe model.

### Gathering resources

Wrathmaker includes an independent, Fabricate-inspired gathering screen for all 66 crafting resources. Players can open **Gather Resources** from the Items Directory header or from Wrathmaker's settings entry, then choose an owned character and visible resource task. The GM chooses the **Active gathering environment** and **Maximum available resource tier** in Wrathmaker Game Settings, so players cannot browse locations the party has not reached or attempt materials above the current location's ceiling. GMs can inspect every environment in the gathering window, subject to the same tier ceiling.

The supplied environments are **Forest, Plains, Mountains, Wetlands, Underground, Arcane Nexus,** and **Dragon Hunting Grounds**. Environments compose reusable tasks rather than containing copied reward items. This means one task definition can be offered in several suitable environments while its reward continues to point to the stable material, tier, and Dragon-color flags in the resource compendium.

Default PF2e checks are:

| Resource | Skill |
| --- | --- |
| Metal and Stone | Crafting |
| Wood and Herbs/Mushrooms | Nature |
| Leather/Hide and Dragon Scales | Survival |
| Mana Crystals | Arcana |

The check uses the resource's existing tier level and DC. A **Success** awards one inventory bundle and a **Critical Success** awards two; Failure and Critical Failure award nothing. Mana Crystal inventory bundles still represent ten crystals and Dragon Scale bundles represent five scales, so the result screen reports both inventory quantity and crafting units. Awarded resources merge into an identical stack on the character or create the correct PF2e Treasure item when no stack exists.

Each task currently displays a default attempt time of 60 minutes, but Wrathmaker does not advance world time automatically. Task records already keep their skill, DC adjustment, time, outcome quantities, environments, and future tool references separate so a later GM editor can change these without rewriting the gathering code. Stamina, finite resource nodes, weather gates, random events, and blind gathering are not enforced in this first gathering pass.

## Crafted spell focus

The **Wrathmaker Crafting Items** compendium contains one reusable **Spell Focus** equipment item. Drag it to a spellcaster, hold it in one hand, and choose Metal or Wood plus a Tier on its item sheet. Its prepared name becomes the selected material name followed by “Spell Focus,” such as `Steel Spell Focus` or `Starwood Spell Focus`.

While held, the focus adds the tier bonus to every spell attack and spell DC on the character: +0 at Tier 1, then +1 through +5 at Tiers 2–6. It does not change spell damage, spell slots, traditions, or proficiency ranks. Putting it away removes the modifiers during normal PF2e actor preparation, and if more than one focus is held only the strongest applies. Only Metal and Wood support focuses by default, but the GM can enable or disable the Spell Focus category independently in each material editor.

Dragon Scales are an armor-only enhancement rather than a replacement base material. Metal and Leather/Hide armor sheets gain Dragon Scale and Scale Tier controls. Their default age tiers are **Hatchling, Juvenile, Youth, Adult, Ancient, and Arch Dragon**, replacing the generic Common–Mythical names; the GM can still rename every tier in the Dragon Scales editor. Black, Blue, Green, Red, and White scales default to acid, electricity, poison, fire, and cold resistance respectively; the GM can rename every color and change its damage type. The six resistance values default to 0 because the campaign progression is still undecided, and can be edited in the Dragon Scales material pop-out. A configured resistance is generated only while the armor is equipped, without changing the armor's PF2e source rules.

Tier 1 creates no zero-value rule element, keeping roll breakdowns uncluttered. Selecting either field saves both choices and activates the configured tier rule for that item.

PF2e first generates the ordinary rune-aware item name and price. Wrathmaker then inserts the selected material's tier name immediately before the source item name, adds the configured tier price, and applies the tier rarity. For example, a Tier 2 metal weapon is prepared as `+1 Striking Steel Bastard Sword`, valued at 110 gp when PF2e calculates 100 gp, and categorized as Uncommon. Armor uses the same naming, price, and rarity process.

## Custom flanking

Wrathmaker calculates flanking from creature tokens on the active scene and updates AC automatically when tokens move or relevant actor state changes.

- One qualifying side means no penalty.
- Two opposite qualifying sides use PF2e's ordinary flanking automation and Off-guard penalty. Wrathmaker adds nothing.
- Three qualifying sides retain normal PF2e Off-guard and receive an additional **-1 AC** from Wrathmaker, for **-3 AC total**.
- All four qualifying sides retain normal PF2e Off-guard and receive an additional **-2 AC** from Wrathmaker, for **-4 AC total**.
- Two adjacent sides alone do not flank; the two-side case must surround the target on north/south or east/west sides.
- If the target is more than one size category larger than a flanker, that flanker contributes half a side. Two such flankers are therefore required on that side.
- A conscious, living flanker must be opposed to the target, able to flank under PF2e's prepared data, and have attack reach to the target.
- A target that PF2e marks as unflankable or immune to Off-guard receives no Wrathmaker flanking penalty.
- The extra three-/four-side adjustment is evaluated for each attack. It applies only to a melee attack that can currently reach the target, including a qualifying reach weapon; ranged attacks never inherit the penalty, even when the target is surrounded.

Wrathmaker does not reproduce PF2e's normal two-sided penalty. PF2e applies Off-guard in the usual way, and Wrathmaker adds only the difference needed at three or four sides. The extra adjustment is an **untyped, attack-contextual** PF2e AC modifier, so it stacks with Off-guard instead of replacing or altering that condition and is not stored as a blanket reduction on the enemy. The AC breakdown labels it `Wrathmaker Flanking Extra (3 sides)` or `Wrathmaker Flanking Extra (4 sides)`.

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

The `penalties` values are the intended final totals after normal PF2e Off-guard. With `pf2eHandlesTwoSidedFlanking` enabled, Wrathmaker subtracts the two-side total and applies only the remaining adjustment. These fields are part of the same validated world rules JSON as the material definitions, so the GM can change the penalties or thresholds later without changing the module code.

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
      "schemaVersion": 2,
      "material": "metal",
      "tier": 2
    }
  }
}
```

The module never persists changes to the item's source `name`, `system.price`, `system.traits.rarity`, `system.runes`, `system.material`, `system.rules`, or any other PF2e source field. During data preparation it layers the display name, price, and rarity onto PF2e's prepared values. During actor preparation it temporarily presents generated `FlatModifier` rule sources to PF2e, then removes those sources immediately. The prepared presentation and modifiers remain available to sheets and rolls while the original item data stays intact.

Disabling or uninstalling the module leaves inert flags on previously configured items. All PF2e item and rune data remains intact.

Party travel plans are likewise stored only under `flags.pf2e-crafting-material-tiers.hexploration` on the party actor. Assignments, Used states, Express Rider results, affected traveller ids, and manual travel effects live in that versioned flag. Vehicle, creature, and character actors are referenced by id and are never modified. Wrathmaker creates travel-organizing Actor folders but does not move existing Actors into them.

Nephilim Points are stored under `flags.pf2e-crafting-material-tiers.nephilimPoints` on the party actor. Hero Point values remain in PF2e's native `system.resources.heroPoints.value`; Wrathmaker changes only the prepared maximum to 10 and does not reset the stored value.

Version 1 item flags are read automatically. The former per-item enable and override values are ignored, leaving Material and Tier as the only item-level choices.

## Configuring material effects

For ordinary changes, use the in-game material pop-outs. The structure below is developer documentation for the validated world configuration and public API; it is not exposed as an in-game JSON editor.

The GM rules editor stores validated, versioned JSON. Top-level `tierLabels`, `tierPricesGp`, and `tierRarities` hold the shared fallback names, prices, and PF2e rarities. Each supplied material can override these values independently.

Every material has:

- `label`: the name shown on item sheets.
- `enabled`: whether the material is available.
- `itemTypes`: Wrathmaker crafting categories on which it appears (`weapon`, `armor`, or `spellFocus`).
- `effects`: one or more generated PF2e flat modifiers.
- Optional effect `itemTypes`: limits an effect to weapons, armor, spell focuses, or future crafting categories.
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

Weapon damage uses a second item-specific effect with twice the same tier bonus:

```json
{
  "id": "weapon-damage",
  "kind": "flatModifier",
  "label": "Crafted {material} Damage ({tierLabel})",
  "itemTypes": ["weapon"],
  "selectors": ["{item|_id}-damage"],
  "modifierType": "untyped",
  "value": {
    "mode": "tierBonus",
    "multiplier": 2,
    "offset": 0
  }
}
```

Supported value modes are:

- `tierBonus`: the configured bonus for the item's tier.
- `tier`: the item's tier number itself.
- `fixed`: a fixed number in `value.value`.

`multiplier` and `offset` may modify `tierBonus` or `tier`. Effect labels can use `{material}`, `{materialId}`, `{tier}`, `{tierLabel}`, `{bonus}`, and `{item}` placeholders. Optional PF2e `predicate`, `force`, and `hideIfDisabled` fields are also accepted.

The default armor effect is scoped separately from weapon attacks:

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
- `craftingRecipeSchemaVersion` reports the current independent recipe schema.
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

Wrathmaker currently automates crafting-material modifiers for weapons, armor, and spell focuses, tier-based names/prices/rarity, tiered inventory resources and recipe classification, custom Apex ability items, campaign point tracking, the custom multi-side flanking rule, and party Hexploration travel. Its configuration deliberately separates materials, tiers, item types, selectors, value formulas, flanking thresholds, and travel thresholds so further house rules can be added without rewriting PF2e core data.
