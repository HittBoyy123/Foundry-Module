import { MODULE_ID } from "./constants.js";
import { PROFESSION_DEFINITIONS } from "../content/professions.js";
import { getActorProfessions } from "./professions.js";

export function bestCraftingTool(actor, materialId, professionIds = []) {
  const core = materialId === "omnipotisium" ? "metal" : materialId;
  const eligible = getActorProfessions(actor).filter(profession => professionIds.length
    ? professionIds.includes(profession.id) : profession.materialIds.includes(core)).map(p => p.id);
  return Array.from(actor?.items?.contents ?? actor?.items ?? []).filter(item => {
    const tool = item.flags?.[MODULE_ID]?.craftingTool;
    return item.type === "equipment" && Number(item.system?.quantity ?? 1) > 0
      && item.system?.equipped?.carryType !== "dropped" && eligible.includes(tool?.professionId)
      && Number.isInteger(tool?.tier) && tool.tier >= 1 && tool.tier <= 6;
  }).map(item => ({ item, tier: item.flags[MODULE_ID].craftingTool.tier, bonus: item.flags[MODULE_ID].craftingTool.tier * 5 }))
    .sort((a,b) => b.bonus - a.bonus)[0] ?? null;
}

export function insertCraftingToolEditor(item, root) {
  if (item.type !== "equipment" || !globalThis.game?.user?.isGM || root.querySelector('[data-cmt-tool-editor]')) return;
  const host = root.querySelector('.tab[data-tab="details"], .tab.details');
  if (!host) return;
  const panel = document.createElement('fieldset'); panel.dataset.cmtToolEditor = 'true';
  const legend = document.createElement('legend'); legend.textContent = 'Crafting Tools — GM';
  const profession = document.createElement('select'); profession.setAttribute('aria-label','Tool profession');
  profession.add(new Option('Not a crafting tool set',''));
  for (const entry of PROFESSION_DEFINITIONS) profession.add(new Option(entry.name,entry.id));
  const tier = document.createElement('select'); tier.setAttribute('aria-label','Tool tier');
  for (let value=1; value<=6; value++) tier.add(new Option(`Tier ${value} — +${value*5}`,String(value)));
  profession.value = item.flags?.[MODULE_ID]?.craftingTool?.professionId ?? '';
  tier.value = String(item.flags?.[MODULE_ID]?.craftingTool?.tier ?? 1);
  const note = document.createElement('p'); note.textContent = 'The lead crafter uses their best carried tool set for the relevant profession. Bonuses do not stack between sets. Applies only to Work Blocks.';
  const save = document.createElement('button'); save.type='button'; save.textContent='Save Tool Set';
  save.addEventListener('click',async event => {
    event.preventDefault(); save.disabled=true;
    try {
      if (!game.user.isGM) throw new Error('Only a GM can configure crafting tools.');
      await item.update({[`flags.${MODULE_ID}.craftingTool`]: profession.value ? {professionId:profession.value,tier:Number(tier.value)} : null});
      ui.notifications.info('Crafting tool set updated.');
    } catch(error) { ui.notifications.error(error.message); }
    finally { save.disabled=false; }
  });
  panel.append(legend,profession,tier,note,save); host.append(panel);
}
