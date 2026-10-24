import test from 'node:test';
import assert from 'node:assert/strict';
import { updateItemMasterstroke } from '../scripts/masterstroke-editor.js';
import { MODULE_ID } from '../scripts/constants.js';
test('GM editor adds, replaces and removes a single Masterstroke with permission checks', async () => {
  let update;
  const item = {id:'sword',type:'weapon',flags:{},update:async data=>{update=data;}};
  await assert.rejects(updateItemMasterstroke(item,7,{isGM:false}),/Only a GM/);
  await assert.rejects(updateItemMasterstroke(item,99,{isGM:true}),/compatible/);
  await updateItemMasterstroke(item,7,{isGM:true});
  const key=`flags.${MODULE_ID}.crafting.masterstrokes`;
  assert.equal(update[key].length,1);assert.equal(update[key][0].result,7);
  assert.equal(update[key][0].edition,'chad');
  assert.equal(update[`flags.${MODULE_ID}.crafting.masterstrokeArmed`],null);
  await updateItemMasterstroke(item,0,{isGM:true});assert.deepEqual(update[key],[]);
  item.flags[MODULE_ID]={upgradeProject:'active'};
  await assert.rejects(updateItemMasterstroke(item,1,{isGM:true}),/active upgrade/);
});
