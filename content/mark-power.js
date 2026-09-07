/** Explicit campaign-power revisions. Values are shared by prose and automation. */
const bonus = (selector, perTier, predicate = []) => ({ key: "FlatModifier", selector: [selector], perTier, type: "untyped", predicate });
const resistance = (type, perTier) => ({ key: "Resistance", type, perTier });
const entry = (name, groups, text, rules) => ({ name, validItemGroups: groups, effectSummary: text, rules, stackGroup: "", rationale: "Wrathmaker high-power campaign revision; stackable bonuses, no temporary HP." });
export const MARK_POWER = Object.freeze({
  "leatherwork-universal-reinforced-hide": entry("Tanner's Acid Ward", ["armor"], "Worn armor grants acid resistance equal to 3 × Core Tier. Resistance uses the highest applicable source, not their sum.", [resistance("acid", 3)]),
  "weaving-universal-reinforced-weave": entry("Slipknot Weave", ["armor"], "Worn armor grants an untyped bonus equal to Core Tier + 2 to Athletics and Acrobatics checks to Escape, not unarmed Escape attacks.", [bonus("athletics", 1, ["action:escape"]), bonus("acrobatics", 1, ["action:escape"])].map(r => ({ ...r, add: 2 }))),
  "tailoring-universal-reinforced-seam": entry("Steadfast Hem", ["armor"], "Worn armor grants an untyped bonus equal to Core Tier to Will saves against fear. Enable the Mark condition only against fear effects.", [bonus("will", 1, ["wrathmaker:mark-condition"])]),
  "glassmaking-universal-hardened-glass": entry("Glarecut Glass", ["spellFocus"], "A held focus grants an untyped bonus equal to Core Tier + 2 to visual Seek checks. Enable the Mark condition when sight applies; concealment is not negated.", [{ ...bonus("perception", 1, ["action:seek", "wrathmaker:mark-condition"]), add: 2 }]),
  "pottery-universal-hardened-ceramic": entry("Emberproof Glaze", ["armor", "shield"], "Worn armor or a held shield grants fire resistance equal to 3 × Core Tier. Resistance uses the highest applicable source.", [resistance("fire", 3)]),
  "leatherwork-universal-perfect-fit": entry("Supple Gussets", ["armor"], "Worn armor grants an untyped bonus equal to Core Tier + 2 to Acrobatics checks to Squeeze. Physical passage size restrictions still apply.", [{ ...bonus("acrobatics", 1, ["action:squeeze"]), add: 2 }]),
  "tailoring-universal-perfect-fit": entry("Tailored First Impression", ["armor"], "Worn armor grants an untyped bonus equal to Core Tier + 2 to Diplomacy checks to Make an Impression. This does not compel agreement or bypass attitudes.", [{ ...bonus("diplomacy", 1, ["action:make-an-impression"]), add: 2 }]),
  "glassmaking-specialty-1-calibrated-lens": entry("Surveyor's Reticle", ["spellFocus"], "A held focus grants an untyped bonus equal to Core Tier to initiative. Read the battlefield before the first blow.", [bonus("initiative", 1)]),
  "leatherwork-specialty-3-weather-mantle": entry("Whiteout Mantle", ["armor"], "Worn armor grants cold resistance equal to 5 × Core Tier and an untyped bonus equal to Core Tier to Survival. It does not grant weather immunity.", [resistance("cold", 5), bonus("survival", 1)]),
  "stonemason-specialty-3-mountain-plate": entry("Basalt Bastion", ["armor"], "Worn armor grants physical resistance equal to 3 × Core Tier and an untyped bonus equal to Core Tier to Fortitude saves.", [resistance("physical", 3), bonus("fortitude", 1)]),
  "stonemason-specialty-3-mountain-blood-plate": entry("Heart of the Mountain", ["armor"], "Worn armor grants physical resistance equal to 5 × Core Tier, an untyped bonus equal to Core Tier + 2 to Fortitude saves, and -5 feet to land Speed. Physical resistances use the highest source.", [resistance("physical", 5), { ...bonus("fortitude", 1), add: 2 }, { ...bonus("land-speed", 0), add: -5 }]),
  "weaving-specialty-2-unbreakable-braid": entry("Lifeline Braid", ["armor"], "Worn armor grants bleed resistance equal to 5 × Core Tier and an untyped bonus equal to Core Tier + 2 to Athletics and Acrobatics checks to Escape, not unarmed Escape attacks.", [resistance("bleed", 5), ...["athletics", "acrobatics"].map(s => ({ ...bonus(s, 1, ["action:escape"]), add: 2 }))]),
  "leatherwork-specialty-3-sovereign-pelt": entry("Dread Sovereign Pelt", ["armor"], "Worn armor grants an untyped bonus equal to Core Tier + 2 to Intimidation and Survival. A predator's presence dominates the hunt and the negotiation table without removing social consequences.", ["intimidation", "survival"].map(s => ({ ...bonus(s, 1), add: 2 }))),
  "tailoring-specialty-1-war-skin": entry("Duelist's War-Skin", ["armor"], "Worn armor grants untyped bonuses of Core Tier to AC and Reflex saves, and 5 × Core Tier feet to land Speed. It grants no physical resistance.", [bonus("ac", 1), bonus("reflex", 1), bonus("land-speed", 5)]),
  "blacksmithing-specialty-2-aegis-of-dawn": entry("Aegis of Dawn", ["armor"], "Worn armor grants +12 × Core Tier maximum HP and spirit and void resistance equal to 3 × Core Tier. This is maximum HP, not temporary HP or healing; repeated equipping must not restore damage.", [bonus("hp", 12), resistance("spirit", 3), resistance("void", 3)]),
  "tailoring-specialty-1-vital-reinforcement": entry("Vital Reinforcement", ["armor"], "Worn armor grants +18 × Core Tier maximum HP. This is maximum HP, not temporary HP or healing; repeated equipping must not restore damage.", [bonus("hp", 18)]),
  "carpentry-specialty-1-perfected-tension": entry("Horizonstring", ["weapon"], "A ranged weapon grants +2 untyped to attacks against targets beyond its first range increment. This Over-Potency bonus is capped at +2 per Mark. Enable the Mark condition only at that distance. Normal range penalties still apply.", [{ ...bonus("$attack", 0, ["wrathmaker:mark-condition"]), add: 2 }]),
  "carpentry-universal-reinforced-limb": entry("Skyhunter Limbs", ["weapon"], "A ranged weapon deals +3 × Core Tier damage against flying or falling targets. Enable the Mark condition only against an airborne target.", [bonus("$damage", 3, ["wrathmaker:mark-condition"])]),
  "blacksmithing-specialty-1-perfected-killing-edge": entry("Executioner's Ember", ["weapon"], "A weapon deals additional precision damage equal to Core Tier d8 against a creature at or below half maximum HP. Enable the Mark condition only against an eligible target. Precision immunity applies.", [{ key: "DamageDice", selector: ["$damage"], dicePerTier: 1, dieSize: "d8", category: "precision", predicate: ["wrathmaker:mark-condition"] }]),
  "glassmaking-specialty-1-crown-prism": entry("Sovereign Refraction", ["spellFocus"], "A held spell focus grants +2 untyped to spell DC and +Core Tier untyped to Arcana, with a -1 untyped spell-attack penalty. The Over-Potency spell DC bonus is capped at +2 per Mark. Requires a Tier 5+ optical Anchor. Its power favours save spells.", [{ ...bonus("spell-dc", 0), add: 2 }, bonus("arcana", 1), { ...bonus("spell-attack", 0), add: -1 }]),
});

