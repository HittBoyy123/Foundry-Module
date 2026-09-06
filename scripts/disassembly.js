import { MODULE_ID } from "./constants.js";
import { CRAFTING_RESOURCE_SOURCES } from "../content/crafting-resources.js";
import { getCraftingResourceData } from "./crafting-categories.js";
import { recordProjectDisassembly, replaceProject } from "./crafting-projects.js";

export const DISASSEMBLY_RETURN_PERCENT = 90;

export function findDisassemblyItem(party, project) {
  const matches = Array.from(party?.items ?? []).filter(item =>
    item.uuid === project?.finalItemUuid ||
    item.flags?.[MODULE_ID]?.crafting?.provenance?.some(entry => entry.projectId === project?.id));
  return matches.length === 1 ? matches[0] : null;
}

/** Only recorded, single-item outputs qualify. Never infer stock from price or item level. */
export function buildDisassemblyPlan(project, item) {
  if (!project || project.status !== "completed" || !project.consumptionConfirmed || project.disassembledAt) {
    throw new Error("Choose a completed project that has not already been disassembled.");
  }
  if (!item || (item.uuid !== project.finalItemUuid &&
    !item.flags?.[MODULE_ID]?.crafting?.provenance?.some(entry => entry.projectId === project.id))) {
    throw new Error("Move the project's finished item into the Party Stash first (one matching item only).");
  }
  if (Number(item.system?.quantity) !== 1 || Number(project.recipe?.result?.quantity) !== 1) {
    throw new Error("Disassembly currently supports single-item projects and unstacked items only.");
  }
  if (item.system?.equipped?.invested || item.system?.equipped?.carryType === "held") {
    throw new Error("Unequip and uninvest this item before disassembly.");
  }
  const consumed = project.reservations.filter(entry => entry.state === "consumed" && entry.quantity > 0);
  if (!consumed.length) throw new Error("This project has no recorded consumed materials.");
  const groups = new Map();
  for (const entry of consumed) {
    const key = JSON.stringify([entry.materialId, entry.tier, entry.variantId || ""]);
    const group = groups.get(key) ?? { materialId: entry.materialId, tier: entry.tier, variantId: entry.variantId || "", consumed: 0 };
    group.consumed += entry.quantity * entry.unitsPerItem;
    if (!Number.isSafeInteger(group.consumed) || group.consumed <= 0) throw new Error("Invalid recorded material quantity.");
    groups.set(key, group);
  }
  const returns = [...groups.values()].map(group => {
    const source = CRAFTING_RESOURCE_SOURCES.find(resource => {
      const data = getCraftingResourceData(resource);
      return data.materialId === group.materialId && data.tier === group.tier && data.variantId === group.variantId && data.unitsPerItem === 1;
    });
    if (!source) throw new Error("No matching resource exists for a recorded material; ask the GM to review this project.");
    return { ...group, name: source.name, quantity: Math.floor(group.consumed * DISASSEMBLY_RETURN_PERCENT / 100) };
  });
  const plan = { projectId: project.id, itemId: item.id, itemUuid: item.uuid, itemName: item.name, returns };
  return { ...plan, signature: JSON.stringify(plan) };
}

export function disassemblyResourceSources(plan) {
  return plan.returns.filter(row => row.quantity > 0).map(row => {
    const source = structuredClone(CRAFTING_RESOURCE_SOURCES.find(resource => {
      const data = getCraftingResourceData(resource);
      return data.materialId === row.materialId && data.tier === row.tier && data.variantId === row.variantId;
    }));
    delete source._id;
    source.system.quantity = row.quantity;
    source.flags[MODULE_ID].salvagedFrom = plan.projectId;
    return source;
  });
}

/** GM-authoritative, locked and confirmed. New stacks avoid disturbing reserved stock. */
export async function disassembleProjectItem(party, projectId, {
  user, locks, loadWorkbench, saveWorkbench, requireEnabled, expectedSignature,
}) {
  requireEnabled();
  if (!user?.isGM || !party?.canUserModify?.(user, "update")) throw new Error("A GM must process disassembly.");
  if (locks.has(party.id)) throw new Error("This Party Stash is already processing a project.");
  locks.add(party.id);
  let created = [];
  let recorded = false;
  let originalProject;
  try {
    originalProject = loadWorkbench(party).projects.find(project => project.id === projectId);
    const item = findDisassemblyItem(party, originalProject);
    const plan = buildDisassemblyPlan(originalProject, item);
    if (!expectedSignature || plan.signature !== expectedSignature) throw new Error("The item or material return changed. Review and confirm a fresh preview.");
    const sources = disassemblyResourceSources(plan);
    requireEnabled();
    if (sources.length) created = await party.createEmbeddedDocuments("Item", sources);
    if (created.length !== sources.length) throw new Error("Foundry did not create all returned resources.");
    const latest = loadWorkbench(party);
    const current = latest.projects.find(project => project.id === projectId);
    // Inventory may have changed while the resource documents were being created.
    const liveItem = Array.from(party.items ?? []).find(candidate => candidate.uuid === plan.itemUuid);
    if (buildDisassemblyPlan(current, liveItem).signature !== expectedSignature) throw new Error("The item or project changed during disassembly.");
    requireEnabled();
    originalProject = current;
    await saveWorkbench(party, replaceProject(latest, recordProjectDisassembly(current, plan.returns, user)));
    recorded = true;
    await party.deleteEmbeddedDocuments("Item", [item.id]);
    if (Array.from(party.items ?? []).some(candidate => candidate.id === item.id)) {
      throw new Error("Foundry did not remove the item. Disassembly was cancelled.");
    }
    return plan;
  } catch (error) {
    try {
      if (created.length) await party.deleteEmbeddedDocuments("Item", created.map(item => item.id));
      if (recorded) {
        await saveWorkbench(party, replaceProject(loadWorkbench(party), originalProject), { rollback: true });
      }
    } catch {
      throw new Error("Disassembly could not be rolled back. Ask the GM to check the item, returned resources, and project before retrying.");
    }
    throw error;
  } finally {
    locks.delete(party.id);
  }
}
