import test from 'node:test';
import assert from 'node:assert/strict';
import { KINETIC_ACTUATOR_SOURCES, CRAFTING_ITEM_SOURCES } from '../content/crafting-items.js';
import { cloneDefaultRulesConfig, MODULE_ID } from '../scripts/constants.js';
import { normalizeRulesConfig } from '../scripts/model.js';
import { buildItemRuleElements } from '../scripts/integration.js';
import { buildCraftingRecipeFromBand, compatibleRecipeBands } from '../scripts/recipe-catalog.js';
import { buildArtisanSlots } from '../scripts/workbench-team.js';
const config=normalizeRulesConfig(cloneDefaultRulesConfig());
function actuator(tier){const i=structuredClone(KINETIC_ACTUATOR_SOURCES[tier-1]); i.id=i._id;i.actor={};i.isEquipped=true;i.system.equipped={carryType:'worn',inSlot:true};return i;}
test('six actuator tiers scale impulse attacks and DC without spells, damage or apex',()=>{
 for(let tier=1;tier<=6;tier++){
  const item=actuator(tier),rules=buildItemRuleElements(item,config);
  assert.equal(item._id.length,16);
  assert.equal(rules.reduce((sum,r)=>sum+r.value,0),tier-1);
  for(const rule of rules){assert.deepEqual(rule.selector,['impulse-attack-roll','impulse-dc']);assert.equal(rule.type,'item');assert.equal(rule.key,'FlatModifier');}
  assert.equal(item.system.apex,undefined);assert.deepEqual(item.system.rules,[]);
  item.isEquipped=false;assert.deepEqual(buildItemRuleElements(item,config),[]);
 }
});
test('actuators select their own strongest item independently of a spell focus',()=>{
 const weak=actuator(2),strong=actuator(4),focus=structuredClone(CRAFTING_ITEM_SOURCES[0]);
 focus.id='focus';focus.flags[MODULE_ID].tier=6;focus.flags[MODULE_ID].crafting.core.tier=6;focus.isEquipped=true;
 const actor={items:[weak,strong,focus]};for(const item of actor.items)item.actor=actor;
 assert.deepEqual(buildItemRuleElements(weak,config),[]);
 assert.equal(buildItemRuleElements(strong,config)[0].value,3);
 assert.equal(buildItemRuleElements(focus,config)[0].value,5);
 strong.system.equipped.carryType='dropped';assert.equal(buildItemRuleElements(weak,config)[0].value,1);
});
test('actuator recipe uses a Mana Gem core, structural frame and Enchanting lead',()=>{
 const item=actuator(6);
 assert.deepEqual(compatibleRecipeBands(item).map(b=>b.id),['kinetic-actuator']);
 const recipe=buildCraftingRecipeFromBand('kinetic-actuator',{targetItem:item,tier:6});
 const [core,frame]=recipe.ingredientSets[0].groups;
 assert.equal(core.options[0].materialId,'mana-crystals');assert.equal(core.options[0].units,2);assert.equal(core.options[0].tier,6);
 assert.equal(frame.options[0].units,1);assert.equal(frame.options[0].tier,4);
 assert.match(buildArtisanSlots(recipe)[0].requirement,/Enchanting/);
});
