# Wrathmaker

A Foundry VTT module for custom Pathfinder 2e house rules. It adds material and tier controls to PF2e weapon and armor sheets, then turns those choices into separate prepared modifiers without replacing core PF2e bonuses. It also automates Wrathmaker's escalating multi-side flanking penalties and provides a GM-facing control panel for changing both systems during play.

## Compatibility

- Foundry VTT 13 and 14
- Pathfinder Second Edition 7.1 or newer
- Material-tier item support: weapons and armor
- Automatic token-based custom flanking
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
4. Open a weapon or armor sheet and choose **Material** and **Tier** directly below **Quantity**.

This same link lets Foundry detect future Wrathmaker releases automatically.

### Manual installation

Download `wrathmaker-v0.3.1.zip` from the latest GitHub release and extract its contents into a folder named `pf2e-crafting-material-tiers` under Foundry's `Data/modules` folder. Restart Foundry and enable **Wrathmaker**.

The GM settings panel is under **Configure Settings → Module Settings → Wrathmaker → Open Control Panel**.

## In-game control panel

The Wrathmaker control panel stores world-level settings and applies changes immediately to prepared actors and items.

- **Crafting material rules** turns all material and tier controls, names, prices, rarities, and bonuses on or off without deleting item selections.
- **Enhanced flanking** turns only Wrathmaker's three- and four-side adjustments on or off. PF2e's ordinary two-sided flanking remains unchanged.
- The flanking section also edits the final three- and four-side AC totals, the normal size difference, and how many flankers are needed per side against an oversized target.
- Every crafting material has an **Edit** button that opens its own pop-out.
- The material pop-out edits the material name, enabled state, weapon/armor availability, and all six tier names, bonuses, added prices, and PF2e rarities.
- The complete configuration is presented through named fields and material pop-outs; no raw-code or JSON editor is exposed in-game.

Only a GM can open this world-settings menu. Turning a system off is reversible and does not remove saved item flags or custom definitions.

## Publishing a new version

1. Update the version in `module.json` and `package.json`.
2. Commit and push the changes.
3. Create and push a matching tag such as `v0.3.1`.

The included GitHub Actions workflow validates the module, builds a Foundry-ready ZIP, and publishes both the ZIP and `module.json` to a GitHub Release. The tag must match the version in `module.json`.

## Default rules

| Tier | Metal | Wood | Other materials | Custom bonus | Added price | PF2e rarity |
| ---: | --- | --- | --- | ---: | ---: | --- |
| 1 | Iron | Softwood | Common | +0 | 0 gp | Common |
| 2 | Steel | Hardwood | Uncommon | +1 | 10 gp | Uncommon |
| 3 | Cold Iron | Blackwood | Rare | +2 | 25 gp | Rare |
| 4 | Mithril | Darkmoon | Epic | +3 | 100 gp | Unique |
| 5 | Adamantium | Starwood | Legendary | +4 | 1,000 gp | Unique |
| 6 | Dark Iron | Godwood | Mythical | +5 | 5,000 gp | Unique |

Metal, wood, stone, leather/hide, dragon scales, herbs/mushrooms, and mana crystals are available to both weapons and armor. Weapon bonuses apply only to the selected weapon's attack selector. Armor bonuses apply only to AC and only while that armor is equipped. Both are **untyped** PF2e flat modifiers, so they stay separate from ordinary PF2e item, potency, and rune bonuses.

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

Wrathmaker does not reproduce PF2e's normal two-sided penalty. PF2e applies Off-guard in the usual way, and Wrathmaker adds only the difference needed at three or four sides. The extra adjustment is an **untyped** PF2e AC modifier, so it stacks with Off-guard instead of replacing or altering that condition. The AC breakdown labels it `Wrathmaker Flanking Extra (3 sides)` or `Wrathmaker Flanking Extra (4 sides)`.

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

Version 1 item flags are read automatically. The former per-item enable and override values are ignored, leaving Material and Tier as the only item-level choices.

## Configuring material effects

For ordinary changes, use the in-game material pop-outs. The structure below is developer documentation for the validated world configuration and public API; it is not exposed as an in-game JSON editor.

The GM rules editor stores validated, versioned JSON. Top-level `tierLabels`, `tierPricesGp`, and `tierRarities` hold the shared fallback names, prices, and PF2e rarities. Each supplied material can override these values independently.

Every material has:

- `label`: the name shown on item sheets.
- `enabled`: whether the material is available.
- `itemTypes`: PF2e item types on which it appears.
- `effects`: one or more generated PF2e flat modifiers.
- Optional effect `itemTypes`: limits an effect to weapons, armor, or future item types.
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

The hook `pf2e-crafting-material-tiers.ready` fires with the API after Foundry is ready.

## Current scope

Wrathmaker currently automates crafting-material modifiers for weapons and armor, tier-based names/prices/rarity, and the custom multi-side flanking rule. Its configuration deliberately separates materials, tiers, item types, selectors, value formulas, and flanking thresholds so further house rules can be added without rewriting PF2e core data.
