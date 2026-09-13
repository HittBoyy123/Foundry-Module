import { MODULE_ID } from "./constants.js";

export const NEPHILIM_BOND_LEVELS = Object.freeze([5, 10, 15, 20]);

export const NEPHILIM_BONDS = Object.freeze([
  { id: "toughness", name: "Ao's Toughness", description: "+8 maximum HP per character level." },
  { id: "will", name: "Ao's Will", description: "+3 to one saving throw.", choices: ["fortitude", "reflex", "will"] },
  { id: "skin", name: "Nephilim Skin", description: "+2 AC." },
  { id: "wisdom", name: "Ao's Wisdom", description: "+2 spell attack and spell DC." },
  { id: "precision", name: "Ao's Precision", description: "+2 weapon and unarmed attack rolls." },
  { id: "form", name: "Nephilim Form", description: "+1 to one attribute modifier.", choices: ["str", "dex", "con", "int", "wis", "cha"] },
]);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const items = actor => Array.from(actor.items?.contents ?? actor.items ?? []);
const bond = item => item?.flags?.[MODULE_ID]?.nephilimBond;
const level = actor => Number(actor.level ?? actor.system?.details?.level?.value ?? 0);

export function validateBondSelection(selection, existing, actorLevel) {
  const definition = NEPHILIM_BONDS.find(b => b.id === selection.id);
  if (!NEPHILIM_BOND_LEVELS.includes(selection.milestone) || actorLevel < selection.milestone)
    throw new Error("This Nephilim Bond unlocks at level 5, 10, 15 or 20.");
  if (!definition) throw new Error("Choose a valid Nephilim Bond.");
  if (existing.some(b => b.milestone !== selection.milestone && b.id === selection.id))
    throw new Error("Each Nephilim Bond may only be chosen once, even with a different save or attribute.");
  if (definition.choices && !definition.choices.includes(selection.choice))
    throw new Error("Choose the saving throw or attribute for this bond.");
  return definition;
}

export function createBondSource(selection) {
  const definition = validateBondSelection(selection, [], selection.milestone);
  const predicate = [{ gte: ["self:level", selection.milestone] }];
  // PF2e's closed modifier-type enum uses an additive carrier. The source label
  // identifies the independent Nephilim Gift category without changing core types.
  const flat = (selector, value) => ({ key: "FlatModifier", selector, value, type: "untyped",
    label: `${definition.name} — Nephilim Gift`, predicate });
  const rules = {
    toughness: [flat("hp-per-level", 8)], will: [flat(selection.choice, 3)],
    skin: [flat("ac", 2)], wisdom: [flat(["spell-attack", "spell-dc"], 2)],
    precision: [flat("strike-attack-roll", 2)],
    form: [{ key: "ActiveEffectLike", mode: "add", path: `system.abilities.${selection.choice}.mod`,
      label: `${definition.name} — Nephilim Gift`, value: 1, phase: "beforeDerived", predicate }],
  }[selection.id];
  return { name: definition.name, type: "feat", img: "icons/magic/light/beam-rays-yellow-blue-large.webp",
    flags: { [MODULE_ID]: { nephilimBond: { id: selection.id, milestone: selection.milestone, choice: selection.choice ?? "" } } },
    system: { category: "bonus", level: { value: selection.milestone }, traits: { value: [], rarity: "unique" },
      description: { value: `<p>${definition.description}</p><p>Nephilim Gift${definition.choices ? `: ${escape(selection.choice)}` : ""}. Chosen at level ${selection.milestone}. Retained when another distinct bond is chosen.</p>` },
      rules, slug: `nephilim-bond-${selection.id}` } };
}

export async function chooseBond(actor, milestone) {
  if (!actor.isOwner || !NEPHILIM_BOND_LEVELS.includes(milestone) || level(actor) < milestone) return;
  const current = items(actor).find(i => bond(i)?.milestone === milestone);
  const selected = bond(current);
  const existing = items(actor).map(bond).filter(Boolean);
  const options = NEPHILIM_BONDS.filter(b => !existing.some(e => e.milestone !== milestone && e.id === b.id));
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: `Nephilim Bond — Level ${milestone}` },
    content: `<p>Keep earlier bonds; choose a different gift at each milestone.</p>
      <label>Bond <select name="bond">${options.map(b => `<option value="${b.id}" ${selected?.id === b.id ? "selected" : ""}>${escape(b.name)}</option>`).join("")}</select></label>
      <label>Ao's Will — Save <select name="save">${["fortitude", "reflex", "will"].map(c => `<option ${selected?.choice === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
      <label>Nephilim Form — Attribute <select name="attribute">${["str", "dex", "con", "int", "wis", "cha"].map(c => `<option ${selected?.choice === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
      <ul>${options.map(b => `<li><strong>${escape(b.name)}</strong>: ${b.description}</li>`).join("")}</ul>`,
    buttons: [{ action: "save", label: "Select Bond", default: true, callback: (_event, button) => {
      const form = button.form;
      const id = form.elements.namedItem("bond").value;
      return { id, milestone, choice: id === "will" ? form.elements.namedItem("save").value : id === "form" ? form.elements.namedItem("attribute").value : "" };
    } }, { action: "cancel", label: "Cancel", callback: () => null }], rejectClose: false,
  });
  if (!result || typeof result !== "object") return;
  // Re-read after the dialog: another user may have changed the character.
  if (!actor.isOwner) return;
  validateBondSelection(result, items(actor).map(bond).filter(Boolean), level(actor));
  const latest = items(actor).find(i => bond(i)?.milestone === milestone);
  const source = createBondSource(result);
  if (latest) await actor.updateEmbeddedDocuments("Item", [{ _id: latest.id, ...source }]);
  else await actor.createEmbeddedDocuments("Item", [source]);
}

