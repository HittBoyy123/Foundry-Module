/** Additional named activations preserve passive benefits and existing Mark IDs. */
const action = value => ({ type: "action", value });
export const MARK_ACTIVATION_EXPANSIONS = Object.freeze({
  "glassmaking-universal-shatter-safe": {
    activation: { type: "reaction", value: null },
    append: "Shatter Ward — Reaction. Trigger: damage would destroy this item. Spend one of this Mark's two daily uses to leave it at 1 item HP instead. This is the activation cost of its existing protection, not additional uses; it never prevents damage to the bearer.",
  },
  "pottery-universal-nested-chamber": {
    activation: action(1),
    append: "Chamber Draw — One action (Manipulate): retrieve one object from a chamber into a free hand. This does not activate, drink or use the retrieved object; those actions retain their normal costs.",
  },
  "glassmaking-universal-perfect-clarity": {
    activation: action(3),
    append: "Stored Flare — Three actions (Concentrate, Manipulate, Light), once per day: release stored light in a 15-foot emanation. Creatures other than you attempt a Fortitude save against your higher class or spell DC: failure dazzled for Core Tier rounds; critical failure blinded for 1 round, then dazzled for Core Tier rounds; success unaffected. Resolve saves and conditions manually. This is a visual effect.",
  },
  "blacksmithing-universal-reinforced-edge": {
    activation: action(2),
    append: "Sundering Drive — Two actions, once per encounter: make one Strike with this weapon against an object. On a hit, add 3 × Core Tier damage before Hardness. This Strike counts toward multiple attack penalty normally; the additional damage is resolved manually.",
  },
  "pottery-specialty-1-ceramic-plate": {
    activation: action(2),
    append: "Kiln Renewal — Two actions, once per encounter: touch the armor or shield to restore 8 × Core Tier item HP, up to its maximum. It must not be destroyed. This repairs the item, never its wearer's HP.",
  },
  "weaving-specialty-2-impact-mesh": {
    activation: action(2),
    append: "Impact Lock — Two actions, once per encounter: until the start of your next turn, increase this Mark's physical resistance to 6 × Core Tier. This replaces its passive resistance for that duration; do not add the two together. Resolve the temporary increase manually.",
  },
  "enchanting-universal-stable-matrix": {
    activation: action(2),
    append: "Spellbreak Guard — Two actions, once per encounter: gain +5 Artisan Bonus to your next saving throw against a spell before the start of your next turn. Wield or wear the item throughout. This does not counteract the spell and must be applied manually to that save.",
  },
  "glassmaking-universal-precision-focus": {
    activation: action(2),
    append: "Prismatic Sightline — Two actions, once per encounter: Seek using the optic, then make one ranged Strike with this weapon against a creature you detected. Ignore ordinary concealment for that Strike, but not hidden, undetected or total cover. Normal multiple attack penalty applies.",
  },
  "glassmaking-specialty-3-mana-reservoir": {
    activation: action(2),
    append: "Reservoir Lance — Two actions, once per encounter: expend one charge from the named pool to deal 2 × Core Tier d6 force damage to one creature within 60 feet, basic Reflex against your higher class or spell DC. This does not restore or create charges; resolve damage and charge spending manually.",
  },
  "glassmaking-specialty-2-truth-mirror": {
    activation: action(1),
    append: "Unmask — One action, once per encounter: attempt to counteract one visual illusion affecting a creature or object seen through the mirror within 30 feet. Use your higher class or spell DC minus 10 for the counteract modifier and Core Tier as counteract rank. Ordinary disguises instead permit one immediate Seek check.",
  },
  "tailoring-specialty-3-envoys-raiment": {
    activation: { type: "free", value: null },
    append: "Envoy's Reprise — Free action, once per day after failing a Diplomacy check made in your recognised official capacity: reroll and use the new result. This is a fortune effect; it cannot combine with another fortune effect on that roll.",
  },
  "bookmaking-specialty-1-archmage-codex": {
    activation: action(2),
    effectSummary: "Elemental Thesis — Choose Acid, Cold, Electricity, Fire or Sonic when applying this Mark. While holding this spell focus, damaging spells bearing the chosen elemental trait gain bonus damage of that type. Passive formula: 2 × spell damage die (3 × at Core Tier 6). Ascendant Thesis — Two actions, once per encounter for 1 minute: replace the passive bonus with (Core Tier + 2) × spell damage die. Use the chosen type's first base damage component and its largest die; if that type is absent, use the spell's first base component. Flat-only components provide no bonus dice. Example: Core Tier 4 with a d6 spell adds 2d6 passively or 6d6 while activated. Add this once to initial damage, not each missile, persistent tick or later repeated damage. Enable Initial Spell Damage only for that roll. Enable Ascendant Thesis after activation and clear it when the minute ends. Uses and duration are tracked manually; active and passive dice never add together.",
  },
});
