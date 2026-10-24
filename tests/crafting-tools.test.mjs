import test from 'node:test';
import assert from 'node:assert/strict';
import { bestCraftingTool } from '../scripts/crafting-tools.js';
import { calculateWorkBlockDC, calculateCraftingDC } from '../scripts/crafting-dc.js';
import { PROFESSION_ITEM_SOURCES } from '../content/professions.js';
import { MODULE_ID } from '../scripts/constants.js';
const tool=(tier,professionId='blacksmithing',carryType='worn')=>({type:'equipment',name:'Tools',system:{quantity:1,equipped:{carryType}},flags:{[MODULE_ID]:{craftingTool:{tier,professionId}}}});
test('Work Blocks use ten per tier without altering shared gathering DCs',()=>{
 for(let tier=1;tier<=6;tier++) assert.equal(calculateWorkBlockDC(tier).dc,tier*10);
 assert.equal(calculateCraftingDC(2).dc,19);
 assert.equal(calculateWorkBlockDC(2,'hard').dc,22);
 assert.equal(calculateWorkBlockDC(0),null);
});
test('only the best carried matching tool set grants five per tier',()=>{
 const profession=structuredClone(PROFESSION_ITEM_SOURCES.find(p=>p.flags[MODULE_ID].profession.id==='blacksmithing'));
 const actor={items:[profession,tool(2),tool(4),tool(6,'alchemy'),tool(6,'blacksmithing','dropped'),tool(99)]};
 assert.equal(bestCraftingTool(actor,'metal').bonus,20);
 assert.equal(bestCraftingTool(actor,'omnipotisium').bonus,20);
 assert.equal(bestCraftingTool(actor,'wood'),null);
 actor.items[2].system.quantity=0;
 assert.equal(bestCraftingTool(actor,'metal').bonus,10);
 assert.equal(bestCraftingTool({items:[tool(6)]},'metal'),null);
});
test('named Bookmaking role selects bookmaking tools for scroll work',()=>{
 const profession=structuredClone(PROFESSION_ITEM_SOURCES.find(p=>p.flags[MODULE_ID].profession.id==='bookmaking'));
 assert.equal(bestCraftingTool({items:[profession,tool(3,'bookmaking')]},'wood',['bookmaking']).bonus,15);
});
