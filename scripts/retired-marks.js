import { calculateMarkLabourDays } from "./artisan-marks.js";

/** Release unspent Mark costs; keep the original plan in the project audit. */
export function retireProjectMarks(project) {
  if (["completed", "cancelled"].includes(project.status) || project.audit?.some(entry => entry.action === "marks-retired")) return project;
  const marks = project.artisanMarks ?? [];
  const isMark = entry => String(entry.groupId ?? entry.id ?? "").startsWith("mark-");
  const groups = project.recipe.ingredientSets.flatMap(set => set.groups).filter(isMark);
  const reservations = project.reservations.filter(entry => isMark(entry) && entry.state !== "consumed");
  if (!marks.length && !groups.length && !reservations.length) return project;
  project.audit.push({ id: "retired-artisan-marks", action: "marks-retired", message: "Artisan Marks retired; unspent materials released and Mark work removed.",
    createdAt: Date.now(), details: { marks: structuredClone(marks), groups: structuredClone(groups), reservations: structuredClone(reservations), requiredProgress: project.requiredProgress } });
  project.requiredProgress = Math.max(1, project.requiredProgress - calculateMarkLabourDays(marks, project.coreTier));
  project.currentProgress = Math.min(project.currentProgress, project.requiredProgress);
  project.artisanMarks = [];
  const hasRemainingWork = project.recipe.ingredientSets.some(set => set.groups.some(entry => !isMark(entry)));
  // A former Mark-only upgrade retains its recipe as a historical record and can close without spending stock.
  if (hasRemainingWork) {
    project.recipe.ingredientSets = project.recipe.ingredientSets.map(set => ({ ...set, groups: set.groups.filter(entry => !isMark(entry)) })).filter(set => set.groups.length);
  } else {
    project.requiredProgress = 1;
    project.currentProgress = 1;
  }
  project.reservations = project.reservations.filter(entry => !isMark(entry) || entry.state === "consumed");
  if (project.currentProgress >= project.requiredProgress) {
    project.status = "ready";
    project.stage = "finalisation";
  }
  return project;
}
