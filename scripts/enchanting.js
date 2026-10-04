import { MODULE_ID } from "./constants.js";
import { getRulesConfig } from "./config-store.js";
import { getActorProfessions } from "./professions.js";
import { materialRuneSlots, MANA_RUNE_LEVELS } from "./property-runes.js";
import { reservationLedger } from "./crafting-projects.js";
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
const entries = collection => Array.from(collection?.contents ?? collection ?? []);
const owns = (user, actor) => user?.isGM || actor?.testUserPermission?.(user, "OWNER");
const key = value => String(value).replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/[^a-z0-9]+/g," ").split(" ").filter(word => word && word !== "rune").sort().join(" ");
const primaryGM = () => entries(game.users).filter(u => u.active && u.isGM).sort((a,b) => a.id.localeCompare(b.id))[0];
const channel = `module.${MODULE_ID}`;
const pending = new Map();
let queue = Promise.resolve();

export function runeFits(item, rune) {
  const usage = rune.system?.usage?.value ?? rune.usage ?? "";
  if (item.system?.specific?.value || item.system?.grade) return false;
  if (usage.includes("melee") && item.isMelee === false) return false;
  if (usage.includes("ranged") && item.isRanged === false) return false;
  const damages = ["piercing", "slashing", "bludgeoning"].filter(type => usage.includes(type));
  if (damages.length && !damages.includes(item.system?.damage?.damageType)) return false;
  const categories = ["light", "medium", "heavy"].filter(type => usage.includes(`${type}-armor`));
  if (item.type === "armor" && categories.length && !categories.includes(item.system?.category)) return false;
  return true;
}

export async function propertyRuneChoices(item, tier) {
  if (!item?.sheet) throw new Error("The selected equipment is no longer available. Reopen Enchant and choose it again.");
  if (!Number.isInteger(Number(tier)) || Number(tier) < 1 || Number(tier) > 6) return [];
  const data = await item.sheet.getData();
  const native = data.runeTypes?.property ?? [];
  const pack = game.packs.get("pf2e.equipment-srd");
  if (!pack) throw new Error("The PF2e equipment compendium is unavailable.");
  const index = await pack.getIndex({ fields: ["system.level.value", "system.slug", "system.usage.value"] });
  const existing = item._source?.system?.runes?.property ?? item.system.runes.property ?? [];
  return native.flatMap(rune => {
    if (existing.includes(rune.slug)) return [];
    const source = entries(index).find(entry => key(entry.system?.slug ?? entry.name) === key(rune.slug) || key(entry.name) === key(rune.name));
    if (!source || Number(source.system?.level?.value) > MANA_RUNE_LEVELS[tier - 1] || !runeFits(item, source)) return [];
    // Improved versions replace their lower-grade rune instead of occupying a second slot.
    const family = slug => key(slug).replace(/\b(greater|major|lesser)\b/g, "").trim();
    const replaced = existing.find(slug => family(slug) === family(rune.slug));
    if (existing.length > materialRuneSlots(item) || (!replaced && existing.length >= materialRuneSlots(item))) return [];
    if (replaced) {
      const previous = entries(index).find(entry => key(entry.system?.slug ?? entry.name) === key(replaced));
      if (!previous || Number(previous.system?.level?.value) >= Number(source.system.level.value)) return [];
    }
    return [{ slug: rune.slug, name: rune.name, level: Number(source.system.level.value), uuid: `Compendium.pf2e.equipment-srd.Item.${source._id}`, replaced }];
  });
}

function availableGems(party) {
  const reserved = reservationLedger(party.getFlag(MODULE_ID, "workbench")?.projects ?? []);
  return entries(party.items).filter(item => item.flags?.[MODULE_ID]?.resource?.materialId === "mana-crystals"
    && Number(item.system.quantity) - (reserved.get(item.id) ?? 0) >= 1);
}

