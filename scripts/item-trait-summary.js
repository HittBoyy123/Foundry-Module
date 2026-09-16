/** Read actual item traits; armor category alone does not imply Bulwark. */
export function itemTraitSummary(item, config = globalThis.CONFIG?.PF2E ?? {}, localize = key => globalThis.game?.i18n?.localize(key) ?? key) {
  const dictionary = config[`${item?.type}Traits`] ?? {};
  const fallback = value => String(value).replaceAll("-", " ").replace(/\b\w/g, letter => letter.toUpperCase());
  const traits = [...new Set(item?.system?.traits?.value ?? [])].map(trait => {
    const label = dictionary[trait] ?? config.equipmentTraits?.[trait];
    return label ? localize(label) : fallback(trait);
  });
  const custom = item?.system?.traits?.custom;
  if (typeof custom === "string" && custom.trim()) traits.push(custom.trim());
  return traits.join(" · ");
}
