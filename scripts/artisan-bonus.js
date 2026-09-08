/**
 * Wrathmaker's Mark-only bonus category. PF2e validates a closed modifier-type
 * enum, so the engine boundary uses its additive carrier without changing the
 * global enum or relabelling any other source's untyped modifiers.
 */
export const ARTISAN_BONUS_TYPE = "artisan";
export const ARTISAN_BONUS_TAG = "wrathmaker-artisan-bonus";

export function asArtisanBonus(rule, markName = "") {
  if (rule.key !== "FlatModifier") return rule;
  const penalty = typeof rule.value === "number" && rule.value < 0;
  const category = penalty ? "Artisan Penalty" : "Artisan Bonus";
  const name = markName || rule.label || "Artisan Mark";
  return {
    ...rule, type: ARTISAN_BONUS_TYPE,
    label: name.includes(" — Artisan ") ? name : `${name} — ${category}`,
    tags: [...new Set([...(rule.tags ?? []), ARTISAN_BONUS_TAG])],
  };
}

export function toPF2eArtisanRule(rule) {
  if (rule.key !== "FlatModifier" || rule.type !== ARTISAN_BONUS_TYPE
    || !rule.tags?.includes(ARTISAN_BONUS_TAG)) return rule;
  // Never force a modifier: predicates, disabled toggles and immunity still apply.
  return { ...rule, type: "untyped" };
}

/** Only known Mark definitions call this; global descriptions are not rewritten. */
export function artisanRulesText(text) {
  return String(text ?? "")
    .replace(/untyped Artisan bonus/gi, "Artisan Bonus")
    .replace(/untyped Artisan bonuses/gi, "Artisan Bonuses")
    .replace(/untyped bonuses/gi, "Artisan Bonuses")
    .replace(/untyped bonus/gi, "Artisan Bonus")
    .replace(/untyped penalty/gi, "Artisan Penalty")
    .replace(/untyped to/gi, "Artisan Bonus to")
    .replace(/untyped (AC|Athletics)/g, "Artisan Bonus to $1")
    .replace(/untyped/g, "Artisan");
}