export async function applyEnchantment(request, user) {
  if (!getRulesConfig().crafting?.workbenchEnabled) throw new Error("The Workbench is disabled.");
  const party = game.actors.get(request.partyId);
  const artisan = game.actors.get(request.artisanId);
  const item = await fromUuid(request.itemUuid);
  if (party?.type !== "party" || !artisan || !owns(user, artisan) || !getActorProfessions(artisan).some(p => p.id === "enchanting")) throw new Error("Choose an Enchanting artisan you control.");
  if (!user.isGM && !party.testUserPermission?.(user, "OBSERVER")) throw new Error("You cannot access this Party Stash.");
  if (!item || !["weapon", "armor"].includes(item.type) || item.pack || !(owns(user, item.actor) || item.actor?.id === party.id)) throw new Error("Choose equipment you own or equipment in the Party Stash.");
  if (item.flags?.[MODULE_ID]?.upgradeProject) throw new Error("Finish or cancel this item's upgrade first.");
  if (Number(item.system.quantity) !== 1) throw new Error("Split this equipment stack before enchanting.");
  const gem = availableGems(party).find(gem => gem.id === request.gemId);
  if (!gem) throw new Error("An unreserved Mana Gem unit is required.");
  const tier = gem.flags[MODULE_ID].resource.tier;
  const initialRunes = JSON.stringify(item._source?.system?.runes?.property ?? item.system.runes.property ?? []);
  const rune = (await propertyRuneChoices(item, tier)).find(rune => rune.slug === request.slug);
  if (!rune) throw new Error("This rune is not eligible for the item's slots or selected Mana Gem tier.");
  if (!availableGems(party).some(candidate => candidate.id === gem.id)
    || item.flags?.[MODULE_ID]?.upgradeProject || Number(item.system.quantity) !== 1
    || initialRunes !== JSON.stringify(item._source?.system?.runes?.property ?? item.system.runes.property ?? [])) {
    throw new Error("The equipment or available materials changed. Reopen Enchant and try again.");
  }
  const oldRunes = [...(item._source?.system?.runes?.property ?? item.system.runes.property ?? [])];
  const quantity = Number(gem.system.quantity);
  const updated = rune.replaced ? oldRunes.map(slug => slug === rune.replaced ? rune.slug : slug) : [...oldRunes, rune.slug];
  await gem.update({ "system.quantity": quantity - 1 });
  try { await item.update({ "system.runes.property": updated }); }
  catch (error) { await gem.update({ "system.quantity": quantity }); throw error; }
  // A chat failure must never roll back or repeat an already completed enchantment.
  try { await ChatMessage.create({ content: `<section class="cmt-crafting-chat"><h3>${esc(item.name)} — Enchanted</h3><p>${esc(artisan.name)} applied <strong>${esc(rune.name)}</strong> (level ${rune.level}).</p><p>Consumed 1 × ${esc(gem.name)} from ${esc(party.name)}.</p></section>` }); }
  catch (error) { console.warn(`${MODULE_ID} | Enchantment completed but chat failed`, error); }
  return item.name;
}
const enqueue = (request, user) => { const result = queue.catch(() => {}).then(() => applyEnchantment(request, user)); queue = result; return result; };

export function registerEnchanting() {
  Hooks.once("ready", () => game.socket.on(channel, async payload => {
    if (payload?.type === "enchant-result" && payload.userId === game.user.id) {
      const task = pending.get(payload.id);
      if (!task || task.gmId !== payload.gmId) return;
      clearTimeout(task.timer); pending.delete(payload.id);
      payload.error ? task.reject(new Error(payload.error)) : task.resolve(payload.result);
    }
    if (payload?.type !== "enchant-request" || !game.user.isGM || primaryGM()?.id !== game.user.id || payload.gmId !== game.user.id) return;
    const response = { type: "enchant-result", id: payload.id, gmId: game.user.id, userId: payload.userId };
    try {
      const user = game.users.get(payload.userId);
      if (!user?.active) throw new Error("The requesting player is unavailable.");
      response.result = await enqueue(payload.request, user);
    } catch (error) { response.error = error.message; }
    game.socket.emit(channel, response);
  }));
}

async function requestEnchantment(request) {
  const gm = primaryGM();
  if (!gm) throw new Error("An active GM is required to enchant equipment using shared materials.");
  if (gm.id === game.user.id) return enqueue(request, game.user);
  const id = foundry.utils.randomID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error("No GM response. Check the item and stash before retrying.")); }, 20000);
    pending.set(id, { resolve, reject, timer, gmId: gm.id });
    game.socket.emit(channel, { type: "enchant-request", id, userId: game.user.id, gmId: gm.id, request });
  });
}

