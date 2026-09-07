import { ARTISAN_MARK_DEFINITIONS } from "./artisan-marks.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);
const list = values => (values ?? []).map(escape).join(", ") || "None";

/** Reference journals, not draggable feats that could accidentally grant abilities. */
export const ARTISAN_MARK_JOURNAL_SOURCES = Object.freeze(ARTISAN_MARK_DEFINITIONS.map((mark, index) => {
  const id = "wmMark" + String(index + 1).padStart(10, "0");
  const source = mark.profession + " — " + (mark.specialisation || "Universal");
  return {
    _id: id,
    name: mark.name + " — " + source,
    ownership: { default: 2 },
    flags: { "pf2e-crafting-material-tiers": { artisanMarkReference: mark.id } },
    pages: [{
      _id: id, name: mark.name, type: "text", sort: 100000,
      title: { show: true, level: 1 },
      text: { format: 1, content:
        "<h2>" + escape(mark.name) + "</h2>" +
        "<p><strong>Source:</strong> " + escape(source) + "</p>" +
        "<p>" + escape(mark.effectSummary) + "</p>" +
        "<table><tbody>" +
        "<tr><th>Grade</th><td>" + escape(mark.grade) + "</td></tr>" +
        "<tr><th>Capacity</th><td>" + mark.capacityCost + "</td></tr>" +
        "<tr><th>Minimum Core Tier</th><td>" + mark.minimumTier + "</td></tr>" +
        "<tr><th>Minimum Anchor Tier</th><td>" + mark.minimumAnchorTier + (mark.requiresCoreTierAnchors ? "; Core-tier Anchor required" : "") + "</td></tr>" +
        "<tr><th>Anchor types</th><td>" + list(mark.anchorSlotTypes) + "</td></tr>" +
        "<tr><th>Item groups</th><td>" + list(mark.validItemGroups) + "</td></tr>" +
        "<tr><th>Specialist materials</th><td>" + (mark.materialUnits ? mark.materialUnits + " unit(s): " + list(mark.requiredMaterialIds) : "Workshop consumables only") + "</td></tr>" +
        "<tr><th>Synergy tags</th><td>" + list(mark.synergyTags) + "</td></tr>" +
        "</tbody></table>" +
        (mark.capacityCost === 0 ? "<p>Only one zero-Capacity Artisan Mark is allowed per new item.</p>" : "") +
        "<p>Reference only. Use the Workbench or GM Item Creator to apply this Mark; those tools check the exact item and Anchor compatibility.</p>",
      },
    }],
  };
}));
