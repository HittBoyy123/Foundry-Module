import test from "node:test";
import assert from "node:assert/strict";
import { MODULE_ID, cloneDefaultRulesConfig } from "../scripts/constants.js";
import { normalizeRulesConfig, normalizeItemFlags } from "../scripts/model.js";
import { buildItemRuleElements, applyPreparedItemPresentation } from "../scripts/integration.js";
import { newCustomOre, materialTiers, customOreResource } from "../scripts/custom-ores.js";
import { applyMaterialChanges, buildMaterialEditorContext } from "../scripts/settings-model.js";
import { voidDamageAdjustment, VOIDBORN_TRAIT } from "../scripts/void-protection.js";
import { buildCraftingRecipeFromBand } from "../scripts/recipe-catalog.js";
import { calculateWorkBlockDC } from "../scripts/crafting-dc.js";
import { itemRefreshPatch } from "../scripts/refresh-all.js";
import { getCraftingResourceData } from "../scripts/crafting-categories.js";
import { buildArtisanSlots } from "../scripts/workbench-team.js";

const defaults = () => normalizeRulesConfig(cloneDefaultRulesConfig());
const weapon = () => ({ id: "sword", name: "Sword", type: "weapon", actor: {}, flags: { [MODULE_ID]: { material: "omnipotisium", tier: 7 } },
  system: { category: "martial", group: "sword", traits: { value: [] }, runes: { potency: 3, striking: 3 }, damage: { dice: 4, die: "d8" }, rules: [] } });

test("Omnipotentium adds configurable dice alongside Striking and reacts to live settings", () => {
  const config = defaults(), item = weapon();
  applyPreparedItemPresentation(item, config);
  let rules = buildItemRuleElements(item, config);
  assert.equal(item.system.runes.striking, 3);
  assert.equal(item.system.damage.dice, 4);
  assert.equal(rules.find(rule => rule.key === "FlatModifier").value, 6);
  const extra = rules.find(rule => rule.key === "DamageDice");
  assert.equal(extra.diceNumber, 1);
  assert.equal(extra.override, undefined);
  assert.deepEqual(extra.selector, ["{item|_id}-damage"]);
  config.materials.omnipotisium.extraDamageDice = 3;
  config.materials.omnipotisium.tierBonuses[7] = 9;
  rules = buildItemRuleElements(item, config);
  assert.equal(rules.find(rule => rule.key === "DamageDice").diceNumber, 3);
  assert.equal(rules.find(rule => rule.key === "FlatModifier").value, 9);
  config.materials.omnipotisium.extraDamageDice = 0;
  assert.ok(!buildItemRuleElements(item, config).some(rule => rule.key === "DamageDice"));
});

test("custom ore editor persists a single tier, bonuses and supported property tags", () => {
  const created = newCustomOre(defaults(), "Moon Iron", "custom-moon-iron");
  const edited = normalizeRulesConfig(applyMaterialChanges(created, "custom-moon-iron", {
    material:{label:"Moon Iron",enabled:true,modifierType:"untyped"}, itemTypes:{weapon:true,armor:true},
    oreTier:3,extraDamageDice:2,voidborn:true,descriptiveTags:"luminous, sacred",
    tiers:{1:{label:"Moon Iron",bonus:4,priceGp:0,rarity:"unique"}},
  }));
  assert.deepEqual(materialTiers(edited,"custom-moon-iron"),[3]);
  assert.equal(edited.materials["custom-moon-iron"].tierBonuses[3],4);
  assert.deepEqual(edited.materials["custom-moon-iron"].propertyTags,["luminous","sacred","voidborn"]);
  assert.equal(buildMaterialEditorContext(edited,"custom-moon-iron").tiers.length,1);
  assert.equal(getCraftingResourceData(customOreResource("custom-moon-iron",edited.materials["custom-moon-iron"])).tier,3);
  edited.materials["custom-moon-iron"].oreTier=7;
  assert.throws(()=>normalizeRulesConfig(edited),/Only Omnipotentium/);
});

test("Voidborn property works on custom weapons and armour and can be switched off", () => {
  const config = newCustomOre(defaults(),"Moon Iron","custom-moon-iron");
  config.materials["custom-moon-iron"].propertyTags=["voidborn"];
  const creature={system:{traits:{value:[VOIDBORN_TRAIT]}},items:[]};
  const item={type:"weapon",flags:{[MODULE_ID]:{material:"custom-moon-iron",tier:1}}};
  assert.deepEqual(voidDamageAdjustment(creature,{item,damage:20},config),[]);
  const armor={...item,type:"armor",isEquipped:true};
  assert.equal(voidDamageAdjustment({items:[armor]},{item:{type:"melee",actor:creature},damage:20},config).length,1);
  config.materials["custom-moon-iron"].propertyTags=[];
  assert.equal(voidDamageAdjustment(creature,{item,damage:20},config).length,1);
});

test("Tier 7 recipes retain normal structural materials and use DC 70", () => {
  const item=weapon(); item.system.traits.value=["magical"];
  const recipe=buildCraftingRecipeFromBand("weapon-sword",{targetItem:item,coreMaterialId:"omnipotisium",tier:2});
  assert.equal(recipe.tier,7);
  assert.equal(calculateWorkBlockDC(7).dc,70);
  const groups=recipe.ingredientSets[0].groups;
  assert.equal(groups.find(group=>group.id === "core").options[0].tier,7);
  assert.equal(groups.find(group=>group.id === "magic-catalyst").options[0].tier,6);
  for(const group of groups.filter(group=>group.id !== "core")) for(const option of group.options) {
    if(option.materialId !== "omnipotisium") assert.ok((option.maximumTier ?? option.tier)<=6);
  }
});

test("legacy Omnipotentium migrates to Tier 7 without altering quantities or runes", () => {
  const config=defaults();
  assert.equal(normalizeItemFlags({material:"omnipotisium",tier:2},config).tier,7);
  const source={name:"Omni Steel Ingots",system:{quantity:17},flags:{[MODULE_ID]:{resource:{materialId:"omnipotisium",tier:2}}}};
  const patch=itemRefreshPatch(source,config);
  assert.equal(patch.name,"Omnipotentium Ingots");
  assert.equal(patch[`flags.${MODULE_ID}.resource`].tier,7);
  assert.equal(patch["system.quantity"],undefined);
  const item=weapon(); item.flags[MODULE_ID].tier=2;
  const itemPatch=itemRefreshPatch(item,config);
  assert.equal(itemPatch[`flags.${MODULE_ID}.tier`],7);
  assert.equal(itemPatch["system.runes"],undefined);
});

test("new custom ores enter weapon recipes and use the metal profession", () => {
  const config=newCustomOre(defaults(),"Moon Iron","custom-moon-iron");
  config.materials["custom-moon-iron"].oreTier=3;
  const previous=globalThis.game;
  globalThis.game={settings:{get:(_module,key)=>key === "rulesConfig" ? config : false}};
  try {
    const recipe=buildCraftingRecipeFromBand("weapon-sword",{targetItem:weapon(),coreMaterialId:"custom-moon-iron",tier:1});
    assert.equal(recipe.tier,3);
    assert.equal(recipe.ingredientSets[0].groups[0].options[0].materialId,"custom-moon-iron");
    assert.ok(buildArtisanSlots(recipe)[0].materialIds.includes("metal"));
  } finally { globalThis.game=previous; }
});
