import { MODULE_ID } from "./constants.js";
import { CRAFTING_RESOURCE_SOURCES } from "../content/crafting-resources.js";
import { getCraftingResourceData } from "./crafting-categories.js";
import { recordProjectDisassembly, replaceProject, createCraftingProject } from "./crafting-projects.js";
import { gmItemPlan } from "./gm-item-model.js";
import { augmentRecipeWithArtisanMarks } from "./artisan-marks.js";

export const DISASSEMBLY_RETURN_PERCENT = 50;

/** Resolve real project history first; otherwise derive a transparent standard-recipe return. */
export function droppedDisassemblyContext(workbench, item, config) {
  if (!item || item.pack) throw new Error("Import the item into the world before dismantling it.");
  const flags = item.flags?.[MODULE_ID];
  if (!flags?.material || !flags?.tier) throw new Error("This item does not have a Core material and tier.");
  const ids = (flags.crafting?.provenance ?? []).map(entry => entry.projectId).filter(Boolean);
  const existing = workbench.projects.find(project => !project.supersededBy && (project.finalItemUuid === item.uuid || ids.includes(project.id)));
  if (existing) return { project: existing, existing: true, plan: buildDisassemblyPlan(existing, item) };
  if (ids.length) throw new Error("Select the party holding this item's original crafting project. Its history must be checked before disassembly.");
  const components = Object.fromEntries((flags.crafting?.components ?? []).filter(entry => entry.structural).map(entry => [
    entry.slotType || entry.id, { materialId: entry.materialId, tier: entry.tier },
  ]));
  const itemPlan = gmItemPlan(item, {
    bandId: flags.gmCreated?.recipeBandId, materialId: flags.material, tier: flags.tier, components,
    marks: (flags.crafting?.artisanMarks ?? []).map(mark => ({
      id: mark.definitionId || mark.id, maker: mark.maker?.name || "Unknown Artisan",
      anchorId: mark.anchorSlotIds?.[0], choice: mark.configuration?.choice,
    })),
  }, config, { legacyDisassembly: true });
  const recipe = augmentRecipeWithArtisanMarks(itemPlan.recipe, itemPlan.assignments);
  const reservations = recipe.ingredientSets[0].groups.map(group => {
    const option = group.options.find(option => option.materialId === flags.material) ?? group.options[0];
    return { groupId: group.id, groupLabel: group.label, materialId: option.materialId,
      tier: option.tier, variantId: option.variantId, quantity: option.units,
      units: option.units, unitsPerItem: 1, state: "consumed" };
  });
  const project = {
    ...createCraftingProject({ recipe }), id: "dismantled:" + item.uuid, name: item.name,
    status: "completed", finalItemUuid: item.uuid, consumptionConfirmed: true,
    reservations, coreMaterialId: flags.material, coreTier: flags.tier, recipeBandId: itemPlan.band.id,
  };
  const plan = { ...buildDisassemblyPlan(project, item), basis: "Standard recipe (no recorded project)" };
  return { project, existing: false, plan };
}

export function findDisassemblyItem(party, project) {
  const matches = Array.from(party?.items ?? []).filter(item =>
    item.uuid === project?.finalItemUuid ||
    item.flags?.[MODULE_ID]?.crafting?.provenance?.some(entry => entry.projectId === project?.id));
  return matches.length === 1 ? matches[0] : null;
}

