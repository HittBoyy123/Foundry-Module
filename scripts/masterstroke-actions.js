import { MODULE_ID } from "./constants.js";
import { currentMasterstroke, masterstrokeAvailable, masterstrokeArmed, CHOSEN_MASTERSTROKES } from "./masterstroke-rules.js";
import { masterstrokeRequest } from "./masterstroke-authority.js";
const list = collection => Array.from(collection?.contents ?? collection ?? []);
const escape = text => String(text ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[c]);
const grant = item => item.flags?.[MODULE_ID]?.masterstrokeAction;
const mixed = new Set(["guardians-weapon", "unbreakable-guard"]);
const activationRequirements = {
  "perfect-balance": "You are wielding the granting weapon.",
  "unyielding-edge": "You are wielding the granting weapon.",
  "guardians-weapon": "You are wielding the granting weapon and hit with a Strike.",
  "protective-finish": "You are wearing the granting armour or have the granting shield raised when you take damage.",
  "artisans-triumph": "You are wielding the granting weapon. Activate this free action before rolling a Strike with it.",
  "unerring-strike": "You are wielding the granting weapon. Activate this free action before rolling a Strike with it.",
  "relentless-assault": "You are wielding the granting weapon. Activate this free action before rolling a Strike with it.",
  "overwhelming-impact": "You are wielding the granting weapon. Activate this free action before rolling a Strike with it.",
  "defy-death": "You are wearing the granting armour. Activate this free action before the incoming attack is rolled.",
  "unbreakable-guard": "You are wielding the granting shield. Activate this free action before applying damage with Shield Block.",
  "perfect-focus": "You have the granting spell focus equipped. Activate this free action before your spell attack or the target’s saving throw is rolled.",
  "adamant-will": "You are wearing the granting item. Activate this free action before rolling your saving throw.",
};
const introductions = {
  "artisans-triumph": "You draw on a moment of exceptional craftsmanship, turning a telling blow into a decisive strike.",
  "perfect-balance": "Your weapon settles naturally into each motion, allowing one attack to flow into the next.",
  "unerring-strike": "A precise adjustment turns a narrowly missed blow into a telling strike.",
  "unyielding-edge": "Your weapon’s flawless working surface cuts through an otherwise stubborn defence.",
  "relentless-assault": "You carry the momentum of a missed blow into an immediate follow-up attack.",
  "guardians-weapon": "A successful blow draws forth the protective strength worked into your weapon.",
  "overwhelming-impact": "You channel the force of a decisive blow to send your foe sprawling or drive them back.",
  "limitless-channel": "An additional channel within the craftsmanship holds another thread of enchantment.",
  "indomitable-construction": "Exceptional joints and reinforcement give this piece remarkable durability.",
  "protective-finish": "A carefully worked protective finish softens an incoming blow.",
  "defy-death": "An inspired contour in your armour turns a devastating blow aside.",
  "unbreakable-guard": "You meet the impact with your shield’s strongest point, preserving its integrity.",
  "perfect-focus": "You draw a clear resonance from your focus to guide your magic past a faltering moment.",
  "adamant-will": "The steady presence of your equipment helps you withstand a dangerous effect.",
  "weightless-wonder": "An extraordinary arrangement of materials lets you move with unexpected ease.",
};

export function masterstrokeActionSource(item) {
  const stroke = currentMasterstroke(item);
  if (!stroke || item.isIdentified === false || !item.isEquipped || item.system?.containerId) return null;
  const available = masterstrokeAvailable(item);

  const chosen = CHOSEN_MASTERSTROKES.has(stroke.id);
  const armed = available && chosen && masterstrokeArmed(item);
  const frequency = stroke.frequency ? `Once per ${stroke.frequency}` : "Always active";
  const status = !available ? (mixed.has(stroke.id) ? "Limited use spent; passive benefit remains active." : "Spent. This ability refreshes at its listed interval; daily uses also refresh when you Rest for the Night.") : chosen ? (armed ? "Armed for the next eligible trigger." : "Use this action to arm the next eligible trigger. Arming does not spend the use; an ineligible or cancelled roll leaves it ready.") : "Applies automatically when its conditions are met.";
  const requirements = activationRequirements[stroke.id] ?? "You have the granting item equipped.";
  const effect = stroke.description.replace(/^Once per (?:day|encounter|round|turn), /, "").replace(/^\w/, c => c.toUpperCase());
  const introduction = introductions[stroke.id] ?? "The exceptional craftsmanship of your equipment lends you its benefit.";
  const description = `${stroke.frequency ? `<p><strong>Frequency</strong> ${escape(frequency.toLowerCase())}</p>` : ""}<p><strong>Requirements</strong> ${escape(requirements)}</p><hr /><p>${escape(introduction)}</p><p><strong>Effect</strong> ${escape(effect)}</p>${chosen ? "<p><strong>Special</strong> Activating this ability arms it for the next eligible trigger. The use is spent only when its effect applies; a cancelled or ineligible roll does not expend it.</p>" : ""}<p><strong>Status</strong> ${escape(status)}</p>`;
  return { name: stroke.name, type: "action", img: chosen ? "systems/pf2e/icons/actions/FreeAction.webp" : "systems/pf2e/icons/actions/Passive.webp",
    flags: { [MODULE_ID]: { masterstrokeAction: { itemId: item.id, instanceId: stroke.instanceId } } },
    system: { actionType: { value: chosen ? "free" : "passive" }, actions: { value: null }, category: "interaction",
      description: { value: description },
      frequency: ["day", "round", "turn"].includes(stroke.frequency) ? { max: 1, value: available ? 1 : 0, per: stroke.frequency } : null, traits: { value: [] }, rules: [] } };
}

