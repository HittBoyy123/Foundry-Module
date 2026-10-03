import { MODULE_ID } from "./constants.js";
import { WRATHMAKER_PLAYER_GUIDE, WRATHMAKER_GM_GUIDE } from "../content/wrathmaker-guide.js";
import { CRAFTING_GUIDE } from "../content/crafting-guide.js";

/** Refresh shipped references through Foundry's API, never world journal copies. */
export async function refreshGuideCompendiums({ force = false, report = null } = {}) {
  if (!game.user.isGM) return;
  const gm = [...game.users].filter(user => user.active && user.isGM).sort((a, b) => a.id.localeCompare(b.id))[0];
  if (gm?.id !== game.user.id) return;
  for (const [name, source] of [["player-guide", WRATHMAKER_PLAYER_GUIDE], ["gm-guide", WRATHMAKER_GM_GUIDE], ["artisan-marks", CRAFTING_GUIDE]]) {
    const pack = game.packs.get(`${MODULE_ID}.${name}`);
    if (!pack) continue;
    const journal = await pack.getDocument(source._id);
    if (!journal || (!force && journal.getFlag(MODULE_ID, "guideRevision") === "2026-10-03-masterstrokes")) continue;
    const locked = pack.locked;
    const before = journal.toObject?.();
    try {
      if (locked) await pack.configure({ locked: false });
      const ids = new Set(source.pages.map(page => page._id));
      const obsolete = journal.pages.filter(page => !ids.has(page.id)).map(page => page.id);
      if (obsolete.length) await journal.deleteEmbeddedDocuments("JournalEntryPage", obsolete);
      const existing = source.pages.filter(page => journal.pages.has(page._id));
      const missing = source.pages.filter(page => !journal.pages.has(page._id));
      if (existing.length) await journal.updateEmbeddedDocuments("JournalEntryPage", existing);
      if (missing.length) await journal.createEmbeddedDocuments("JournalEntryPage", missing, { keepId: true });
      await journal.update({ name: source.name, ownership: source.ownership, [`flags.${MODULE_ID}.guideRevision`]: "2026-10-03-masterstrokes" });
      report?.push({ name: source.name, status: "Updated", changes: [{ kind: "Changed", path: "Guide pages", before: before?.pages, after: source.pages }] });
    } catch (error) {
      if (!report) throw error;
      report.push({ name: source.name, status: "Failed", error: error.message, changes: [] });
    } finally { if (locked) await pack.configure({ locked: true }); }
  }
}