/** Earlier unfilled milestones remain selectable at every later level. */
export function bondMilestones(actor) {
  return NEPHILIM_BOND_LEVELS.map(milestone => {
    const item = items(actor).find(item => bond(item)?.milestone === milestone);
    return { milestone, name: item?.name ?? "Not chosen", choice: bond(item)?.choice ?? "",
      selected: Boolean(item), unlocked: level(actor) >= milestone };
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
    return slot.name + (choice ? ` (${choice})` : "");
  });
  if (names.length) return names.join(" • ");
  const pending = slots.filter(slot => slot.unlocked).length;
  return pending ? `Choose Nephilim Bonds · ${pending} available` : "Nephilim Bonds";
}

export async function openNephilimBonds(actor) {
  // Rebuild after a selection so the list reflects current documents and level.
  while (true) {
    const slots = bondMilestones(actor);
    const first = slots.find(slot => slot.unlocked && !slot.selected) ?? slots.find(slot => slot.unlocked);
    const content = '<p>Choose one distinct bond at each milestone. Unfilled earlier choices remain available.</p>'
      + '<fieldset><legend>Nephilim Bonds</legend>' + slots.map(slot =>
        '<label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--color-border-light-primary)">'
        + '<input type="radio" name="milestone" value="' + slot.milestone + '" '
        + (slot === first ? 'checked ' : '') + (!slot.unlocked || !actor.isOwner ? 'disabled ' : '') + '>'
        + '<span><strong>Level ' + slot.milestone + '</strong><br>' + escape(slot.name)
        + (slot.choice ? ' (' + escape(slot.choice) + ')' : '')
        + (!slot.unlocked ? ' — Locked' : '') + '</span></label>').join('') + '</fieldset>';
    const buttons = [];
    if (actor.isOwner && first) buttons.push({ action: "choose", label: "Choose / Change Bond", default: true,
      callback: (_event, button) => Number(button.form.elements.namedItem("milestone").value) });
    buttons.push({ action: "close", label: "Close", callback: () => null });
    const milestone = await foundry.applications.api.DialogV2.wait({
      window: { title: "Nephilim Bonds" }, content, buttons, rejectClose: false,
    });
    if (!NEPHILIM_BOND_LEVELS.includes(milestone)) return;
    await chooseBond(actor, milestone);
  }
}

export function injectNephilimBondBar(application, html) {
  const actor = application.actor ?? application.document;
  const root = html?.querySelector ? html : html?.[0];
  const details = root?.querySelector('.tab.character .subsection.details');
  const identity = details?.querySelector(":scope > .abcd");
  if (actor?.type !== "character" || !identity || details.querySelector(".cmt-nephilim-bonds")) return;
  const section = document.createElement("div");
  section.className = "cmt-nephilim-bonds";
  const title = document.createElement("span");
  title.className = "details-label";
  title.textContent = "Nephilim Bonds";
  section.append(title);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cmt-nephilim-bonds-open";
  button.textContent = bondSummary(actor);
  button.title = button.textContent;
  button.setAttribute("aria-label", "Open Nephilim Bonds");
  button.addEventListener("click", async event => {
    event.preventDefault();
    event.stopPropagation();
    button.disabled = true;
    try { await openNephilimBonds(actor); }
    catch (error) { ui.notifications.error(error.message); }
    finally {
      button.textContent = bondSummary(actor);
      button.title = button.textContent;
      button.disabled = false;
    }
  });
  section.append(button);
  identity.append(section);
}

export function registerNephilimBonds() {
  for (const hook of ["renderActorSheet", "renderActorSheetV2", "renderCharacterSheetPF2e"])
    Hooks.on(hook, injectNephilimBondBar);
}
