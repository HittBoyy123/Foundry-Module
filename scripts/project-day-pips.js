/** One pip represents one day of completed crafting work. */
export function projectDayPips(project) {
  const total = Math.max(1, Math.trunc(Number(project.requiredProgress) || 1));
  const completed = Math.min(total, Math.max(0, Math.trunc(Number(project.currentProgress) || 0)));
  return {
    daysCompleted: completed, daysTotal: total, daysRemaining: total - completed,
    dayPips: Array.from({ length: total }, (_, index) => ({ day: index + 1, completed: index < completed })),
  };
}
