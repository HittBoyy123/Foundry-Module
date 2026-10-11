import test from "node:test";
import assert from "node:assert/strict";
import { ammunitionForms } from "../scripts/ammunition.js";
import { categorizeCraftableItem } from "../scripts/crafting-categories.js";
import { compatibleRecipeBands, buildCraftingRecipeFromBand, consumableMinimumTier, defaultProjectProgress } from "../scripts/recipe-catalog.js";
import { scaleEquipmentRecipe } from "../scripts/equipment-size.js";
import { validateArtisanTeam } from "../scripts/workbench-team.js";
import { createCraftingProject, reserveCraftingProject, advanceCraftingProject, buildConsumptionPlan, completeCraftingProject } from "../scripts/crafting-projects.js";
const ammo = (baseItem,level=0,traits=[]) => ({type:"ammo",system:{baseItem,level:{value:level},traits:{value:traits},uses:{max:1},rules:[{key:"test"}]}});

test("native and legacy projectile forms select compatible recipes",()=>{
  for(const [base,form] of [["arrows","arrows"],["bolts","bolts"],["rounds","bullets"],["rounds-flintlock-pistol","bullets"],["sling-bullets","sling"],["blowgun-darts","darts"]]) {
    const item=ammo(base);
    assert.equal(categorizeCraftableItem(item).id,"ammunition");
    assert.deepEqual(compatibleRecipeBands(item).map(b=>b.id),[`ammo-${form}`]);
  }
  assert.deepEqual(ammunitionForms({type:"consumable",system:{category:"ammo",stackGroup:"arrows"}}),["arrows"]);
  assert.deepEqual(compatibleRecipeBands(ammo("magazine")),[]);
  assert.deepEqual(compatibleRecipeBands(ammo("battery")),[]);
});
test("flexible magical ammunition offers only its allowed physical forms",()=>{
  const item=ammo(null,6,["magical"]);item.system.craftableAs=["arrows","bolts"];
  assert.deepEqual(compatibleRecipeBands(item).map(b=>b.id),["ammo-arrows","ammo-bolts"]);
  assert.throws(()=>buildCraftingRecipeFromBand("ammo-bullets",{targetItem:item,tier:3}),/not compatible/);
});
test("mundane ammunition is tier one and 1–4 batches produce 10–40 projectiles",()=>{
  for(const batchQuantity of [1,2,3,4]) {
    const item=ammo("arrows",10);const before=structuredClone(item);
    const recipe=buildCraftingRecipeFromBand("ammo-arrows",{targetItem:item,tier:6,batchQuantity});
    assert.equal(recipe.tier,1);assert.equal(consumableMinimumTier(item),1);
    assert.equal(recipe.result.quantity,batchQuantity*10);
    assert.deepEqual(recipe.ingredientSets[0].groups.map(g=>g.options[0].units),[batchQuantity,batchQuantity]);
    assert.equal(defaultProjectProgress(recipe),2);
    assert.deepEqual(scaleEquipmentRecipe(recipe,"tiny"),recipe);
    assert.deepEqual(item,before);
  }
});
test("magical ammunition uses level thresholds and a catalyst for every projectile",()=>{
  for(const [level,tier] of [[1,1],[2,2],[5,3],[9,4],[13,5],[17,6],[20,6]]) {
    const item=ammo("bolts",level,["magical"]);
    assert.equal(consumableMinimumTier(item),tier);
    if(tier>1)assert.throws(()=>buildCraftingRecipeFromBand("ammo-bolts",{targetItem:item,tier:tier-1}),/minimum tier/);
    const recipe=buildCraftingRecipeFromBand("ammo-bolts",{targetItem:item,tier,batchQuantity:4});
    assert.equal(recipe.ingredientSets[0].groups.find(g=>g.id==="magic-catalyst").options[0].units,40);
    assert.equal(recipe.result.quantity,40);
    assert.equal(defaultProjectProgress(recipe),defaultProjectProgress(buildCraftingRecipeFromBand("ammo-bolts",{targetItem:item,tier})));
  }
  assert.equal(consumableMinimumTier(ammo("arrows",6,["primal"])),3);
});
test("ammunition professions follow materials rather than using the alchemist consumable lead",()=>{
  const recipe=buildCraftingRecipeFromBand("ammo-arrows",{targetItem:ammo("arrows")});
  const profiles=[{actorUuid:"c",professions:[{id:"carpentry",materialIds:["wood"]}]},{actorUuid:"s",professions:[{id:"blacksmithing",materialIds:["metal"]}]}];
  const team=validateArtisanTeam(recipe,["c","s"],profiles);
  assert.equal(team.valid,true);assert.equal(team.workRate,1.25);
  assert.equal(validateArtisanTeam(recipe,["c"],profiles).workRate,1);
  assert.equal(validateArtisanTeam(recipe,["s","c"],profiles).valid,false);
});
test("ammunition reservations and completion preserve the batch output",()=>{
  const recipe=buildCraftingRecipeFromBand("ammo-bullets",{targetItem:ammo("rounds"),batchQuantity:4});
  const inventory=recipe.ingredientSets[0].groups.map((g,i)=>({id:String(i),system:{quantity:4},flags:{"pf2e-crafting-material-tiers":{resource:{...g.options[0],unitsPerItem:1}}}}));
  let project=reserveCraftingProject(createCraftingProject({recipe,teamworkRate:1}),{inventoryItems:inventory});
  project=advanceCraftingProject(project,{days:2,degree:"success"});
  assert.deepEqual(buildConsumptionPlan(project,inventory).map(p=>p.afterQuantity),[0,0]);
  assert.equal(completeCraftingProject(project,{finalItemUuid:"Actor.party.Item.ammo"}).recipe.result.quantity,40);
});
