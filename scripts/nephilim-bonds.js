import { getPartyNephilimPoints, NEPHILIM_POINTS_MAX } from "./campaign-resources.js";
import { MODULE_ID } from "./constants.js";

const LEGACY_LEVELS = [5, 10, 15, 20];
export const NEPHILIM_BOND_SLOTS = Object.freeze(Array.from({length: NEPHILIM_POINTS_MAX}, (_, i) => i + 1));

export const NEPHILIM_BONDS = Object.freeze([
  { id: "toughness", name: "Ao's Toughness", description: "+8 maximum HP per character level." },
  { id: "will", name: "Ao's Will", description: "+3 to one saving throw.", choices: ["fortitude", "reflex", "will"] },
  { id: "skin", name: "Nephilim Skin", description: "+2 AC." },
  { id: "wisdom", name: "Ao's Wisdom", description: "+2 spell attack and spell DC." },
  { id: "precision", name: "Ao's Precision", description: "+2 weapon and unarmed attack rolls." },
  { id: "form", name: "Nephilim Form", description: "+1 to one attribute modifier.", choices: ["str", "dex", "con", "int", "wis", "cha"] },
  { id: "communion", name: "Ao's Communion", minimumPoints: 2, ally: true, description: "+3 AC while another party member has an active Ao's Communion bond. No distance limit." },
  { id: "pincer", name: "Ao's Pincer", minimumPoints: 2, ally: true, description: "+3 to attack rolls while another party member has an active Ao's Pincer bond. No distance limit." },
  { id: "charge", name: "Nephilim Charge", minimumPoints: 2, description: "+3 to your next melee Strike after moving at least 20 feet immediately before it on the same turn. Enable Charge in your roll options after moving." },
  { id: "valor", name: "Valor of Ao", minimumPoints: 2, ally: true, choices: ["fortitude", "reflex", "will"], description: "+4 to your chosen saving throw while another party member has an active Valor of Ao bond. Each character chooses their own save. No distance limit." },
  { id: "stamina", name: "Ao's Stamina", minimumPoints: 2, description: "One additional spell slot at every accessible ranked spell level, per selection. Uses normal preparation, casting and rest. Cantrips and focus spells do not gain slots." },
]);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const items = actor => Array.from(actor?.items?.contents ?? actor?.items ?? []);
const bond = item => item?.flags?.[MODULE_ID]?.nephilimBond;
const slotOf = item => bond(item)?.slot ?? (LEGACY_LEVELS.indexOf(bond(item)?.milestone) + 1);
export function isActiveBond(item, actor = item?.actor ?? item?.parent) {
  const definition = NEPHILIM_BONDS.find(d => d.id === bond(item)?.id);
  const slot = slotOf(item);
  return Boolean(actor && definition && slot >= 1 && slot <= bondAllowance(actor)
    && bondAllowance(actor) >= (definition.minimumPoints ?? 1)
    && items(actor).find(candidate => bond(candidate) && slotOf(candidate) === slot) === item);
}
const collectionValues = collection => Array.from(collection?.contents ?? collection?.values?.() ?? collection ?? []);
const sameActor = (a, b) => a === b || Boolean(a?.id && a.id === b?.id);
function partyMembers(party) {
  const saved = party.system?.details?.members ?? party._source?.system?.details?.members;
  if (!Array.isArray(saved)) return collectionValues(party.members);
  const world = collectionValues(globalThis.game?.actors);
  return saved.map(entry => world.find(actor => actor.uuid === entry.uuid || entry.uuid === `Actor.${actor.id}`)
    ?? collectionValues(party.members).find(actor => actor.uuid === entry.uuid)).filter(Boolean);
}
export function bondParties(actor) {
  const candidates = new Set([...collectionValues(actor?.parties), ...collectionValues(globalThis.game?.actors).filter(a => a.type === "party")]);
  return [...candidates].filter(party => {
    const saved = party.system?.details?.members ?? party._source?.system?.details?.members;
    return Array.isArray(saved) ? saved.some(entry => entry.uuid === actor?.uuid || entry.uuid === `Actor.${actor?.id}`)
      : collectionValues(actor?.parties).includes(party);
  });
}
export function matchingBondAllies(actor, id) {
  const allies = new Map();
  for (const party of bondParties(actor)) for (const ally of partyMembers(party)) {
    if (sameActor(ally, actor) || !items(ally).some(item => bond(item)?.id === id && isActiveBond(item, ally))) continue;
    allies.set(ally.uuid ?? ally.id ?? ally, ally);
  }
  return [...allies.values()];
}
export function hasBondAlly(actor, id) { return matchingBondAllies(actor, id).length > 0; }
export function bondAllowance(actor) {
  // Never sum separate party pools. Saved membership also works during preparation.
  return Math.max(0, ...bondParties(actor).map(party => getPartyNephilimPoints(party).value));
}
export function validateBondSelection(selection, existing, allowance) {
  const definition = NEPHILIM_BONDS.find(b => b.id === selection.id);
  if (!NEPHILIM_BOND_SLOTS.includes(selection.slot) || selection.slot > allowance)
    throw new Error("This bond slot requires more shared Nephilim points.");
  if (!definition) throw new Error("Choose a valid Nephilim Bond.");
  if (allowance < (definition.minimumPoints ?? 1))
    throw new Error(`This bond requires ${definition.minimumPoints} shared Nephilim points.`);
  if (definition.choices && !definition.choices.includes(selection.choice))
    throw new Error("Choose the saving throw or attribute for this bond.");
  return definition;
}

