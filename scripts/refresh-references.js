import { MODULE_ID } from "./constants.js";
import { APEX_ITEM_SOURCES } from "../content/apex-items.js";
import { CRAFTING_ITEM_SOURCES } from "../content/crafting-items.js";
import { CRAFTING_RESOURCE_SOURCES } from "../content/crafting-resources.js";
import { PROFESSION_ITEM_SOURCES } from "../content/professions.js";
import { VOID_PROTECTION_SOURCE } from "../content/void-protection.js";
import { CRAFTING_ROLL_TABLES } from "../content/crafting-roll-tables.js";

export const REFERENCE_SOURCES = {
  "apex-items": APEX_ITEM_SOURCES,
  "crafting-items": CRAFTING_ITEM_SOURCES,
  "crafting-resources": CRAFTING_RESOURCE_SOURCES.filter(item => item.flags[MODULE_ID].resource.materialId !== "omnipotisium"),
  "omnipotisium-ingots": CRAFTING_RESOURCE_SOURCES.filter(item => item.flags[MODULE_ID].resource.materialId === "omnipotisium"),
  "professions": PROFESSION_ITEM_SOURCES,
  "void-protection": [{ ...VOID_PROTECTION_SOURCE, _id: "wmVoidProtect001" }],
  "crafting-tables": CRAFTING_ROLL_TABLES,
};

export async function referenceRefreshPlan() {
  const plan = [];
  for (const [name, sources] of Object.entries(REFERENCE_SOURCES)) {
    const pack = game.packs.get(`${MODULE_ID}.${name}`);
    if (!pack) { plan.push({ name, error: "Compendium unavailable." }); continue; }
    try {
      const documents = await pack.getDocuments();
      plan.push({ name, pack, entries: sources.map(source => ({ source, document: documents.find(document => document.id === source._id) })) });
    } catch (error) { plan.push({ name, error: error.message }); }
  }
  return plan;
}

export async function refreshTableResults(document, source) {
  const existing = Array.from(document.results?.contents ?? document.results ?? []);
  const ids = new Set(source.results.map(result => result._id));
  const removed = existing.filter(result => !ids.has(result.id)).map(result => result.id);
  if (removed.length) await document.deleteEmbeddedDocuments("TableResult", removed);
  const updates = source.results.filter(result => existing.some(entry => entry.id === result._id));
  const added = source.results.filter(result => !existing.some(entry => entry.id === result._id));
  if (updates.length) await document.updateEmbeddedDocuments("TableResult", updates);
  if (added.length) await document.createEmbeddedDocuments("TableResult", added, { keepId: true });
  await document.update({ name: source.name, description: source.description, formula: source.formula, replacement: true });
}

export async function refreshReferences(plan, report, differences) {
  for (const row of plan) {
    if (row.error) { report.push({ name: row.name, status: "Failed", error: row.error, changes: [] }); continue; }
    const locked = row.pack.locked;
    try {
      if (locked) await row.pack.configure({ locked: false });
      for (const { source, document } of row.entries) {
        try {
          if (!document) {
            await row.pack.documentClass.createDocuments([structuredClone(source)], { pack: row.pack.collection, keepId: true });
            report.push({ name: `${row.name}: ${source.name}`, status: "Added", changes: [{ kind: "Added", path: "Compendium reference", after: source.name }] });
          } else {
            const before = document.toObject();
            if (source.results) await refreshTableResults(document, source);
            else await document.update({ name: source.name, img: source.img, system: source.system, [`flags.${MODULE_ID}`]: source.flags?.[MODULE_ID] ?? {} });
            const changes = differences(before, document.toObject());
            report.push({ name: `${row.name}: ${source.name}`, status: changes.length ? "Updated" : "Unchanged", changes });
          }
        } catch (error) { report.push({ name: `${row.name}: ${source.name}`, status: "Failed", error: error.message, changes: [] }); }
      }
    } catch (error) { report.push({ name: row.name, status: "Failed", error: error.message, changes: [] }); }
    finally { if (locked) await row.pack.configure({ locked: true }); }
  }
}
