import { MODULE_ID } from "./constants.js";
export function specializationsEnabled() {
  try { return globalThis.game?.settings?.get(MODULE_ID, "professionSpecializations") === true; }
  catch { return false; }
}
