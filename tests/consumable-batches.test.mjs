import test from "node:test";
import assert from "node:assert/strict";
import { buildCraftingRecipeFromBand, consumableMinimumTier, defaultProjectProgress } from "../scripts/recipe-catalog.js";
import { validateArtisanTeam, chooseSecondaryMaterials } from "../scripts/workbench-team.js";
import { slotAllowsArtisan } from "../scripts/artisan-selection.js";
import { scaleEquipmentRecipe } from "../scripts/equipment-size.js";
import { createCraftingProject, advanceCraftingProject, projectWorkRate, reserveCraftingProject, buildConsumptionPlan, completeCraftingProject } from "../scripts/crafting-projects.js";
import { workYield } from "../scripts/crafting-edges.js";
const potion = level => ({ type: "consumable", system: { category: "potion", level: { value: level }, traits: { value: ["magical"] } } });
const profile = (id, materialIds = []) => ({ actorUuid: id, professions: [{ id, name: id, materialIds }] });
test("a four-dose project reserves and consumes the entire batch together", () => {
  const recipe=buildCraftingRecipeFromBand("consumable-potion",{targetItem:potion(6),tier:3,batchQuantity:4});
  const inventory=recipe.ingredientSets[0].groups.map((g,i)=>({id:String(i),system:{quantity:4},flags:{"pf2e-crafting-material-tiers":{resource:{...g.options[0],unitsPerItem:1}}}}));
  let project=reserveCraftingProject(createCraftingProject({recipe,teamworkRate:1}),{inventoryItems:inventory});
  assert.deepEqual(project.reservations.map(r=>r.quantity),[4,4,4]);
  assert.throws(()=>reserveCraftingProject(createCraftingProject({recipe}),{inventoryItems:inventory,otherProjects:[project]}),/unreserved resources/);
  project=advanceCraftingProject(project,{days:3,degree:"success"});
  assert.equal(project.status,"ready");
  assert.deepEqual(inventory.map(i=>i.system.quantity),[4,4,4]);
  assert.deepEqual(buildConsumptionPlan(project,inventory).map(p=>p.afterQuantity),[0,0,0]);
  assert.equal(completeCraftingProject(project,{finalItemUuid:"Actor.party.Item.batch"}).recipe.result.quantity,4);
});
test("consumable levels enforce every tier boundary and reject undersized materials", () => {
  for (const [level,tier] of [[0,1],[1,1],[2,2],[4,2],[5,3],[8,3],[9,4],[12,4],[13,5],[16,5],[17,6],[20,6]]) {
    assert.equal(consumableMinimumTier(potion(level)),tier);
    assert.equal(buildCraftingRecipeFromBand("consumable-potion", {targetItem:potion(level),tier}).tier,tier);
    if (tier>1) assert.throws(() => buildCraftingRecipeFromBand("consumable-potion", {targetItem:potion(level),tier:tier-1}), /minimum tier/);
  }
  assert.throws(() => consumableMinimumTier(potion(21)), /above level 20/);
});
test("batches multiply all resources but preserve duration and ignore equipment size", () => {
  for (const batchQuantity of [1,2,3,4]) {
    const recipe=buildCraftingRecipeFromBand("consumable-potion", {targetItem:potion(6),tier:3,batchQuantity});
    assert.equal(recipe.result.quantity,batchQuantity);
    assert.deepEqual(recipe.ingredientSets[0].groups.map(g=>g.options[0].units),[batchQuantity,batchQuantity,batchQuantity]);
    assert.equal(defaultProjectProgress(recipe),3);
    assert.deepEqual(scaleEquipmentRecipe(recipe,"tiny"),recipe);
    assert.equal(recipe.ingredientSets[0].groups[1].options[0].tier,1);
  }
  for (const batchQuantity of [0,5,1.5]) assert.throws(()=>buildCraftingRecipeFromBand("consumable-potion",{targetItem:potion(1),batchQuantity}),/one to four/);
});
test("alchemy leads alone; glassmaking unlocks the role bonus, unrelated helpers do not", () => {
  const recipe=buildCraftingRecipeFromBand("consumable-potion",{targetItem:potion(1)});
  const alchemy=profile("alchemy",["herbs"]), glass=profile("glassmaking"), stone=profile("stonemason",["stone"]);
  const solo=validateArtisanTeam(recipe,["alchemy"],[alchemy]);
  assert.equal(solo.valid,true);assert.equal(solo.workRate,1);
  assert.equal(slotAllowsArtisan(solo.slots[1],glass),true);
  assert.equal(slotAllowsArtisan(solo.slots[1],stone),false);
  assert.equal(validateArtisanTeam(recipe,["alchemy","glassmaking"],[alchemy,glass]).workRate,1.25);
  assert.equal(validateArtisanTeam(recipe,["alchemy","","stonemason"],[alchemy,stone]).workRate,1);
});
test("all structural roles qualify three-role recipes and new rates survive work blocks", () => {
  const recipe=chooseSecondaryMaterials(buildCraftingRecipeFromBand("weapon-bow",{targetItem:{type:"weapon",system:{category:"martial"}}}),{});
  const groups=recipe.ingredientSets[0].groups.filter(g=>g.id!=="magic-catalyst");
  const profiles=groups.map((g,i)=>profile(String(i),[g.options[0].materialId]));
  const team=validateArtisanTeam(recipe,profiles.map(p=>p.actorUuid),profiles);
  assert.equal(team.workRate,1.25);
  assert.equal(validateArtisanTeam(recipe,["0"],profiles).workRate,1);
  const project=createCraftingProject({recipe,teamworkRate:team.workRate,requiredProgress:20,contributors:profiles});
  project.reservations=[{itemId:"stock",quantity:1,units:1}];
  assert.equal(projectWorkRate(project),1.25);
  assert.equal(workYield(project,4),5);
  assert.equal(advanceCraftingProject(project,{days:4,degree:"success"}).currentProgress,5);
  project.teamworkRate=1;
  assert.equal(workYield(project,4),4);
});
