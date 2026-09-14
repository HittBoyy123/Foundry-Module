/** Capture the campaign clock rather than a real-world date. */
export function captureProjectDate(time = globalThis.game?.time) {
  const worldTime = time?.worldTime;
  if (typeof worldTime !== "number" || !Number.isFinite(worldTime)) return { worldTime: null, label: "" };
  let label = "";
  try { label = time.calendar?.format(worldTime) ?? ""; } catch { /* Clock not configured. */ }
  return { worldTime, label: String(label) };
}
export function archivedProjectMatches(project, tab = "crafted") {
  if (!project.archived && !project.disassembledAt) return false;
  return tab === "disassembled" ? Boolean(project.disassembledAt) : !project.disassembledAt;
}