export function createBondSource(selection) {
  const minimumPoints = NEPHILIM_BONDS.find(b => b.id === selection.id)?.minimumPoints ?? 1;
  const definition = validateBondSelection(selection, [], Math.max(selection.slot, minimumPoints));
  const predicate = [];
  // PF2e's closed modifier-type enum uses an additive carrier. The source label
  // identifies the independent Nephilim Gift category without changing core types.
  const flat = (selector, value) => ({ key: "FlatModifier", selector, value, type: "untyped",
    slug: `nephilim-bond-${selection.id}-${selection.slot}`, label: definition.name, predicate });
  const rules = {
    toughness: [flat("hp-per-level", 8)], will: [flat(selection.choice, 3)],
    skin: [flat("ac", 2)], wisdom: [flat(["spell-attack", "spell-dc"], 2)],
    precision: [flat("strike-attack-roll", 2)],
    communion: [flat("ac", 3)], pincer: [flat("attack-roll", 3)], valor: [flat(selection.choice, 4)],
    charge: [{ key: "RollOption", domain: "all", option: "nephilim-charge", toggleable: true,
      label: "Charge — moved 20 feet before this melee Strike", value: false },
      { ...flat("strike-attack-roll", 3), predicate: ["nephilim-charge", "item:melee"] }],
    stamina: [], // Native spell-slot updates are reconciled separately.
    form: [{ key: "ActiveEffectLike", mode: "add", path: `system.abilities.${selection.choice}.mod`,
      label: definition.name, value: 1, phase: "beforeDerived", predicate }],
  }[selection.id];
  return { name: definition.name, type: "feat", img: "icons/magic/light/beam-rays-yellow-blue-large.webp",
    flags: { [MODULE_ID]: { nephilimBond: { id: selection.id, slot: selection.slot, schemaVersion: 2, choice: selection.choice ?? "" } } },
    system: { category: "bonus", level: { value: 1 }, traits: { value: [], rarity: "unique" },
      description: { value: `<p>${definition.description}</p><p>Nephilim Gift${definition.choices ? `: ${escape(selection.choice)}` : ""}. Bond slot ${selection.slot}. Requires at least ${Math.max(selection.slot, minimumPoints)} shared Nephilim points. Repeated bonds stack.</p>` },
      rules, slug: `nephilim-bond-${selection.id}-${selection.slot}` } };
}

