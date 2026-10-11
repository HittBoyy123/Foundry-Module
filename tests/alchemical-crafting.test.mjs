import { getCraftingItemType, calculateItemEffects } from "../scripts/model.js";
import { materialRuneSlots } from "../scripts/property-runes.js";
import test from "node:test";
import assert from "node:assert/strict";
import { categorizeCraftableItem } from "../scripts/crafting-categories.js";
import { buildCraftingRecipeFromBand, compatibleRecipeBands, consumableMinimumTier, defaultProjectProgress } from "../scripts/recipe-catalog.js";
import { validateArtisanTeam } from "../scripts/workbench-team.js";
import { createCraftingProject } from "../scripts/crafting-projects.js";
import { buildCompletedItemSource } from "../scripts/workbench.js";
import { cloneDefaultRulesConfig } from "../scripts/constants.js";
const bomb=level=>({name:"Alchemist's Fire",type:"weapon",system:{category:"martial",group:"bomb",level:{value:level},traits:{value:["alchemical","bomb","consumable","fire"]},damage:{dice:2,die:"d8",damageType:"fire"},splashDamage:2,persistent:{number:2,type:"fire"},rules:[],quantity:1}});
test("bombs use the alchemical batch recipe rather than generic weapons",()=>{
 const item=bomb(3);
 assert.equal(categorizeCraftableItem(item).id,"consumable.bomb");
 assert.deepEqual(compatibleRecipeBands(item).map(b=>b.id),["consumable-bomb"]);
 assert.equal(consumableMinimumTier(item),2);
 assert.throws(()=>buildCraftingRecipeFromBand("consumable-bomb",{targetItem:item,tier:1}),/minimum tier/);
});
test("nonmagical bombs and elixirs scale resources without requiring gems",()=>{
 for(const item of [bomb(11),{type:"consumable",system:{category:"elixir",level:{value:11},traits:{value:["alchemical","elixir"]}}}]){
  const recipe=buildCraftingRecipeFromBand(categorizeCraftableItem(item).id.replace(".","-"),{targetItem:item,tier:4,batchQuantity:4});
  assert.deepEqual(recipe.ingredientSets[0].groups.map(g=>[g.options[0].materialId,g.options[0].units]),[["herbs",4],["stone",4]]);
  assert.equal(recipe.result.quantity,4);assert.equal(defaultProjectProgress(recipe),2);
  const alchemist={actorUuid:"a",professions:[{id:"alchemy",materialIds:["herbs"]}]},glass={actorUuid:"g",professions:[{id:"glassmaking",materialIds:["stone"]}]};
  assert.equal(validateArtisanTeam(recipe,["a"],[alchemist]).valid,true);
  assert.equal(validateArtisanTeam(recipe,["a","g"],[alchemist,glass]).workRate,1.25);
  assert.equal(validateArtisanTeam(recipe,["g"],[glass]).valid,false);
 }
});
test("completed bomb batches preserve native damage and effects",()=>{
 const item=bomb(3),recipe=buildCraftingRecipeFromBand("consumable-bomb",{targetItem:item,tier:2,batchQuantity:4});
 const project=createCraftingProject({recipe,coreMaterialId:"herbs",coreTier:2});
 const result=buildCompletedItemSource(project,item,cloneDefaultRulesConfig());
 assert.equal(result.type,"weapon");assert.equal(result.system.quantity,4);
 for(const key of ["damage","splashDamage","persistent","rules","traits","level"])assert.deepEqual(result.system[key],item.system[key]);
 assert.equal(item.system.quantity,1);
});

test("bomb ingredients cannot add equipment attack bonuses or rune slots",()=>{
 const item=bomb(11),config=cloneDefaultRulesConfig();
 item.flags={"pf2e-crafting-material-tiers":{material:"herbs",tier:4}};
 assert.equal(getCraftingItemType(item),"consumable");
 assert.equal(calculateItemEffects({itemType:getCraftingItemType(item),flags:item.flags["pf2e-crafting-material-tiers"],config}).active,false);
 assert.equal(materialRuneSlots(item,config),0);
});