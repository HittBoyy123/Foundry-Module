function ordinal(day) {
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[day % 10] ?? "th");
  return `${day}${suffix}`;
}

/** Use the same epoch, month translations and year offset as PF2e's clock. */
export function formatProjectDate(worldTime, time = globalThis.game?.time) {
  if (typeof worldTime !== "number" || !Number.isFinite(worldTime)) return "";
  const clock = globalThis.game?.pf2e?.worldClock;
  const localize = value => globalThis.game?.i18n?.localize(value) ?? value;
  try {
    if (clock?.worldCreatedOn) {
      const date = clock.worldCreatedOn.plus({ seconds: worldTime });
      const theme = clock.dateTheme;
      const config = globalThis.CONFIG?.PF2E?.worldClock;
      const settings = config?.[theme];
      if (date.isValid !== false && settings) {
        const fantasy = theme === "AR" || theme === "IC";
        const month = fantasy ? localize(config.AR.Months[date.setLocale("en-US").monthLong]) : date.monthLong;
        const era = fantasy ? localize(settings.Era) : theme === "AD" ? date.toFormat("G") : "";
        return `${ordinal(date.day)} ${month} ${date.year + settings.yearOffset}${era ? " " + era : ""}`;
      }
    }
    const calendar = time?.calendar;
    const components = calendar?.timeToComponents?.(worldTime);
    const month = calendar?.months?.values?.[components?.month]?.name;
    if (components && month) {
      return `${ordinal(components.dayOfMonth + 1)} ${localize(month)} ${components.year + (calendar.years?.yearZero ?? 0)}`;
    }
  } catch { /* An unavailable clock must not prevent a crafting transaction. */ }
  return "";
}

export function projectHistoryDate(project) {
  const prefix = project.disassembledAt ? "disassembled" : "completed";
  return formatProjectDate(project[prefix + "WorldTime"]) || project[prefix + "WorldDate"]?.replace(/\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?/i, "") || "Date not recorded";
}

/** Retain the event timestamp for accurate formatting of existing history. */
export function captureProjectDate(time = globalThis.game?.time) {
  const worldTime = time?.worldTime;
  if (typeof worldTime !== "number" || !Number.isFinite(worldTime)) return { worldTime: null, label: "" };
  return { worldTime, label: formatProjectDate(worldTime, time) };
}
export function archivedProjectMatches(project, tab = "crafted") {
  if (!project.archived && !project.disassembledAt) return false;
  return tab === "disassembled" ? Boolean(project.disassembledAt) : !project.disassembledAt;
}