/** Only recorded, single-item outputs qualify. Never infer stock from price or item level. */
export function buildDisassemblyPlan(project, item) {
  if (project?.supersededBy) throw new Error("Use the latest upgrade project to dismantle this item.");
  if (item?.flags?.[MODULE_ID]?.upgradeProject) throw new Error("Complete or cancel the upgrade before dismantling.");
  if (!project || project.status !== "completed" || !project.consumptionConfirmed || project.disassembledAt) {
    throw new Error("Choose a completed project that has not already been disassembled.");
  }
  if (!item || (item.uuid !== project.finalItemUuid &&
    !item.flags?.[MODULE_ID]?.crafting?.provenance?.some(entry => entry.projectId === project.id))) {
    throw new Error("Move the project's finished item into the Party Stash first (one matching item only).");
  }
  const stackQuantity = Number(item.system?.quantity);
  const craftedQuantity = Number(project.recipe?.result?.quantity);
  if (!Number.isSafeInteger(stackQuantity) || stackQuantity < 1
    || !Number.isSafeInteger(craftedQuantity) || craftedQuantity < 1) {
    throw new Error("The stack and recorded output must have valid positive quantities.");
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
    // The ledger covers the original recipe output; scale it to the actual stack.
    group.consumed = group.consumed * stackQuantity / craftedQuantity;
    if (!Number.isFinite(group.consumed) || group.consumed > Number.MAX_SAFE_INTEGER) throw new Error("The stack is too large to disassemble safely.");
    const source = CRAFTING_RESOURCE_SOURCES.find(resource => {
      const data = getCraftingResourceData(resource);
      return data.materialId === group.materialId && data.tier === group.tier && data.variantId === group.variantId && data.unitsPerItem === 1;
    });
    if (!source) throw new Error("No matching resource exists for a recorded material; ask the GM to review this project.");
    return { ...group, name: source.name, quantity: Math.ceil(group.consumed * DISASSEMBLY_RETURN_PERCENT / 100) };
  });
  const plan = { projectId: project.id, itemId: item.id, itemUuid: item.uuid, itemName: item.name, stackQuantity, returns };
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

/** Consolidate duplicate resource stacks without invalidating active reservations. */
export async function consolidateDisassemblyResources(party, workbench) {
  const reserved = new Set(workbench.projects.flatMap(project =>
    project.reservations.filter(row => row.state === "reserved").map(row => row.itemId)));
  const groups = new Map();
  for (const item of party.items ?? []) {
    const data = getCraftingResourceData(item);
    if (!data) continue;
    const key = JSON.stringify([data.materialId, data.tier, data.variantId, data.unitsPerItem, item.system?.containerId ?? null]);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    const target = group.find(item => reserved.has(item.id)) ?? group[0];
    for (const donor of group) {
      if (donor === target || reserved.has(donor.id)) continue;
      const quantity = Number(donor.system.quantity);
      const total = Number(target.system.quantity) + quantity;
      if (!Number.isSafeInteger(quantity) || quantity < 0 || !Number.isSafeInteger(total)) continue;
      await party.updateEmbeddedDocuments("Item", [{ _id: target.id, "system.quantity": total }]);
      try {
        await party.deleteEmbeddedDocuments("Item", [donor.id]);
        if (Array.from(party.items).some(item => item.id === donor.id)) throw new Error("Material stack could not be merged.");
      } catch (error) {
        if (Array.from(party.items).some(item => item.id === donor.id)) {
          await party.updateEmbeddedDocuments("Item", [{ _id: target.id, "system.quantity": Number(target.system.quantity) - quantity }]);
        }
        throw error;
      }
    }
  }
}