export async function chooseBond(actor, milestone) {
  if (!actor.isOwner || !NEPHILIM_BOND_SLOTS.includes(milestone) || bondAllowance(actor) < milestone) return;
  const current = items(actor).find(i => slotOf(i) === milestone);
  const selected = bond(current);
  const existing = items(actor).map(bond).filter(Boolean);
  const options = NEPHILIM_BONDS.filter(definition => (definition.minimumPoints ?? 1) <= bondAllowance(actor));
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: `Nephilim Bond — Slot ${milestone}` },
    content: `<p>One bond per shared party point. You may choose the same gift repeatedly; its effects stack.</p>
      <label>Bond <select name="bond">${options.map(b => `<option value="${b.id}" ${selected?.id === b.id ? "selected" : ""}>${escape(b.name)}</option>`).join("")}</select></label>
      <label>Ao's Will / Valor of Ao — Save <select name="save">${["fortitude", "reflex", "will"].map(c => `<option ${selected?.choice === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
      <label>Nephilim Form — Attribute <select name="attribute">${["str", "dex", "con", "int", "wis", "cha"].map(c => `<option ${selected?.choice === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
      <ul>${options.map(b => `<li><strong>${escape(b.name)}</strong>: ${b.description}</li>`).join("")}</ul>`,
    buttons: [{ action: "save", label: "Select Bond", default: true, callback: (_event, button) => {
      const form = button.form;
      const id = form.elements.namedItem("bond").value;
      return { id, slot: milestone, choice: ["will", "valor"].includes(id) ? form.elements.namedItem("save").value : id === "form" ? form.elements.namedItem("attribute").value : "" };
    } }, { action: "cancel", label: "Cancel", callback: () => null }], rejectClose: false,
  });
  if (!result || typeof result !== "object") return;
  // Re-read after the dialog: another user may have changed the character.
  if (!actor.isOwner) return;
  validateBondSelection(result, items(actor).map(bond).filter(Boolean), bondAllowance(actor));
  const latest = items(actor).find(i => slotOf(i) === milestone);
  const source = createBondSource(result);
  if (latest) await actor.updateEmbeddedDocuments("Item", [{ _id: latest.id, ...source }]);
  else await actor.createEmbeddedDocuments("Item", [source]);
}

/** Saved slots remain visible even while the shared point pool is lower. */
export function bondMilestones(actor) {
  return NEPHILIM_BOND_SLOTS.map(milestone => {
    const item = items(actor).find(item => slotOf(item) === milestone);
    return { milestone, name: item?.name ?? "Not chosen", choice: bond(item)?.choice ?? "",
      selected: Boolean(item), active: Boolean(item && isActiveBond(item, actor)), unlocked: bondAllowance(actor) >= milestone };
  });
}

const BOND_CHOICE_LABELS = Object.freeze({
  fortitude: "Fortitude", reflex: "Reflex", will: "Will",
  str: "Strength", dex: "Dexterity", con: "Constitution",
  int: "Intelligence", wis: "Wisdom", cha: "Charisma",
});

export function bondSummary(actor) {
  const slots = bondMilestones(actor);
  const names = slots.filter(slot => slot.selected).map(slot => {
    const choice = BOND_CHOICE_LABELS[slot.choice] ?? slot.choice;
    return slot.name + (choice ? ` (${choice})` : "") + (slot.active ? "" : " [Inactive]");
  });
  if (names.length) return names.join(" • ");
  const pending = slots.filter(slot => slot.unlocked).length;
  return pending ? `Choose Nephilim Bonds · ${pending} available` : "Nephilim Bonds";
}

