# Profession Lore checks

Profession Lore is now a selectable house-rule alternative in Gathering and crafting project Work Blocks.

- Gathering: select a resource, then choose the ordinary skill or relevant profession Lore in the Skill menu.
- Crafting: clicking Roll Work opens a skill choice when the lead artisan has eligible profession Lore. Relevance uses the core material and actual reserved project materials, including secondary materials.
- Eligibility uses learned profession records and their materialIds, plus the profession's granted, trained Lore item. Unrelated Lore and unlearned professions do not qualify.
- PF2e supplies the prepared Lore statistic, rank, modifiers and degree of success. The task/project DC and existing progress/yield rules are unchanged.
- The result card identifies the chosen skill. Eligibility is checked again immediately before rolling.

Maintenance: scripts/profession-checks.js contains the shared eligibility and statistic resolver. Profession material associations remain in the existing profession definitions. Existing projects require no migration.

Validation: 297 automated tests passed. Installed PF2e source confirms prepared Lore skills expose itemId and lore metadata used to match the owned item. Interactive Foundry verification and release packaging remain outstanding. Specialty Lore is not automatically broadened to the parent profession's full material list; this pass supports the profession's primary Lore.