export function powerRules(id, tier, itemId) {
  const definition = MARK_POWER[id];
  if (!definition) return null;
  const level = Math.max(1, Math.min(6, Number(tier) || 1));
  return definition.rules.map(({ perTier, add = 0, dicePerTier, ...rule }) => ({
    ...rule,
    ...(rule.selector ? { selector: rule.selector.map(s => s === "$attack" ? `${itemId}-attack` : s === "$damage" ? `${itemId}-damage` : s) } : {}),
    ...(perTier !== undefined ? { value: perTier * level + add } : {}),
    ...(dicePerTier !== undefined ? { diceNumber: dicePerTier * level } : {}),
  }));
}

/** Multipliers use the prepared, pre-Mark item HP once; stacked bonuses add, never compound. */
export const MARK_ITEM_POWER = Object.freeze({
  "blacksmithing-universal-tempered-construction": {
    name: "Tempered Construction", validItemGroups: ["armor", "shield"], stackGroup: "",
    effectSummary: "Armor or shield gains +50% of its pre-Mark maximum item HP and +Core Tier Hardness. This improves the item, not its wearer's HP. Durability bonuses add against the same pre-Mark base; they do not multiply each other.",
    hpMultiplier: () => 1.5, hardness: tier => tier,
  },
  "blacksmithing-universal-fortified-frame": {
    name: "Fortified Frame", validItemGroups: ["armor", "shield"], stackGroup: "",
    effectSummary: "Armor or shield has ×2 pre-Mark maximum item HP at Core Tiers 1–3, ×3 at Tiers 4–5, and ×4 at Tier 6, plus 2 × Core Tier Hardness. Other durability bonuses add against the same pre-Mark base, not this multiplied value. This does not grant wearer HP or AC.",
    hpMultiplier: tier => tier >= 6 ? 4 : tier >= 4 ? 3 : 2, hardness: tier => 2 * tier,
  },
  "stonemason-universal-stonebound": {
    name: "Stonebound", validItemGroups: ["armor", "shield"], stackGroup: "",
    effectSummary: "Armor or shield gains +50% of its pre-Mark maximum item HP and +2 × Core Tier Hardness. The stone protects the item, not its wearer's HP. Durability bonuses add against the same pre-Mark base.",
    hpMultiplier: () => 1.5, hardness: tier => 2 * tier,
  },
});