export async function openEnchanting(party) {
  if (!party) throw new Error("Choose an active party first.");
  const artisans = entries(game.actors).filter(actor => owns(game.user, actor) && getActorProfessions(actor).some(p => p.id === "enchanting"));
  const equipment = [...entries(party.items), ...entries(game.actors).filter(actor => actor.id !== party.id && owns(game.user, actor)).flatMap(actor => entries(actor.items))]
    .filter(item => ["weapon", "armor"].includes(item.type) && materialRuneSlots(item) > 0 && Number(item.system.quantity) === 1 && !item.flags?.[MODULE_ID]?.upgradeProject);
  const gems = availableGems(party);
  if (!artisans.length) throw new Error("Choose the Enchanting profession for a character or NPC you control first. GMs can use any Enchanting artisan.");
  if (!equipment.length) throw new Error("No eligible existing equipment. Place a single weapon or armour with material rune slots in the Party Stash or a character you control. To enchant an item before crafting it, assign an Enchanting artisan in Craft and click Enchant Item below that artisan.");
  if (!gems.length) throw new Error("Add an unreserved Mana Gem to the Party Stash to enchant existing equipment.");
  const options = (list, value, label) => list.map(entry => `<option value="${esc(value(entry))}">${esc(label(entry))}</option>`).join("");
  const selected = await foundry.applications.api.DialogV2.wait({ window: { title: "Enchant Equipment" }, content:
    `<p>One Mana Gem unit per property rune. Material bonuses provide up to three slots.</p><label>Enchanter<select name="artisan">${options(artisans, a=>a.id, a=>a.name)}</select></label><label>Equipment<select name="item">${options(equipment, i=>i.uuid, i=>`${i.name} — ${i.actor?.name}`)}</select></label><label>Mana Gem<select name="gem">${options(gems, g=>g.id, g=>`${g.name} — runes up to level ${MANA_RUNE_LEVELS[g.flags[MODULE_ID].resource.tier-1]}`)}</select></label>`,
    buttons: [{ action: "next", label: "Choose Rune", default: true, callback: (_event, button) => ({ artisanId: button.form.elements.namedItem("artisan").value, itemUuid: button.form.elements.namedItem("item").value, gemId: button.form.elements.namedItem("gem").value }) }], close: () => null });
  if (!selected) return;
  const item = equipment.find(i => i.uuid === selected.itemUuid), gem = gems.find(g => g.id === selected.gemId);
  if (!item || !gem) throw new Error("The selected equipment or Mana Gem is no longer available. Reopen Enchant and choose again.");
  const choices = await propertyRuneChoices(item, gem.flags[MODULE_ID].resource.tier);
  if (!choices.length) throw new Error("No eligible property runes at this Mana Gem tier, or all material rune slots are occupied.");
  const slug = await chooseRuneDialog(item, choices, gem.name, party.name);
  if (!slug) return;
  await requestEnchantment({ ...selected, partyId: party.id, slug });
  ui.notifications.info("Enchantment applied.");
}

export async function chooseRuneDialog(item, choices, gemName, partyName, { planning = false } = {}) {
  const cards = await Promise.all(choices.map(async (rune, index) => {
    const summary = await runeSummary(rune.uuid);
    return `<article class="cmt-rune-choice"><div class="cmt-rune-heading"><label><input type="radio" name="rune" value="${esc(rune.slug)}" ${index === 0 ? "checked" : ""}><strong>${esc(rune.name)}</strong> · Level ${rune.level}</label><button type="button" data-rune-details="${esc(rune.uuid)}" aria-label="Read ${esc(rune.name)}" title="Read full rune details"><i class="fa-solid fa-bookmark" aria-hidden="true"></i></button></div>${rune.replaced ? "<p><em>Replaces the existing lower-grade rune.</em></p>" : ""}<p>${esc(summary || "Open the bookmark to read this rune’s effects.")}</p></article>`;
  }));
  return foundry.applications.api.DialogV2.wait({ window: { title: `Enchant ${item.name}` }, position: { width: 660 }, content:
    `<p>Choose a rune. ${planning ? "Completing the crafting project consumes" : "Enchanting consumes"} 1 × ${esc(gemName)} from ${esc(partyName)}.</p><div class="cmt-rune-choices">${cards.join("")}</div>`,
    render: (_event, dialog) => {
      for (const button of dialog.element.querySelectorAll("[data-rune-details]")) button.addEventListener("click", async event => {
        event.preventDefault();
        try {
          const rune = await fromUuid(button.dataset.runeDetails);
          if (!rune?.sheet) throw new Error("The rune reference is unavailable.");
          rune.sheet.render(true);
        } catch (error) { ui.notifications.error(error.message); }
      });
    },
    buttons: [{ action: "enchant", label: planning ? "Add Rune to Project" : "Enchant · 1 Mana Gem", default: true, callback: (_event, button) => button.form.elements.namedItem("rune").value }], close: () => null });
}

export async function runeSummary(uuid) {
  const source = await fromUuid(uuid);
  const editor = foundry.applications.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
  const description = source?.system?.description?.value ?? "";
  const enriched = editor ? await editor.enrichHTML(description, { async: true, secrets: false }) : "";
  const preview = document.createElement("div");
  preview.innerHTML = enriched;
  const text = (preview.textContent ?? "").replace(/\s+/g, " ").trim();
  const summary = text.length > 260 ? `${text.slice(0, 257).trimEnd()}…` : text;
  return summary;
}