export async function openNephilimBonds(actor) {
  // Rebuild after each choice using the current shared point allowance.
  while (true) {
    const slots = bondMilestones(actor);
    const first = slots.find(slot => slot.unlocked && !slot.selected) ?? slots.find(slot => slot.unlocked);
    const content = '<p>Each shared party point unlocks one bond slot. Repeated choices stack. If points decrease, later slots become inactive without losing their choices.</p>'
      + '<fieldset><legend>Nephilim Bonds</legend>' + slots.map(slot =>
        '<label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--color-border-light-primary)">'
        + '<input type="radio" name="milestone" value="' + slot.milestone + '" '
        + (slot === first ? 'checked ' : '') + (!slot.unlocked || !actor.isOwner ? 'disabled ' : '') + '>'
        + '<span><strong>Bond slot ' + slot.milestone + '</strong><br>' + escape(slot.name)
        + (slot.choice ? ' (' + escape(slot.choice) + ')' : '')
        + (!slot.unlocked ? ' — Inactive' : '') + '</span></label>').join('') + '</fieldset>';
    const buttons = [];
    if (actor.isOwner && first) buttons.push({ action: "choose", label: "Choose / Change Bond", default: true,
      callback: (_event, button) => Number(button.form.elements.namedItem("milestone").value) });
    buttons.push({ action: "close", label: "Close", callback: () => null });
    const milestone = await foundry.applications.api.DialogV2.wait({
      window: { title: "Nephilim Bonds" }, content, buttons, rejectClose: false,
    });
    if (!NEPHILIM_BOND_SLOTS.includes(milestone)) return;
    await chooseBond(actor, milestone);
  }
}

export function injectNephilimBondBar(application, html) {
  const actor = application.actor ?? application.document;
  const element = html ?? application.element;
  const root = element?.querySelector ? element : element?.[0];
  const details = root?.querySelector('.tab.character .subsection.details');
  const identity = (root?.matches?.(".abcd") ? root : root?.querySelector(".abcd"))
    ?? details ?? root?.querySelector('[data-tab="character"] .details, .sheet-body .details, .window-content form, form');
  if (actor?.type !== "character" || !identity || identity.querySelector(".cmt-nephilim-bonds")) return;
  const section = document.createElement("div");
  section.className = "cmt-nephilim-bonds";
  const title = document.createElement("span");
  title.className = "details-label";
  title.textContent = "Nephilim Bonds";
  section.append(title);
  const field = document.createElement("div");
  field.className = "cmt-nephilim-bonds-field";
  const value = document.createElement("strong");
  value.className = "value";
  value.textContent = bondSummary(actor);
  value.title = value.textContent;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cmt-nephilim-bonds-open";
  button.innerHTML = '<i class="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i>';
  button.title = "Open Nephilim Bonds";
  const refreshAttention = () => {
    const pending = bondMilestones(actor).filter(slot => slot.unlocked && !slot.selected).length;
    button.classList.toggle("has-unallocated-bonds", pending > 0);
    button.setAttribute("aria-label", pending
      ? `Open Nephilim Bonds — ${pending} unchosen ${pending === 1 ? "bond" : "bonds"} available`
      : "Open Nephilim Bonds");
  };
  refreshAttention();
  button.addEventListener("click", async event => {
    event.preventDefault();
    event.stopPropagation();
    button.disabled = true;
    try { await openNephilimBonds(actor); }
    catch (error) { ui.notifications.error(error.message); }
    finally {
      value.textContent = bondSummary(actor);
      value.title = value.textContent;
      refreshAttention();
      button.disabled = false;
    }
  });
  field.append(value, button);
  section.append(field);
  identity.append(section);
}

/** Replace legacy rules only in prepared data; original choices remain recoverable. */
export function preparedBondRules(item) {
  const actor = item.actor ?? item.parent;
  const slot = slotOf(item);
  if (!isActiveBond(item, actor)) return [];
  const definition = NEPHILIM_BONDS.find(definition => definition.id === bond(item).id);
  if (!definition || bondAllowance(actor) < (definition.minimumPoints ?? 1)) return [];
  if (definition.ally && !hasBondAlly(actor, definition.id)) return [];
  // Duplicate documents in one slot must not grant duplicate effects.
  if (items(actor).find(candidate => slotOf(candidate) === slot && bond(candidate)) !== item) return [];
  const rules = createBondSource({ ...bond(item), slot }).system.rules;
  if (definition.id === "charge") rules[0].value = item.system.rules?.find(rule => rule.key === "RollOption")?.value === true;
  return rules;
}

