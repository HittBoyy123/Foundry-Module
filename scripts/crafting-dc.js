export const CRAFTING_TIER_LEVELS = Object.freeze({
  1: 1,
  2: 4,
  3: 8,
  4: 12,
  5: 16,
  6: 20,
});

export const CRAFTING_LEVEL_DCS = Object.freeze({
  1: 15,
  4: 19,
  8: 24,
  12: 30,
  16: 35,
  20: 40,
});

export const CRAFTING_DIFFICULTY_ADJUSTMENTS = Object.freeze({
  "incredibly-easy": Object.freeze({ label: "Incredibly Easy", modifier: -10 }),
  "very-easy": Object.freeze({ label: "Very Easy", modifier: -5 }),
  easy: Object.freeze({ label: "Easy", modifier: -2 }),
  normal: Object.freeze({ label: "Normal", modifier: 0 }),
  hard: Object.freeze({ label: "Hard", modifier: 2 }),
  "very-hard": Object.freeze({ label: "Very Hard", modifier: 5 }),
  "incredibly-hard": Object.freeze({ label: "Incredibly Hard", modifier: 10 }),
});

function integer(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

export function getCraftingTierLevel(tier) {
  return CRAFTING_TIER_LEVELS[integer(tier)] ?? null;
}

export function calculateCraftingDC(tier, adjustment = "normal") {
  const normalizedTier = integer(tier);
  const level = getCraftingTierLevel(normalizedTier);
  if (level === null) return null;

  const normalizedAdjustment = Object.hasOwn(CRAFTING_DIFFICULTY_ADJUSTMENTS, adjustment)
    ? adjustment
    : "normal";
  const difficulty = CRAFTING_DIFFICULTY_ADJUSTMENTS[normalizedAdjustment];
  const baseDC = CRAFTING_LEVEL_DCS[level];

  return {
    tier: normalizedTier,
    level,
    baseDC,
    adjustment: normalizedAdjustment,
    adjustmentLabel: difficulty.label,
    modifier: difficulty.modifier,
    dc: baseDC + difficulty.modifier,
  };
}

export function listCraftingDifficultyAdjustments() {
  return Object.entries(CRAFTING_DIFFICULTY_ADJUSTMENTS).map(([id, value]) => ({ id, ...value }));
}
