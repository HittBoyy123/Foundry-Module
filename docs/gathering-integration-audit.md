# Kingmaker and gathering integration audit

Reviewed 10 September 2026 against workspace v0.31.0. Scope: gathering, Kingmaker hex resolution, roll tags, and the Hexploration activity model. This is not a full audit of crafting, Artisan Marks, or every PF2e subsystem.

## Rules baseline

PF2e Hexploration uses daily activity allowances based on the slowest party member. Its published thresholds are 0.5/1/2/3/4 activities at speeds up to 10/25/40/55/above 55 feet. Travel and Reconnoiter are group activities. Difficult terrain increases their activity costs; roads improve Travel but do not shorten Reconnoiter. Subsist is an individual option, not a crafting-material yield formula.

Source: [GM Core Hexploration, Archives of Nethys](https://2e.aonprd.com/Rules.aspx?ID=3103).

Wrathmaker's material tiers, zone-to-tier mapping, party-level cap, resource-family mappings, and participant-scaled gathering are house rules. The current luxuries-to-mana-crystals mapping is also a campaign assumption, not a Pathfinder conversion. Retained existing mappings and tier thresholds of 1, 4, 8, 12, 16, 20.

## Corrected in this pass

- Kingmaker's installed source uses swamp and lake terrain values. These now normalize to wetlands and water rather than blocking gathering.
- Feature tags now use trimmed lowercase kebab-case, omit empty tags, and remove duplicates. Discovered flags must explicitly be true. Unknown feature tags remain descriptive and grant no resources.
- Resource lookup no longer accepts inherited object properties as mappings.
- A party token outside a valid hex is no longer silently discarded when another token is inside one.
- Characters in multiple parties require an explicit party instead of using the first membership for the level cap.
- Added consistent wrathmaker:gathering and wrathmaker:gathering:material:<id> roll options. Existing action:gather predicates and tier options remain for compatibility.
- Extracted house-rule tables and tag normalization into scripts/gathering-tags.js. Hex location and tier resolution remain in scripts/kingmaker-gathering.js; inventory and rolls remain in scripts/gathering.js.

## Outstanding integration gaps

| Area | Verified current behavior | Required follow-through |
|---|---|---|
| Group yield | Presets award 5/10 inventory items; the model fallback is 1/2. Neither counts participating gatherers. | Choose participants explicitly and award the agreed 1/2 Resource Units per participant; account for unitsPerItem. |
| Activity spending | Gathering performs a roll and awards inventory independently of Hexploration. Presets show 60 minutes. | Connect attempts to a shared party activity, including failed attempts; cancellation should not consume it. Protect against simultaneous or repeated awards. |
| Profession Lore | A profession bonus can apply, but the actual roll uses the task's fixed skill. | Offer eligible profession Lore alternatives and validate the selected statistic. |
| GM editing | Region tier limits exist and remain bounded by party tier. Terrain/resource maps are code constants. | Terrain defaults, resource exceptions per zone, and per-hex resource/tier/DC/yield overrides need an editor and precedence rules. |
| Activity model | Slowest-member speed and daily thresholds match the baseline. Planned activities are manually marked used. | Terrain activity costs, fractional-day progress and gathering consumption are not a verified end-to-end rules implementation. |
| Live compatibility | Local Kingmaker source was readable with elevated read access; terrain names and exploration states were checked. | Run in Foundry with the installed module and test player permissions, saved hex edits and roll-time changes. Version 2.3.2 runtime was not tested. |

## Editing conventions

Keep persisted material IDs, zone IDs, module flags and existing roll predicates stable. Normalize external descriptive tags at the adapter boundary. Put resource mapping decisions in gathering-tags.js and describe them as house rules. Do not derive resources from hidden site names or unrevealed features. Continue using PF2e's reported degree of success rather than recalculating natural-20/natural-1 behavior.

## Validation

All 294 Node tests passed, including five added regression tests covering aliases, discovery/tag handling, invalid map positions, ambiguous party membership and roll-option compatibility. git diff --check passed. No Foundry UI test, release, installation, or compendium rebuild was performed. Existing unfinished Artisan Mark changes were preserved.