/** Add slots once per rank, not once per spellcasting entry. Keep native casting/rest. */
export function staminaSlotUpdates(actor) {
  const count = items(actor).filter(item => bond(item)?.id === "stamina" && isActiveBond(item, actor)).length;
  const entries = items(actor).filter(item => item.type === "spellcastingEntry");
  const assigned = new Set();
  return entries.flatMap(entry => {
    const system = entry._source?.system ?? entry.system;
    const previous = entry.flags?.[MODULE_ID]?.nephilimStamina ?? {};
    const update = { _id: entry.id };
    const eligible = ["prepared", "spontaneous"].includes(system.prepared?.value);
    const next = {};
    for (let rank = 1; rank <= 10; rank++) {
      const key = `slot${rank}`, slot = system.slots?.[key];
      if (!slot) continue;
      const old = Number(previous[key] ?? 0);
      const base = Math.max(0, Number(slot.max ?? 0) - old);
      const bonus = eligible && base > 0 && !assigned.has(rank) ? count : 0;
      if (bonus) assigned.add(rank);
      next[key] = bonus;
      if (bonus === old) continue;
      const max = base + bonus;
      update[`system.slots.${key}.max`] = max;
      update[`system.slots.${key}.value`] = Math.max(0, Math.min(max, Number(slot.value ?? 0) + bonus - old));
    }
    if (Object.keys(update).length === 1) return [];
    update[`flags.${MODULE_ID}.nephilimStamina`] = next;
    return [update];
  });
}

/** Party-wide aura indicators; each selected bond remains the sole bonus source. */
export function bondAuraSources(actor) {
  return NEPHILIM_BONDS.filter(definition => definition.ally && items(actor).some(item => bond(item)?.id === definition.id && isActiveBond(item, actor))).map(definition => {
    const allies = matchingBondAllies(actor, definition.id);
    const active = allies.length > 0;
    return { name: `${definition.name} — Bond Aura`, type: "effect", img: "icons/magic/light/beam-rays-yellow-blue-large.webp",
      flags: { [MODULE_ID]: { nephilimAura: { id: definition.id, active, allies: allies.map(a => a.uuid ?? a.id ?? a.name ?? "Ally") } } },
      system: { slug: `nephilim-aura-${definition.id}`, level: { value: 1 }, tokenIcon: { show: true },
        duration: { value: -1, unit: "unlimited", expiry: null, sustained: false },
        traits: { value: [], rarity: "unique" },
        description: { value: `<p><strong>Party-wide aura</strong> · No distance limit.</p><p><strong>${active ? "Active" : "Waiting for a matching ally"}</strong></p><p>${escape(definition.description)}</p>`
          + (active ? `<p>Linked allies: ${allies.map(a => escape(a.name ?? "Ally")).join(", ")}.</p>` : "<p>Another member of your party must have the same active bond.</p>")
          + "<p>Bonuses come from your selected bonds. Repeated selections stack; additional allies do not multiply the bonus.</p>" },
        rules: [] } };
  });
}
export async function syncBondAuras(actor) {
  const wanted = bondAuraSources(actor);
  const existing = items(actor).filter(item => item.flags?.[MODULE_ID]?.nephilimAura);
  const used = new Set();
  const remove = [], update = [], create = [];
  for (const item of existing) {
    const id = item.flags[MODULE_ID].nephilimAura.id;
    const source = wanted.find(source => source.flags[MODULE_ID].nephilimAura.id === id);
    if (!source || used.has(id)) { remove.push(item.id); continue; }
    used.add(id);
    if (item.name !== source.name || JSON.stringify(item.flags[MODULE_ID].nephilimAura) !== JSON.stringify(source.flags[MODULE_ID].nephilimAura)
      || item.system?.description?.value !== source.system.description.value || item.system?.rules?.length) update.push({ _id: item.id, ...source });
  }
  for (const source of wanted) if (!used.has(source.flags[MODULE_ID].nephilimAura.id)) create.push(source);
  const options = { nephilimSync: true };
  if (remove.length) await actor.deleteEmbeddedDocuments("Item", remove, options);
  if (update.length) await actor.updateEmbeddedDocuments("Item", update, options);
  if (create.length) await actor.createEmbeddedDocuments("Item", create, options);
}

