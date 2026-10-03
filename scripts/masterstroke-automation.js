import { MODULE_ID } from "./constants.js";
import { addItemHitPointBonus } from "./item-hit-points.js";
import { currentMasterstroke, masterstrokeAvailable } from "./masterstroke-rules.js";
import { masterstrokeRequest, registerMasterstrokeAuthority } from "./masterstroke-authority.js";

const prepared = new WeakSet();
const damageContexts = new WeakMap();
const damageQueues = new Map();
const entries = actor => Array.from(actor?.items?.contents ?? actor?.items ?? []);
const equipped = item => item?.isEquipped === true && !item?.system?.containerId && !item.flags?.[MODULE_ID]?.upgradeProject;
const find = (actor, id) => entries(actor).find(item => equipped(item) && currentMasterstroke(item)?.id === id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
const announce = async (actor, text) => {
  try { return await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<section class="cmt-crafting-chat"><h3>Masterstroke</h3><p>${esc(text)}</p></section>` }); }
  catch (error) { console.error("Masterstroke chat report failed after resolving its effect", error); }
};

export function applyMasterstrokeStats(item) {
  const stroke = currentMasterstroke(item);
  if (!stroke || !item.system || prepared.has(item.system)) return;
  prepared.add(item.system);
  if (stroke.id === "indomitable-construction") addItemHitPointBonus(item, Number(item.system.hp?.max ?? 0) * 2);
  if (["indomitable-construction", "unbreakable-guard"].includes(stroke.id)) item.system.hardness = Number(item.system.hardness ?? 0) + 5;
  if (stroke.id === "weightless-wonder") {
    if (item.system.bulk) { item.system.bulk.value = 0; item.system.bulk.heldOrStowed = 0; }
    if (item.type === "armor") { item.system.speedPenalty = 0; item.system.checkPenalty = 0; }
  }
}

export function improvedOutcome(from, effects) {
  let outcome = from;
  const used = [];
  for (const effect of effects) if (effect.from === outcome) { outcome = effect.to; used.push(effect); }
  return { outcome, used };
}

export function outcomeBeforeMasterstroke(options, adjustments = []) {
  const values = [...options];
  const number = prefix => Number(values.find(option => option.startsWith(prefix))?.slice(prefix.length));
  const delta = number("check:total:delta:");
  const natural = number("check:total:natural:");
  const names = ["criticalFailure", "failure", "success", "criticalSuccess"];
  let degree = delta >= 10 ? 3 : delta >= 0 ? 2 : delta <= -10 ? 0 : 1;
  degree = Math.max(0, Math.min(3, degree + (natural === 20 ? 1 : natural === 1 ? -1 : 0)));
  const merged = {};
  for (const adjustment of adjustments) if (adjustment.predicate?.test(options) ?? true) Object.assign(merged, adjustment.adjustments);
  for (const key of ["all", ...names]) {
    const adjustment = merged[key];
    if (!adjustment?.amount || !adjustment.label || !["all", names[degree]].includes(key)) continue;
    if (degree === 3 && adjustment.amount === 1 || degree === 0 && adjustment.amount === -1) continue;
    degree = typeof adjustment.amount === "string" ? names.indexOf(adjustment.amount) : Math.max(0, Math.min(3, degree + adjustment.amount));
    break;
  }
  return names[degree];
}

async function guardianEffect(actor, weapon) {
  const old = entries(actor).filter(item => item.flags?.[MODULE_ID]?.masterstrokeEffect === "guardian-ac");
  if (old.length) await actor.deleteEmbeddedDocuments("Item", old.map(item => item.id));
  await actor.createEmbeddedDocuments("Item", [{ name: "Guardian’s Weapon", type: "effect", img: weapon.img,
    flags: { [MODULE_ID]: { masterstrokeEffect: "guardian-ac" } }, system: { slug: "masterstroke-guardian-ac",
      duration: { value: 1, unit: "rounds", expiry: "turn-start" }, tokenIcon: { show: true },
      rules: [{ key: "FlatModifier", selector: "ac", type: "circumstance", value: 2, label: "Guardian’s Weapon" }] } }]);
  const token = masterstrokeAvailable(weapon) ? await masterstrokeRequest("reserve", weapon, actor) : null;
  if (token) {
    try {
      await actor.createEmbeddedDocuments("Item", [{ name: "Guardian’s Weapon — Vitality", type: "effect", img: weapon.img,
        flags: { [MODULE_ID]: { masterstrokeEffect: "guardian-hp" } }, system: { slug: "masterstroke-guardian-hp",
          duration: { value: 1, unit: "minutes", expiry: "turn-start" }, tokenIcon: { show: true },
          rules: [{ key: "TempHP", value: Math.max(1, Number(actor.level ?? actor.system.details.level.value)), events: { onCreate: true, onTurnStart: false } }] } }]);
    } catch (error) { await masterstrokeRequest("release", weapon, actor, token); throw error; }
  }
}

async function impact(actor, weapon, context) {
  const target = context.target?.actor;
  const sizes = ["tiny", "sm", "med", "lg", "huge", "grg"];
  if (!target || sizes.indexOf(target.system.traits.size.value) > sizes.indexOf(actor.system.traits.size.value) + 2) return;
  const choice = await foundry.applications.api.DialogV2.wait({ window: { title: "Overwhelming Impact" }, content: `<p>${esc(target.name)}: choose the effect of your critical hit.</p>`,
    buttons: [{ action: "prone", label: "Knock Prone" }, { action: "push", label: "Push 10 Feet" }, { action: "cancel", label: "Skip" }], close: () => "cancel" });
  if (!["prone", "push"].includes(choice)) return;
  const token = await masterstrokeRequest("reserve", weapon, actor);
  if (!token) return;
  try {
    await requestImpact(weapon, actor, context, choice, token);
  } catch (error) { await masterstrokeRequest("release", weapon, actor, token); throw error; }
}

/** Native roll adjustments are supplied before the roll so chat and damage use the same outcome. */
export function installMasterstrokeChecks(Check = game.pf2e.Check) {
  const original = Check?.roll;
  if (!original || original.cmtMasterstrokes) return false;
  const wrapped = async function(check, context = {}, event = null, callback) {
    const actor = context.actor ?? (context.origin?.self ? context.origin.actor : context.target?.actor);
    if (!actor || context.cmtMasterstrokeFollowup) return original.call(this, check, context, event, callback);
    const item = context.item ?? context.origin?.item;
    const stroke = currentMasterstroke(item);
    const attack = context.type === "attack-roll";
    const save = context.type === "saving-throw";
    if (attack && item?.type === "weapon" && stroke?.id === "perfect-balance") {
      const map = check.modifiers?.find(modifier => modifier.slug === "multiple-attack-penalty" && !modifier.ignored)?.modifier ?? 0;
      if (map < 0) check.push(new game.pf2e.Modifier({ slug: "masterstroke-perfect-balance", label: "Perfect Balance", modifier: Math.min(2, -map), type: "untyped" }));
    }
    const candidates = [];
    if (attack && item?.type === "weapon" && stroke?.id === "unerring-strike") candidates.push({ item, from: "failure", to: "success" });
    if (attack && item?.type === "weapon" && stroke?.id === "artisans-triumph") candidates.push({ item, from: "success", to: "criticalSuccess" });
    if (attack && item?.type === "spell") {
      const focus = find(actor, "perfect-focus");
      if (focus) candidates.push({ item: focus, from: "failure", to: "success" });
    }
    if (save) {
      const focus = item?.type === "spell" ? find(item.actor ?? context.origin?.actor, "perfect-focus") : null;
      if (focus) candidates.push({ item: focus, from: "success", to: "failure" });
      const ward = find(actor, "adamant-will");
      if (ward) candidates.push({ item: ward, from: "failure", to: "success" });
    }
    const armour = attack ? find(context.target?.actor, "defy-death") : null;
    if (armour) candidates.push({ item: armour, from: "criticalSuccess", to: "success" });
    if (!stroke && !candidates.length) return original.call(this, check, context, event, callback);
    const claims = [];
    let used = new Set();
    try {
      if (context.dc) for (const candidate of candidates) {
        if (!masterstrokeAvailable(candidate.item)) continue;
        const token = await masterstrokeRequest("reserve", candidate.item, actor);
        if (token) claims.push({ ...candidate, token });
      }
      let selectedPlan = null;
      const priorAdjustments = context.dosAdjustments ?? [];
      const adjustment = { adjustments: {}, predicate: { test(options) {
        selectedPlan = improvedOutcome(outcomeBeforeMasterstroke(options, priorAdjustments), claims);
        adjustment.adjustments = selectedPlan.used.length ? { all: {
          label: selectedPlan.used.map(effect => currentMasterstroke(effect.item).name).join(" + "), amount: selectedPlan.outcome,
        } } : {};
        return selectedPlan.used.length > 0;
      } } };
      const next = { ...context, dosAdjustments: [...(context.dosAdjustments ?? []), adjustment] };
      const roll = await original.call(this, check, next, event, async (rolled, outcome, message, ev) => {
        const plan = selectedPlan;
        if (plan && outcome === plan.outcome) used = new Set(plan.used);
        if (callback) await callback(rolled, outcome, message, ev);
      });
      if (!roll) return roll;
      Object.assign(context, next);
      context.dosAdjustments = priorAdjustments;
      const outcome = next.outcome;
      try {
        if (attack && item?.type === "weapon" && ["success", "criticalSuccess"].includes(outcome) && stroke?.id === "guardians-weapon") await guardianEffect(await fromUuid(actor.uuid) ?? actor, item);
        if (attack && item?.type === "weapon" && outcome === "criticalSuccess" && stroke?.id === "overwhelming-impact" && masterstrokeAvailable(item)) await impact(actor, item, next);
        if (attack && item?.type === "weapon" && ["failure", "criticalFailure"].includes(outcome) && stroke?.id === "relentless-assault" && masterstrokeAvailable(item)) {
          const token = await masterstrokeRequest("reserve", item, actor);
          if (token) {
            let followup;
            try {
              const realActor = await fromUuid(actor.uuid) ?? actor;
              const strike = realActor.system?.actions?.flatMap(action => [action, ...(action.altUsages ?? [])]).find(action => action.item?.id === item.id && action.item?.isMelee === item.isMelee);
              if (!strike?.variants?.[context.mapIncreases ?? 0]?.roll) throw new Error("This weapon’s Strike is unavailable.");
              followup = await strike.variants[context.mapIncreases ?? 0].roll({ target: context.target?.token?.object, options: ["masterstroke:relentless-assault"], event: { shiftKey: true } });
            }
            finally { if (!followup) await masterstrokeRequest("release", item, actor, token); }
            if (followup) await announce(actor, "Relentless Assault grants a free Strike at the same penalty. Both Strikes count toward your next multiple attack penalty.");
          }
        }
      } catch (error) { ui.notifications.error(`Masterstroke follow-up: ${error.message}`); }
      return roll;
    } finally {
      for (const claim of claims) if (!used.has(claim)) await masterstrokeRequest("release", claim.item, actor, claim.token);
    }
  };
  wrapped.cmtMasterstrokes = true; Check.roll = wrapped; return true;
}

/** The health delta is calculated after IWR and Hardness, before temporary HP and stamina. */
export function installMasterstrokeDamage(ActorClass = CONFIG.Actor.documentClass) {
  let prototype = ActorClass?.prototype;
  while (prototype && !Object.hasOwn(prototype, "applyDamage")) prototype = Object.getPrototypeOf(prototype);
  if (!prototype || prototype.cmtMasterstrokeDamage) return false;
  const apply = prototype.applyDamage;
  const health = prototype.calculateHealthDelta;
  prototype.calculateHealthDelta = function(args) {
    const context = damageContexts.get(this);
    if (context?.finish && args.delta > 0) {
      context.finishUsed = true;
      const result = health.call(this, { ...args, delta: Math.max(0, args.delta - 10) });
      context.totalApplied = result.totalApplied;
      return result;
    }
    const result = health.call(this, args);
    if (context) context.totalApplied = result.totalApplied;
    return result;
  };
  prototype.applyDamage = function(options, ...rest) {
    const task = async () => {
      const roller = this;
      const source = options.item;
      const shield = this.heldShield;
      const validShield = shield && this.attributes?.shield?.raised && !this.attributes.shield.broken && !this.attributes.shield.destroyed;
      const finish = !options.final && (options.item?.type === "weapon" || options.item?.type === "melee" || options.item?.type === "spell")
        ? entries(this).find(item => equipped(item) && currentMasterstroke(item)?.id === "protective-finish" && (item.type === "armor" || validShield && item.id === shield.id) && masterstrokeAvailable(item)) : null;
      const guard = !options.final && options.shieldBlockRequest && validShield && currentMasterstroke(shield)?.id === "unbreakable-guard" && masterstrokeAvailable(shield) ? shield : null;
      const context = { finish, finishUsed: false, guard, guardUsed: false, shield };
      const claims = [];
      const attributes = this.attributes;
      const resistances = attributes?.resistances;
      try {
        for (const [key, item] of [["finish", finish], ["guard", guard]]) if (item) {
          const token = await masterstrokeRequest("reserve", item, roller);
          if (token) claims.push({ key, item, token }); else context[key] = null;
        }
        if (currentMasterstroke(source)?.id === "unyielding-edge" && Array.isArray(resistances) && !options.final && !options.skipIWR) {
          attributes.resistances = resistances.map(resistance => new Proxy(resistance, { get(target, key) {
            if (key === "getDoubledValue") return description => Math.max(0, target.getDoubledValue(description) - (["bludgeoning", "piercing", "slashing"].some(type => description.has(`damage:type:${type}`)) ? 10 : 0));
            // PF2e IWR labels use private fields: keep their getters and methods bound to the real instance.
            const value = Reflect.get(target, key, target);
            return typeof value === "function" ? value.bind(target) : value;
          } }));
          options = { ...options, breakdown: [...(options.breakdown ?? []), "Unyielding Edge: ignore 10 resistance to physical weapon damage"] };
        }
        damageContexts.set(this, context);
        const result = await apply.call(this, options, ...rest);
        if (context.finishUsed) await announce(this, "Protective Finish reduced the hit by 10 damage after resistances and Hardness.");
        if (context.guardUsed) await announce(this, "Unbreakable Guard protected the shield from damage; its bearer’s damage was resolved normally.");
        return result;
      } finally {
        damageContexts.delete(this);
        if (resistances) attributes.resistances = resistances;
        for (const claim of claims) if (!context[`${claim.key}Used`]) await masterstrokeRequest("release", claim.item, roller, claim.token);
      }
    };
    const previous = damageQueues.get(this.uuid) ?? Promise.resolve();
    const result = previous.catch(() => {}).then(task);
    damageQueues.set(this.uuid, result);
    void result.finally(() => { if (damageQueues.get(this.uuid) === result) damageQueues.delete(this.uuid); }).catch(() => {});
    return result;
  };
  Object.defineProperty(prototype, "cmtMasterstrokeDamage", { value: true });
  return true;
}

let requestImpact;
export function registerMasterstrokeAutomation() {
  game.settings.register(MODULE_ID, "masterstrokeEncounter", { scope: "world", config: false, type: Number, default: 0 });
  Hooks.on("preUpdateItem", (item, changes) => {
    const context = damageContexts.get(item.actor);
    const hp = changes["system.hp.value"] ?? changes.system?.hp?.value;
    if (context?.guard?.id === item.id && Number(hp) < item.system.hp.value) {
      context.guardUsed = true;
      if (changes.system?.hp) changes.system.hp.value = item.system.hp.value;
      else changes["system.hp.value"] = item.system.hp.value;
    }
  });
  Hooks.on("preCreateChatMessage", (message, data) => {
    const applied = data.flags?.pf2e?.appliedDamage;
    if (!applied?.shield) return;
    const actor = fromUuidSync(applied.uuid);
    const context = damageContexts.get(actor);
    if (context?.guardUsed) {
      const root = document.createElement("div"); root.innerHTML = data.content;
      const card = root.querySelector(".damage-taken");
      if (card) {
        // Replace native damage statements, retaining IWR details and undo controls.
        const statement = card.querySelector(".statements");
        if (statement) statement.innerHTML = `<span class="target-name">${esc(actor.name)}</span> takes ${Math.abs(context.totalApplied ?? 0)} damage. Unbreakable Guard: ${esc(context.shield.name)} takes no damage.`;
      }
      message.updateSource({ "flags.pf2e.appliedDamage.shield": null, content: root.innerHTML });
    }
  });
  Hooks.once("ready", () => {
    registerMasterstrokeAuthority();
    installMasterstrokeChecks();
    installMasterstrokeDamage();
    requestImpact = async (weapon, actor, context, choice, token) => {
      const { applyMasterstrokeImpact } = await import("./masterstroke-impact.js");
      return applyMasterstrokeImpact(weapon, actor, context, choice, token);
    };
  });
  class NewEncounterMenu extends foundry.applications.api.ApplicationV2 {
    async render() {
      if (!game.user.isGM) return this;
      if (game.combat?.started) { ui.notifications.warn("Finish the current combat before starting an exploration encounter."); return this; }
      if (await foundry.applications.api.DialogV2.confirm({ window: { title: "New Masterstroke Encounter" }, content: "<p>Refresh encounter, round and turn uses outside combat? Daily uses are unchanged.</p>" })) {
        await game.settings.set(MODULE_ID, "masterstrokeEncounter", Number(game.settings.get(MODULE_ID, "masterstrokeEncounter")) + 1);
        ui.notifications.info("Masterstroke encounter uses refreshed.");
      }
      return this;
    }
  }
  game.settings.registerMenu(MODULE_ID, "masterstrokeEncounterMenu", { name: "Masterstroke Encounter", label: "Start New Encounter", hint: "Refresh encounter uses outside combat. Combat encounters reset automatically.", icon: "fa-solid fa-dice-d20", restricted: true, type: NewEncounterMenu });
}
