import { MODULE_ID } from "./constants.js";
import { getRulesConfig, refreshPreparedData } from "./config-store.js";
import { normalizeItemFlags } from "./model.js";
import { synchronizeActorProfession } from "./professions.js";
import { createBondSource } from "./nephilim-bonds.js";
import { CRAFTING_RESOURCE_SOURCES } from "../content/crafting-resources.js";
import { VOID_PROTECTION_SOURCE } from "../content/void-protection.js";
import { CRAFTING_ROLL_TABLES } from "../content/crafting-roll-tables.js";
import { refreshGuideCompendiums } from "./guide-refresh.js";
import { normalizeCraftingProject } from "./crafting-projects.js";
import { retireProjectMarks } from "./retired-marks.js";
import { eligibleMasterstroke, masterstrokeTable, masterstrokeCategory } from "./masterstroke-rules.js";
import { referenceRefreshPlan, refreshReferences, refreshTableResults } from "./refresh-references.js";
import { PROFESSION_ITEM_SOURCES } from "../content/professions.js";

const entries = collection => Array.from(collection?.contents ?? collection ?? []);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const get = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
let running = false;

/** Compare source data, never derived bonuses, for a truthful completion report. */
export function refreshDifferences(before, after, path = "") {
  if (same(before, after)) return [];
  if (Array.isArray(before) && Array.isArray(after) && [...before, ...after].every(entry => entry && (entry._id || entry.id))) {
    const first = new Map(before.map(entry => [entry._id || entry.id, entry]));
    const last = new Map(after.map(entry => [entry._id || entry.id, entry]));
    return [...new Set([...first.keys(), ...last.keys()])].flatMap(id => refreshDifferences(first.get(id), last.get(id), `${path} / ${last.get(id)?.name ?? first.get(id)?.name ?? id}`));
  }
  if (before && after && typeof before === "object" && typeof after === "object" && !Array.isArray(before) && !Array.isArray(after)) {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key =>
      ["_stats", "_id", "sort"].includes(key) ? [] : refreshDifferences(before[key], after[key], path ? `${path}.${key}` : key));
  }
  return [{ kind: before === undefined ? "Added" : after === undefined ? "Removed" : "Changed", path, before, after }];
}

export function itemRefreshPatch(source, config) {
  const flags = source.flags?.[MODULE_ID];
  if (!flags) return {};
  const patch = {};
  if (flags.profession) {
    const stock = PROFESSION_ITEM_SOURCES.find(item => item.flags[MODULE_ID].profession.id === flags.profession.id);
    if (stock) {
      patch[`flags.${MODULE_ID}.profession`] = stock.flags[MODULE_ID].profession;
      patch["system.rules"] = stock.system.rules;
      patch["system.description.value"] = stock.system.description.value;
    }
  }
  if (flags.resource) {
    const stock = CRAFTING_RESOURCE_SOURCES.find(item => {
      const resource = item.flags[MODULE_ID].resource;
      return resource.materialId === flags.resource.materialId && resource.tier === flags.resource.tier && (resource.variantId || "") === (flags.resource.variantId || "");
    });
    if (stock) {
      patch[`flags.${MODULE_ID}.resource`] = stock.flags[MODULE_ID].resource;
      for (const path of ["system.description.value", "system.price", "system.level", "system.traits", "system.rules"]) patch[path] = get(stock, path);
    }
  }
  if (flags.nephilimBond || flags.voidProtection) {
    const stock = flags.nephilimBond ? createBondSource(flags.nephilimBond) : VOID_PROTECTION_SOURCE;
    patch["system.rules"] = stock.system.rules;
    patch["system.description.value"] = stock.system.description.value;
  }
  if (flags.material || flags.crafting?.core) {
    const normalized = normalizeItemFlags(flags, config);
    for (const key of ["schemaVersion", "material", "tier", "dragonScale"]) patch[`flags.${MODULE_ID}.${key}`] = normalized[key];
    patch[`flags.${MODULE_ID}.crafting.artisanMarks`] = [];
    patch[`flags.${MODULE_ID}.crafting.synergies`] = [];
    // Generated material rules now come from the preparation bridge, not stored copies.
    patch["system.rules"] = (source.system?.rules ?? []).filter(rule => !String(rule.slug ?? "").startsWith("craft-material-"));
    const strokes = flags.crafting?.masterstrokes ?? [];
    if (strokes.length) {
      const category = masterstrokeCategory(source);
      let result = Number(strokes[0].result);
      // Stable migration: retain an eligible result; otherwise use the first compatible result.
      if (!eligibleMasterstroke(source, result, category)) result = [1,2,3,4,5,6,7,8].find(n => eligibleMasterstroke(source, n, category));
      if (result) patch[`flags.${MODULE_ID}.crafting.masterstrokes`] = [{ ...strokes[0], ...masterstrokeTable(category)[result - 1], id: strokes[0].id,
        edition: "chad", category, result, used: false }];
    }
  }
  return Object.fromEntries(Object.entries(patch).filter(([path, value]) => value !== undefined && !same(get(source, path), value)));
}

