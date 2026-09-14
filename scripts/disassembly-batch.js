/** Queue distinct inventory/world items without changing their documents. */
export function addDisassemblyItems(queue, uuids) {
  const result = [...new Set([...queue, ...uuids].filter(uuid => typeof uuid === "string" && uuid))];
  if (result.length > 50) throw new Error("Disassemble up to 50 items at a time.");
  return result;
}

/** Stop on the first failure; completed items must not be retried. */
export async function processDisassemblyBatch(entries, execute, onComplete) {
  for (const entry of entries) {
    await execute(entry);
    onComplete(entry);
  }
}
