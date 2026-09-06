import { recordProjectRecovery, replaceProject } from "./crafting-projects.js";

/** Recovery never touches resource stacks, reservations, or downtime. */
export async function recoverProjectItem(party, projectId, {
  user, locks, loadWorkbench, saveWorkbench, findExisting, buildLegacySource,
}) {
  if (!user?.isGM || !party?.canUserModify?.(user, "update")) throw new Error("Only a GM can recover a project item.");
  if (locks.has(party.id)) throw new Error("This Party Stash is already processing a project.");
  locks.add(party.id);
  let created = null;
  try {
    const workbench = loadWorkbench(party);
    const project = workbench.projects.find(entry => entry.id === projectId);
    if (!project || project.status !== "completed") throw new Error("Only completed projects can recover an item.");
    if (project.disassembledAt) throw new Error("Disassembled items cannot be recovered.");
    if (await findExisting(project)) throw new Error("The finished item still exists. Check the Party Stash or the character carrying it.");
    const source = structuredClone(project.finalItemSource ?? await buildLegacySource(project));
    if (!source?.type || !source.system) throw new Error("The item cannot be rebuilt: its saved output and original base item are unavailable.");
    for (const key of ["_id", "folder", "ownership", "_stats"]) delete source[key];
    [created] = await party.createEmbeddedDocuments("Item", [source]);
    if (!created?.uuid) throw new Error("Foundry did not create the recovered item.");
    // Preserve other project updates that happened while creating this item.
    const latest = loadWorkbench(party);
    const current = latest.projects.find(entry => entry.id === projectId);
    if (!current || current.status !== "completed" || current.finalItemUuid !== project.finalItemUuid) {
      throw new Error("The project changed during recovery. No replacement was kept.");
    }
    const recovered = recordProjectRecovery(current, { finalItemUuid: created.uuid, finalItemSource: source, user });
    await saveWorkbench(party, replaceProject(latest, recovered));
    return created;
  } catch (error) {
    if (created) {
      try { await party.deleteEmbeddedDocuments("Item", [created.id]); }
      catch { throw new Error(`Recovery could not be recorded or rolled back. Check item ${created.name ?? created.id} before retrying.`); }
    }
    throw error;
  } finally {
    locks.delete(party.id);
  }
}