export async function refreshAll() {
  if (!game.user.isGM) throw new Error("Only the GM can refresh module content.");
  const primary = entries(game.users).filter(u => u.active && u.isGM).sort((a,b) => a.id.localeCompare(b.id))[0];
  if (primary && primary.id !== game.user.id) throw new Error("Run Refresh All from the primary active GM account.");
  if (running) throw new Error("Refresh All is already running.");
  running = true;
  const report = [];
  try {
    const actors = [...entries(game.actors), ...entries(game.scenes).flatMap(scene => entries(scene.tokens).filter(token => !token.actorLink).map(token => token.actor).filter(Boolean))];
    const uniqueActors = [...new Map(actors.map(actor => [actor.uuid, actor])).values()];
    const items = [...entries(game.items), ...uniqueActors.flatMap(actor => entries(actor.items))];
    const tables = entries(game.tables).filter(table => table.flags?.[MODULE_ID]?.craftingTable);
    const references = await referenceRefreshPlan();
    const guideBackups = [];
    for (const name of ["player-guide", "gm-guide", "artisan-marks"]) {
      const pack = game.packs.get(`${MODULE_ID}.${name}`);
      if (pack) for (const document of await pack.getDocuments()) guideBackups.push({ uuid: document.uuid, source: document.toObject() });
    }
    // Save a recoverable source snapshot before any persistent change.
    const backup = { date: new Date().toISOString(), version: game.modules.get(MODULE_ID)?.version,
      actors: uniqueActors.map(actor => ({ uuid: actor.uuid, source: actor.toObject() })),
      items: entries(game.items).filter(item => item.flags?.[MODULE_ID]).map(item => ({ uuid: item.uuid, source: item.toObject() })),
      tables: tables.map(table => ({ uuid: table.uuid, source: table.toObject() })),
      references: [...guideBackups, ...references.flatMap(row => (row.entries ?? []).filter(entry => entry.document).map(({ document }) => ({ uuid: document.uuid, source: document.toObject() })))] };
    let folder = entries(game.folders).find(folder => folder.type === "JournalEntry" && folder.name === "Wrathmaker Backups");
    folder ??= await Folder.create({ name: "Wrathmaker Backups", type: "JournalEntry", sorting: "a" });
    const backupJournal = await JournalEntry.create({ name: `Refresh All — ${backup.date}`, folder: folder.id, ownership: { default: 0 },
      pages: [{ name: "Pre-refresh source backup", type: "text", ownership: { default: 0 }, text: { format: 1, content: `<pre>${esc(JSON.stringify(backup, null, 2))}</pre>` } }] });
    if (!backupJournal) throw new Error("The private backup could not be saved. No module content was changed.");
    await game.settings.set(MODULE_ID, "refreshAllBackup", { uuid: backupJournal.uuid, date: backup.date });
    const attempt = async (document, action) => {
      const before = document.toObject();
      try {
        await action();
        const changes = refreshDifferences(before, document.toObject());
        report.push({ name: document.name, uuid: document.uuid, status: changes.length ? "Updated" : "Unchanged", changes });
      } catch (error) {
        report.push({ name: document.name, uuid: document.uuid, status: "Failed", error: error.message, changes: refreshDifferences(before, document.toObject()) });
      }
    };
    for (const actor of uniqueActors) await attempt(actor, async () => {
      if (actor.type === "character") await synchronizeActorProfession(actor, { force: true });
      const state = actor.flags?.[MODULE_ID]?.workbench;
      if (state?.projects) {
        const projects = state.projects.map(project => {
          try { return retireProjectMarks(normalizeCraftingProject(project)); }
          catch (error) { report.push({ name: `${actor.name}: ${project.name ?? "Project"}`, status: "Skipped", error: error.message, changes: [] }); return project; }
        });
        if (!same(state.projects, projects)) await actor.setFlag(MODULE_ID, "workbench", { ...state, projects });
      }
    });
    for (const item of items) {
      if (!item.flags?.[MODULE_ID] || !item.parent?.items?.has?.(item.id) && item.parent?.documentName === "Actor") continue;
      if (item.flags[MODULE_ID].upgradeProject) {
        report.push({ name: item.name, uuid: item.uuid, status: "Skipped", error: "Reserved for an upgrade. Complete or cancel it before refreshing this item.", changes: [] }); continue;
      }
      if (item.flags[MODULE_ID].timedMark) {
        try { await item.delete(); report.push({ name: item.name, status: "Removed", changes: [{ kind: "Removed", path: "Retired Artisan Mark effect", before: item.name }] }); }
        catch (error) { report.push({ name: item.name, status: "Failed", error: error.message, changes: [] }); }
        continue;
      }
      await attempt(item, async () => {
        const patch = itemRefreshPatch(item.toObject(), getRulesConfig());
        if (Object.keys(patch).length) await item.update(patch);
      });
    }
    for (const stock of CRAFTING_ROLL_TABLES) {
      const copies = tables.filter(table => table.flags[MODULE_ID].craftingTable === stock._id);
      if (!copies.length) {
        try { const copy = structuredClone(stock); delete copy._id; await RollTable.create(copy); report.push({ name: stock.name, status: "Added", changes: [{ kind: "Added", path: "Rollable table", after: stock.name }] }); }
        catch (error) { report.push({ name: stock.name, status: "Failed", error: error.message, changes: [] }); }
      }
      for (const table of copies) await attempt(table, async () => {
        await refreshTableResults(table, stock);
      });
    }
    for (const [name, action] of [["Compendium references", () => refreshReferences(references, report, refreshDifferences)],
      ["Guides", () => refreshGuideCompendiums({ force: true, report })], ["Character sheets", () => refreshPreparedData()]]) {
      try { await action(); } catch (error) { report.push({ name, status: "Failed", error: error.message, changes: [] }); }
    }
    try {
      await backupJournal.createEmbeddedDocuments("JournalEntryPage", [{ name: "Completion Report", type: "text", ownership: { default: 0 }, text: { format: 1, content: refreshReportHTML(report) } }]);
      await game.settings.set(MODULE_ID, "refreshAllReport", { uuid: backupJournal.uuid, date: backup.date });
    } catch (error) { report.push({ name: "Saved completion report", status: "Failed", error: error.message, changes: [] }); }
    return report;
  } finally { running = false; }
}