/** GM-authoritative, locked and confirmed. Matching stacks retain their IDs so reservations stay valid. */
export async function disassembleProjectItem(party, projectId, {
  user, locks, loadWorkbench, saveWorkbench, requireEnabled, expectedSignature,
  itemUuid = null, resolveItem = null, config = null, requestingUser = user,
}) {
  requireEnabled();
  if (!user?.isGM || !party?.canUserModify?.(user, "update")) throw new Error("A GM must process disassembly.");
  const keys = [party.id, ...(itemUuid ? ["disassemble:" + itemUuid] : [])];
  if (keys.some(key => locks.has(key))) throw new Error("This Party Stash or item is already processing a project.");
  for (const key of keys) locks.add(key);
  let created = [];
  const credited = [];
  let recorded = false;
  let originalProject;
  let existing = true;
  let item;
  const checkOwner = candidate => {
    if (!candidate || candidate.pack) throw new Error("The source item is no longer available in the world.");
    const owner = candidate.actor ?? candidate.parent;
    if (owner ? owner.canUserModify?.(requestingUser, "update") !== true : !requestingUser?.isGM) {
      throw new Error("You do not have permission to dismantle this source item.");
    }
  };
  try {
    let plan;
    if (itemUuid) {
      item = await resolveItem(itemUuid);
      checkOwner(item);
      const context = droppedDisassemblyContext(loadWorkbench(party), item, config);
      originalProject = context.project; existing = context.existing; plan = context.plan;
      projectId = originalProject.id;
    } else {
      originalProject = loadWorkbench(party).projects.find(project => project.id === projectId);
      item = findDisassemblyItem(party, originalProject);
      plan = buildDisassemblyPlan(originalProject, item);
    }
    if (!expectedSignature || plan.signature !== expectedSignature) throw new Error("The item or material return changed. Review and confirm a fresh preview.");
    const sources = disassemblyResourceSources(plan);
    requireEnabled();
    const newSources = [];
    for (const source of sources) {
      const resource = getCraftingResourceData(source);
      const match = Array.from(party.items ?? []).find(candidate => {
        const data = getCraftingResourceData(candidate);
        return data && data.materialId === resource.materialId && data.tier === resource.tier
          && data.variantId === resource.variantId && data.unitsPerItem === resource.unitsPerItem;
      });
      if (!match) { newSources.push(source); continue; }
      const quantity = Number(match.system.quantity) + source.system.quantity;
      if (!Number.isSafeInteger(quantity)) throw new Error("Invalid material stack quantity.");
      await party.updateEmbeddedDocuments("Item", [{ _id: match.id, "system.quantity": quantity }]);
      credited.push({ id: match.id, quantity: source.system.quantity });
    }
    if (newSources.length) created = await party.createEmbeddedDocuments("Item", newSources);
    if (created.length !== newSources.length) throw new Error("Foundry did not create all returned resources.");
    const latest = loadWorkbench(party);
    const current = latest.projects.find(project => project.id === projectId) ?? (!existing ? originalProject : null);
    // Inventory may have changed while the resource documents were being created.
    const liveItem = itemUuid ? await resolveItem(itemUuid) : Array.from(party.items ?? []).find(candidate => candidate.uuid === plan.itemUuid);
    if (itemUuid) checkOwner(liveItem);
    const livePlan = itemUuid
      ? droppedDisassemblyContext(latest, liveItem, config).plan
      : buildDisassemblyPlan(current, liveItem);
    if (livePlan.signature !== expectedSignature) throw new Error("The item or project changed during disassembly.");
    requireEnabled();
    originalProject = current;
    await saveWorkbench(party, replaceProject(latest, recordProjectDisassembly(current, plan.returns, user)));
    recorded = true;
    if (itemUuid) await liveItem.delete();
    else await party.deleteEmbeddedDocuments("Item", [item.id]);
    const stillExists = itemUuid ? await resolveItem(itemUuid) : Array.from(party.items ?? []).some(candidate => candidate.id === item.id);
    if (stillExists) {
      throw new Error("Foundry did not remove the item. Disassembly was cancelled.");
    }
    // Disassembly is complete; a housekeeping failure must not undo its rewards.
    try { await consolidateDisassemblyResources(party, loadWorkbench(party)); }
    catch (error) {
      console.error("Wrathmaker | Material stack consolidation failed", error);
      globalThis.ui?.notifications?.warn("Disassembly completed, but some material stacks could not be merged.");
    }
    return plan;
  } catch (error) {
    try {
      for (const credit of credited) {
        const stack = Array.from(party.items ?? []).find(item => item.id === credit.id);
        const quantity = Number(stack?.system?.quantity) - credit.quantity;
        if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error("Returned stock changed during rollback.");
        await party.updateEmbeddedDocuments("Item", [{ _id: credit.id, "system.quantity": quantity }]);
      }
      if (created.length) await party.deleteEmbeddedDocuments("Item", created.map(item => item.id));
      if (recorded) {
        const rollback = loadWorkbench(party);
        await saveWorkbench(party, existing ? replaceProject(rollback, originalProject)
          : { ...rollback, projects: rollback.projects.filter(project => project.id !== projectId) }, { rollback: true });
      }
    } catch {
      throw new Error("Disassembly could not be rolled back. Ask the GM to check the item, returned resources, and project before retrying.");
    }
    throw error;
  } finally {
    for (const key of keys) locks.delete(key);
  }
}