export async function syncMasterstrokeActions(actor) {
  if (!["character", "npc"].includes(actor?.type)) return;
  const gm = list(game.users).filter(user => user.active && user.isGM).sort((a,b) => a.id.localeCompare(b.id))[0];
  if (gm ? gm.id !== game.user.id : !actor.isOwner) return;
  const items = list(actor.items);
  const expected = new Map(items.filter(item => !grant(item)).map(item => [item.id, masterstrokeActionSource(item)]).filter(([,source]) => source));
  const remove = [], updates = [];
  for (const action of items.filter(grant)) {
    const source = expected.get(grant(action).itemId);
    if (!source) { remove.push(action.id); continue; }
    expected.delete(grant(action).itemId);
    const stored = action._source ?? action;
    const frequency = stored.system?.frequency;
    const wantedFrequency = source.system.frequency;
    const frequencyChanged = Boolean(frequency) !== Boolean(wantedFrequency)
      || ["value", "max", "per"].some(key => frequency?.[key] !== wantedFrequency?.[key]);
    if (frequencyChanged || stored.name !== source.name || stored.img !== source.img || stored.system?.description?.value !== source.system.description.value || stored.system?.actionType?.value !== source.system.actionType.value || grant(action).instanceId !== source.flags[MODULE_ID].masterstrokeAction.instanceId)
      updates.push({ _id: action.id, ...source });
  }
  const options = { wrathmakerActionSync: true };
  if (remove.length) await actor.deleteEmbeddedDocuments("Item", remove, options);
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates, options);
  if (expected.size) await actor.createEmbeddedDocuments("Item", [...expected.values()], options);
}

export function installMasterstrokeActionUse(ActionClass = CONFIG.PF2E.Item.documentClasses.action) {
  const original = ActionClass?.prototype?.toMessage;
  if (!original || original.cmtMasterstrokeAction) return;
  const wrapped = async function(...args) {
    const data = grant(this);
    if (!data) return original.apply(this, args);
    const source = this.actor?.items.get(data.itemId);
    if (!source || !masterstrokeActionSource(source)) { ui.notifications.warn("This item-granted ability is no longer available."); return; }
    const stroke = currentMasterstroke(source);
    if (!CHOSEN_MASTERSTROKES.has(stroke?.id) || !masterstrokeAvailable(source)) return original.apply(this, args);
    if (!this.actor.isOwner) { ui.notifications.warn("You must control this character to use this ability."); return; }
    const armed = masterstrokeArmed(source);
    const confirmed = await foundry.applications.api.DialogV2.confirm({ window: { title: stroke.name }, content: `<p>${escape(stroke.description)}</p><p>${armed ? "Disarm this ability?" : "Arm this ability for its next eligible trigger? Its use is spent only when the effect applies."}</p>` });
    if (!confirmed) return;
    await masterstrokeRequest(armed ? "disarm" : "arm", source, this.actor);
    ui.notifications.info(`${stroke.name}: ${armed ? "disarmed" : "armed"}.`);
  };
  wrapped.cmtMasterstrokeAction = true;
  ActionClass.prototype.toMessage = wrapped;
}