export function refreshReportHTML(report) {
  const counts = Object.fromEntries(["Updated", "Added", "Removed", "Skipped", "Failed", "Unchanged"].map(status => [status, report.filter(row => row.status === status).length]));
  const value = data => data === undefined ? "—" : typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return `<p>${Object.entries(counts).map(([status, count]) => `${count} ${status.toLowerCase()}`).join(" · ")}</p><p>The pre-refresh backup and saved report are in the GM-only Wrathmaker Backups journal folder. Character choices, inventory quantities, current HP, native runes and project history are retained.</p><div style="max-height:65vh;overflow:auto">${report.filter(row => row.status !== "Unchanged").map(row => `<details><summary><strong>${esc(row.status)}: ${esc(row.name)}</strong></summary>${row.error ? `<p>${esc(row.error)}</p>` : ""}${row.changes.map(change => `<p><strong>${esc(change.kind)} — ${esc(change.path)}</strong></p><pre style="white-space:pre-wrap">Before: ${esc(value(change.before))}\nAfter: ${esc(value(change.after))}</pre>`).join("")}</details>`).join("") || "<p>Everything is already current.</p>"}</div>`;
}
export function registerRefreshAll() {
  for (const name of ["refreshAllBackup", "refreshAllReport"]) game.settings.register(MODULE_ID, name, { scope: "world", config: false, type: Object, default: {} });
  class RefreshAllMenu extends foundry.applications.api.ApplicationV2 {
    async render() {
      if (!game.user.isGM) return this;
      const confirmed = await foundry.applications.api.DialogV2.confirm({ window: { title: "Refresh All" }, content: "<p>Update module-managed professions, items, projects, reference guides and rollable tables to the current rules. Obsolete module effects are removed. A source backup is saved first; custom GM rule settings are retained.</p>" });
      if (!confirmed) return this;
      try {
        ui.notifications.info("Refreshing module content…");
        const report = await refreshAll();
        await foundry.applications.api.DialogV2.prompt({ window: { title: "Refresh All — Completion Report" }, position: { width: 800 }, content: refreshReportHTML(report), ok: { label: "Close" } });
      } catch (error) { ui.notifications.error(`Refresh All stopped: ${error.message}`, { permanent: true }); }
      return this;
    }
  }
  game.settings.registerMenu(MODULE_ID, "refreshAllMenu", { name: "Refresh All", label: "Refresh All", hint: "Update module-managed content and review everything added, removed or changed.", icon: "fa-solid fa-arrows-rotate", type: RefreshAllMenu, restricted: true });
}
