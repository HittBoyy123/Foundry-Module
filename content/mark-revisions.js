/** Stable IDs preserve provenance. Revision text and automation are authored together. */
import { MARK_POWER, MARK_ITEM_POWER } from "./mark-power.js";
import { CATALOGUE_REVISIONS } from "./mark-catalogue-pass.js";
const PREVIOUS_REVISIONS = Object.freeze({
  "leatherwork-universal-reinforced-hide": {
    name: "Tanner's Acid Ward", validItemGroups: ["armor"],
    effectSummary: "Worn armor grants acid resistance equal to Core Tier. The hide is treated to shed corrosive secretions; this does not grant item HP or Hardness.",
    rationale: "Replaced another copy of Tempered Construction with a corrosion defence.",
  },
  "weaving-universal-reinforced-weave": {
    name: "Slipknot Weave", validItemGroups: ["armor"],
    effectSummary: "While wearing this armor, gain a +2 untyped Artisan bonus to Athletics and Acrobatics checks to Escape. This does not improve an unarmed attack used to Escape.",
    rationale: "Restraint escape replaces generic item durability.",
  },
  "tailoring-universal-reinforced-seam": {
    name: "Steadfast Hem", validItemGroups: ["armor"],
    effectSummary: "Worn armor grants a +1 untyped Artisan bonus to Will saves against fear. Select the Mark condition when the incoming effect has the fear trait.",
    rationale: "A small resolve benefit instead of duplicated Hardness.",
  },
  "glassmaking-universal-hardened-glass": {
    name: "Glarecut Glass", validItemGroups: ["spellFocus"],
    effectSummary: "While holding this focus, gain a +1 untyped Artisan bonus to Perception checks to Seek visually. It filters glare without granting immunity to dazzled or concealed.",
    rationale: "A search optic instead of a second reinforced frame.",
  },
  "pottery-universal-hardened-ceramic": {
    name: "Emberproof Glaze", validItemGroups: ["armor", "shield"],
    effectSummary: "Worn armor or a held shield grants fire resistance 1. Multiple sources use only the highest applicable resistance.",
    rationale: "Minor heat protection instead of duplicated item HP.",
  },
  "leatherwork-universal-perfect-fit": {
    name: "Supple Gussets", validItemGroups: ["armor"],
    effectSummary: "Worn armor grants a +1 untyped Artisan bonus to Acrobatics checks to Squeeze. It does not reduce the item's Bulk.",
    rationale: "Squeezing expertise leaves the light-frame niche to Carpentry.",
  },
  "tailoring-universal-perfect-fit": {
    name: "Tailored First Impression", validItemGroups: ["armor"],
    effectSummary: "Worn armor grants a +1 untyped Artisan bonus to Diplomacy checks to Make an Impression. The immaculate fit does not reduce Bulk.",
    rationale: "Social tailoring rather than a second Perfect Fit.",
  },
  "carpentry-universal-reinforced-limb": {
    name: "Skyhunter Limbs", validItemGroups: ["weapon"],
    effectSummary: "A ranged weapon deals additional damage equal to Core Tier against an airborne target. Select the Mark condition only when the target is flying or falling. This is not bonus damage against objects.",
    rationale: "Anti-air bow hunting is distinct from the smith's siege edge.",
  },
  "glassmaking-specialty-1-calibrated-lens": {
    name: "Surveyor's Reticle", validItemGroups: ["spellFocus"],
    effectSummary: "While holding this focus, gain a +1 untyped Artisan bonus to initiative rolls. It measures emerging lines of fire rather than repeating Glarecut Glass's Seek bonus.",
    rationale: "Initiative optic rather than another visual Perception modifier.",
  },
  "leatherwork-specialty-3-weather-mantle": {
    name: "Whiteout Mantle", validItemGroups: ["armor"],
    effectSummary: "Worn armor grants cold resistance equal to twice Core Tier. It does not confer immunity to weather, difficult terrain, or environmental penalties.",
    rationale: "A concrete cold-weather defensive identity, not broader Weather Seal.",
  },
  "stonemason-specialty-3-mountain-plate": {
    name: "Basalt Bastion", validItemGroups: ["armor"],
    effectSummary: "Worn armor grants physical resistance equal to Core Tier and a +2 untyped Artisan bonus to Fortitude saves. It no longer increases maximum HP.",
    rationale: "Fortitude and impact endurance rather than Aegis of Dawn's vitality.",
  },
  "stonemason-specialty-3-mountain-blood-plate": {
    name: "Heart of the Mountain", validItemGroups: ["armor"],
    effectSummary: "Worn armor grants physical resistance equal to twice Core Tier and a +3 untyped Artisan bonus to Fortitude saves, but imposes a -5-foot untyped penalty to land Speed. It grants no maximum HP. Physical resistances do not add together.",
    rationale: "Superior immovability has a mobility trade-off, rather than double vitality.",
  },
  "weaving-specialty-2-unbreakable-braid": {
    name: "Lifeline Braid", validItemGroups: ["armor"],
    effectSummary: "Worn armor grants bleed resistance equal to twice Core Tier and a +3 untyped Artisan bonus to Athletics and Acrobatics checks to Escape. It grants no maximum HP and does not improve an unarmed Escape attack.",
    rationale: "A superior anti-bleed and escape weave, not another six-times-Tier HP source.",
  },
  "leatherwork-specialty-3-sovereign-pelt": {
    name: "Dread Sovereign Pelt", validItemGroups: ["armor"],
    effectSummary: "Worn armor grants a +3 untyped Artisan bonus to Intimidation and a +2 untyped Artisan bonus to Survival. It grants no maximum HP. The trophy declares its wearer a hunter worthy of fear.",
    rationale: "Hunting and intimidation replace another vitality-and-social package.",
  },
  "tailoring-specialty-1-war-skin": {
    name: "Duelist's War-Skin", validItemGroups: ["armor"],
    effectSummary: "Worn armor grants a +1 untyped Artisan bonus to AC, a +10-foot untyped Artisan bonus to land Speed and a +2 untyped Artisan bonus to Reflex saves. It does not grant physical resistance.",
    rationale: "Mobile evasion is distinct from Silken Steel's armoured resistance.",
  },
  "blacksmithing-specialty-1-perfected-killing-edge": {
    name: "Executioner's Ember", validItemGroups: ["weapon"],
    effectSummary: "A weapon deals +2d6 precision damage against a creature at or below half its maximum HP, increasing to +3d6 at Core Tier 6. Select the Mark condition only for an eligible target. Precision immunity applies; this grants no attack bonus.",
    rationale: "A high-impact finisher instead of another universally optimal Over-Potency bonus.",
  },
  "carpentry-specialty-1-perfected-tension": {
    name: "Horizonstring", validItemGroups: ["weapon"],
    effectSummary: "A ranged weapon grants a +2 untyped Artisan bonus to its attack rolls against targets beyond its first range increment. Select the Mark condition only for that distance. Range penalties and maximum range still apply; this is not a universal attack bonus.",
    rationale: "Long-range accuracy, leaving short-range pressure and universal potency distinct.",
  },
  "glassmaking-specialty-1-crown-prism": {
    name: "Sovereign Refraction", validItemGroups: ["spellFocus"],
    effectSummary: "A held spell focus grants a +1 untyped Artisan bonus to spell DC and a +2 untyped Artisan bonus to Arcana, but imposes a -1 untyped penalty to spell attacks. Requires a Tier 5+ optical Anchor. Multiple copies do not multiply the penalty. It is a save-spell specialist, not a second Overlord Matrix.",
    rationale: "A deliberate save-versus-attack casting choice instead of a duplicate potency focus.",
  },
});
export const MARK_REVISIONS = Object.freeze({ ...PREVIOUS_REVISIONS, ...CATALOGUE_REVISIONS, ...MARK_POWER, ...MARK_ITEM_POWER });
