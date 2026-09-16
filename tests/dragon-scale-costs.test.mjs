import test from 'node:test';
import assert from 'node:assert/strict';
import { dragonScaleUnits, addArmorResistance } from '../scripts/armor-resistance.js';
import { buildCraftingRecipeFromBand } from '../scripts/recipe-catalog.js';
import { cloneDefaultRulesConfig } from '../scripts/constants.js';
import { evaluateCraftingRecipe } from '../scripts/crafting-recipes.js';
const costs = [['shield-buckler',1],['shield-light',2],['shield-standard',3],['shield-tower',4],['shield-fortress',5],['armor-combat-clothing',2],['armor-light-flexible',2],['armor-light-reinforced',2],['armor-medium-hide',3],['armor-medium-metal',3],['armor-heavy',4],['armor-full-plate',5]];
for (const [band, units] of costs) test(`${band} requires ${units} scale units`, () => {
 const category = band.includes('shield') ? 'shield' : band.includes('medium') ? 'medium' : band.includes('heavy') || band.includes('full-plate') ? 'heavy' : 'light';
 const item = { type: 'armor', system: { category } };
 const recipe = buildCraftingRecipeFromBand(band, { targetItem: item, tier: 3 });
 assert.equal(dragonScaleUnits(recipe), units);
 addArmorResistance(recipe, item, { color: 'black', tier: 4 }, cloneDefaultRulesConfig());
 const preview = evaluateCraftingRecipe(recipe, { targetItem: item });
 assert.equal(preview.ingredientSets[0].groups.find(g => g.id === 'dragon-scale').options[0].units, units);
});