let refreshTimer;
async function clearCharge(actor) {
  const updates = items(actor).filter(item => bond(item)?.id === "charge" && item.system.rules?.some(rule => rule.key === "RollOption" && rule.value === true))
    .map(item => ({ _id: item.id, "system.rules": item.system.rules.map(rule => rule.key === "RollOption" ? { ...rule, value: false } : rule) }));
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
}
function scheduleBondRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    try { for (const actor of new Set([...collectionValues(game.actors), ...(globalThis.canvas?.tokens?.placeables ?? []).map(token => token.actor).filter(Boolean)])) {
      if (actor.type !== "character") continue;
      actor.reset();
      const updater = game.users?.activeGM ?? actor.primaryUpdater;
      if (updater?.id === game.user.id) {
        await syncBondAuras(actor);
        const updates = staminaSlotUpdates(actor);
        if (updates.length) await actor.updateEmbeddedDocuments("Item", updates, { nephilimSync: true });
      }
      for (const app of Object.values(actor.apps ?? {})) app.render(false);
    } } catch (error) { console.error(`${MODULE_ID} | Nephilim bond refresh failed`, error); }
  }, 50);
}

export function installBondRules() {
  const prototype = globalThis.CONFIG?.PF2E?.Item?.documentClasses?.feat?.prototype
    ?? globalThis.CONFIG?.Item?.documentClass?.prototype;
  const original = prototype?.prepareRuleElements;
  const marker = Symbol.for(`${MODULE_ID}.nephilimPointRules`);
  if (!original || original[marker]) return;
  const wrapped = function(...args) {
    if (!bond(this) || (this.actor ?? this.parent)?.type !== "character") return original.apply(this, args);
    const saved = this.system.rules;
    try { this.system.rules = preparedBondRules(this); return original.apply(this, args); }
    finally { this.system.rules = saved; }
  };
  wrapped[marker] = true;
  prototype.prepareRuleElements = wrapped;
}

export function registerNephilimBonds() {
  installBondRules();
  // A shared pool update must re-prepare characters on every connected client.
  Hooks.on("updateActor", (actor, _changes, options = {}) => { if (!options.nephilimSync && ["party", "character"].includes(actor.type)) scheduleBondRefresh(); });
  Hooks.on("createActor", scheduleBondRefresh);
  Hooks.on("deleteActor", scheduleBondRefresh);
  Hooks.on("canvasReady", scheduleBondRefresh);
  Hooks.on("createToken", scheduleBondRefresh);
  Hooks.once("ready", scheduleBondRefresh);
  Hooks.on("createItem", (item, options) => { if (!options.nephilimSync && (bond(item) || item.flags?.[MODULE_ID]?.nephilimAura || item.type === "spellcastingEntry")) scheduleBondRefresh(); });
  Hooks.on("deleteItem", (item, options) => { if (!options.nephilimSync && (bond(item) || item.flags?.[MODULE_ID]?.nephilimAura || item.type === "spellcastingEntry")) scheduleBondRefresh(); });
  Hooks.on("updateItem", (item, changes, options) => {
    if (!options.nephilimSync && (bond(item) || item.flags?.[MODULE_ID]?.nephilimAura || item.type === "spellcastingEntry")) scheduleBondRefresh();
  });
  Hooks.on("createChatMessage", async (message, options, userId) => {
    if (userId !== game.user.id) return;
    const context = message.flags?.pf2e?.context;
    if (context?.type !== "attack-roll" || !context.options?.includes("item:melee") || !context.options.includes("nephilim-charge")) return;
    const actor = message.actor;
    if (actor?.isOwner) await clearCharge(actor);
  });
  Hooks.on("updateCombat", async (_combat, changes) => {
    if (!("turn" in changes || "round" in changes) || game.users?.activeGM?.id !== game.user.id) return;
    for (const actor of game.actors ?? []) {
      if (actor.rollOptions?.all?.["nephilim-charge"]) await clearCharge(actor);
    }
  });
  for (const hook of ["renderActorSheet", "renderActorSheetV2", "renderCharacterSheetPF2e"])
    Hooks.on(hook, injectNephilimBondBar);
}