export function registerMasterstrokeActions() {
  const pending = new Map();
  const running = new Set();
  const dirty = new Set();
  const schedule = actor => {
    if (!actor || pending.has(actor.uuid)) return;
    if (running.has(actor.uuid)) { dirty.add(actor.uuid); return; }
    pending.set(actor.uuid, setTimeout(async () => {
      pending.delete(actor.uuid);
      running.add(actor.uuid);
      try { await syncMasterstrokeActions(actor); } catch(error) { console.error("Wrathmaker: could not refresh item-granted actions", error); }
      finally {
        running.delete(actor.uuid);
        if (dirty.delete(actor.uuid)) schedule(actor);
      }
    }, 100));
  };
  const all = () => {
    for (const actor of list(game.actors)) schedule(actor);
    for (const token of list(globalThis.canvas?.tokens?.placeables)) if (token.actor && !token.document.actorLink) schedule(token.actor);
  };
  Hooks.once("ready", () => { installMasterstrokeActionUse(); all(); });
  Hooks.on("createItem", (item, options) => { if (!options?.wrathmakerActionSync) schedule(item.actor); });
  Hooks.on("updateItem", (item, changes, options) => { if (!options?.wrathmakerActionSync) schedule(item.actor); });
  Hooks.on("deleteItem", (item, options) => { if (!options?.wrathmakerActionSync) schedule(item.actor); });
  for (const event of ["updateWorldTime", "updateCombat", "createCombat", "deleteCombat", "canvasReady", "updateUser"]) Hooks.on(event, all);
  Hooks.on("updateSetting", setting => { if (setting.key === `${MODULE_ID}.masterstrokeEncounter`) all(); });
  Hooks.on("pf2e.restForTheNight", async actor => {
    if (!actor.isOwner) return;
    const updates = list(actor.items).filter(item => currentMasterstroke(item)?.frequency === "day").map(item => ({ _id: item.id, [`flags.${MODULE_ID}.crafting.masterstrokeUses.-=day`]: null, [`flags.${MODULE_ID}.crafting.masterstrokeClaims.-=day`]: null, [`flags.${MODULE_ID}.crafting.masterstrokeArmed`]: null }));
    if (updates.length) await actor.updateEmbeddedDocuments("Item", updates, { wrathmakerUpgrade: true });
    schedule(actor);
  });
  const controls = (sheet, html) => {
    const actor = sheet.actor ?? sheet.document;
    if (!["character", "npc"].includes(actor?.type)) return;
    const root = html?.querySelectorAll ? html : html?.[0];
    if (!root || !actor.isOwner) return;
    for (const row of root.querySelectorAll("[data-item-id]")) {
      const action = actor.items.get(row.dataset.itemId);
      const data = grant(action ?? {});
      const source = data && actor.items.get(data.itemId);
      if (!source || !CHOSEN_MASTERSTROKES.has(currentMasterstroke(source)?.id) || !masterstrokeAvailable(source) || !masterstrokeActionSource(source) || row.querySelector("[data-cmt-arm]")) continue;
      const use = row.querySelector('[data-action="use-action"]');
      if (use && !use.dataset.cmtArmBound) {
        use.dataset.cmtArmBound = "true";
        use.addEventListener("click", event => { event.preventDefault(); event.stopImmediatePropagation(); void action.toMessage().catch(error => ui.notifications.error(error.message)); }, true);
      }
      const host = row.querySelector(".item-controls");
      if (!host) continue;
      const button = document.createElement("a");
      button.dataset.cmtArm = "true";
      button.role = "button"; button.tabIndex = 0;
      button.title = masterstrokeArmed(source) ? "Disarm Masterstroke" : "Arm Masterstroke";
      button.setAttribute("aria-label", button.title);
      button.innerHTML = '<i class="fa-solid fa-bolt" aria-hidden="true"></i>';
      const activate = async event => { event.preventDefault(); event.stopPropagation(); try { await action.toMessage(); } catch(error) { ui.notifications.error(error.message); } };
      button.addEventListener("click", activate);
      button.addEventListener("keydown", event => { if (["Enter", " "].includes(event.key)) void activate(event); });
      host.prepend(button);
    }
  };
  Hooks.on("renderActorSheet", controls);
  Hooks.on("renderApplicationV2", controls);
  Hooks.on("preUpdateItem", (item, changes) => {
    if (!item.flags?.[MODULE_ID]?.crafting?.masterstrokeArmed) return;
    if (Object.keys(changes).some(key => key.startsWith("system.equipped") || key === "system.containerId") || changes.system?.equipped || Object.hasOwn(changes.system ?? {}, "containerId"))
      changes[`flags.${MODULE_ID}.crafting.masterstrokeArmed`] = null;
  });
}
