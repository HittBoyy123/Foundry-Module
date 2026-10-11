import test from "node:test";
import assert from "node:assert/strict";
import { knownCraftingSpells, validateScrollSpell, scrollSpellSnapshot, applyScrollSpell } from "../scripts/scroll-crafting.js";
import { buildCraftingRecipeFromBand, defaultProjectProgress, consumableMinimumTier } from "../scripts/recipe-catalog.js";
import { validateArtisanTeam } from "../scripts/workbench-team.js";
import { slotAllowsArtisan } from "../scripts/artisan-selection.js";
import { createCraftingProject } from "../scripts/crafting-projects.js";
import { buildCompletedItemSource } from "../scripts/workbench.js";
import { cloneDefaultRulesConfig } from "../scripts/constants.js";
const spell={id:"spell",uuid:"Actor.caster.Item.spell",name:"Fireball",type:"spell",system:{level:{value:3},location:{value:"entry"},traits:{value:["fire"],traditions:["arcane"],rarity:"common"},damage:{test:{formula:"6d6"}}}};
const caster=()=>({uuid:"Actor.caster",name:"Caster",items:[{id:"entry",type:"spellcastingEntry",system:{prepared:{value:"prepared"},slots:{}}},structuredClone(spell)]});
const scroll=level=>({name:"Blank Scroll",type:"consumable",system:{category:"scroll",level:{value:level},traits:{value:["magical","scroll"]},description:{value:"Scroll rules"},quantity:1}});
test("only genuine known spells are listed, without requiring preparation or slots",()=>{
  const actor=caster();
  actor.items.push({...structuredClone(spell),id:"orphan",system:{...spell.system,location:{value:"missing"}}});
  actor.items.push({...structuredClone(spell),id:"cantrip",system:{...spell.system,traits:{value:["cantrip"]}}});
  actor.items.push({...structuredClone(spell),id:"focus",system:{...spell.system,traits:{value:["focus"]}}});
  assert.deepEqual(knownCraftingSpells(actor).map(s=>s.id),["spell"]);
});
test("the provider must participate and still know the spell, at a valid rank",async()=>{
  const actor=caster(),selection={actorUuid:actor.uuid,spellUuid:spell.uuid,rank:3};
  await assert.rejects(validateScrollSpell(selection,[],async()=>actor),/Assign the character/);
  assert.equal((await validateScrollSpell(selection,[actor.uuid],async()=>actor)).spell.name,"Fireball");
  await assert.rejects(validateScrollSpell({...selection,rank:2},[actor.uuid],async()=>actor),/valid scroll rank/);
  actor.items.pop();
  await assert.rejects(validateScrollSpell(selection,[actor.uuid],async()=>actor),/still know/);
});
test("scrolls require a bookmaker; enchanter support unlocks faster work; another ally can supply the spell",()=>{
  const recipe=buildCraftingRecipeFromBand("consumable-scroll",{targetItem:scroll(5),tier:3});
  const book={actorUuid:"book",professions:[{id:"bookmaking",materialIds:[]}]};
  const enchant={actorUuid:"enchant",professions:[{id:"enchanting",materialIds:["mana-crystals"]}]};
  const team=validateArtisanTeam(recipe,["book","enchant"],[book,enchant]);
  assert.equal(team.valid,true);assert.equal(team.workRate,1.25);
  assert.equal(validateArtisanTeam(recipe,["book"],[book]).valid,true);
  assert.equal(slotAllowsArtisan(team.slots[2],{actor:caster(),professions:[]}),true);
  assert.equal(slotAllowsArtisan(team.slots[0],{actor:caster(),professions:[]}),false);
  assert.equal(slotAllowsArtisan(team.slots[1],book),false);
});
test("scroll batches use exact-tier inscription gems and unchanged base time",()=>{
  const base=scroll(9);assert.equal(consumableMinimumTier(base),4);
  for(const batchQuantity of [1,2,3,4]){
    const recipe=buildCraftingRecipeFromBand("consumable-scroll",{targetItem:base,tier:4,batchQuantity});
    assert.equal(recipe.result.quantity,batchQuantity);
    assert.equal(defaultProjectProgress(recipe),2);
    assert.deepEqual(recipe.ingredientSets[0].groups.map(g=>[g.options[0].units,g.options[0].tier]),[[batchQuantity,4],[batchQuantity,4]]);
  }
});
test("finished scrolls embed the selected spell and rank without changing the provider",()=>{
  const actor=caster(),original=structuredClone(actor),selection=scrollSpellSnapshot(actor.items[1],actor,5);
  const base=scroll(9),recipe=buildCraftingRecipeFromBand("consumable-scroll",{targetItem:base,tier:4,batchQuantity:4});
  const project=createCraftingProject({recipe,coreMaterialId:"wood",coreTier:4,scrollSpell:selection});
  const source=buildCompletedItemSource(project,base,cloneDefaultRulesConfig());
  assert.equal(source.system.quantity,4);assert.equal(source.system.spell.system.location.heightenedLevel,5);
  assert.equal(source.system.spell.system.location.value,null);assert.deepEqual(source.system.spell.system.damage,spell.system.damage);
  assert.equal(source.name,"Scroll of Fireball (Rank 5)");assert.deepEqual(actor,original);
  const escaped=applyScrollSpell(scroll(9),{...selection,name:"<script>"});assert.ok(escaped.system.description.value.includes("&lt;script&gt;"));
});

test("scroll rank is capped by participating casting capacity, not unspent slots or character level", async()=>{
 const { highestCraftingSpellRank } = await import('../scripts/scroll-crafting.js');
 const low=caster();low.items[0].system.slots={slot3:{max:2,value:0}};
 const high=caster();high.uuid="Actor.high";high.items[0].system.slots={slot5:{max:1,value:0}};
 const selection={actorUuid:low.uuid,spellUuid:spell.uuid,rank:5};
 const resolve=async uuid=>uuid===high.uuid?high:low;
 assert.equal(highestCraftingSpellRank([low]),3);
 assert.equal(highestCraftingSpellRank([low,high]),5);
 await assert.rejects(validateScrollSpell(selection,[low.uuid],resolve),/highest spell rank/);
 assert.equal((await validateScrollSpell(selection,[low.uuid,high.uuid],resolve)).rank,5);
 assert.equal(highestCraftingSpellRank([{level:20,items:[]}]),0);
 low.items.push({...structuredClone(spell),id:"future",system:{...spell.system,level:{value:9}}});
 assert.equal(highestCraftingSpellRank([low]),3);
});
