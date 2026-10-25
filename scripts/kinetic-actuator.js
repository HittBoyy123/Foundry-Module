export function isKineticActuator(item) {
  const tags = item?.system?.traits?.otherTags;
  return item?.type === "equipment" && (Array.isArray(tags) ? tags.includes("kinetic-actuator") : tags?.has?.("kinetic-actuator") === true);
}

/** Reuse configured focus progression, targeting only the impulse statistic. */
export function actuatorRules(rules) {
  return rules.filter(rule => rule.key === "FlatModifier" && [].concat(rule.selector ?? []).includes("spell-attack"))
    .map(rule => ({ ...rule, selector: ["impulse-attack-roll", "impulse-dc"], type: "item",
      label: String(rule.label).replace(/Spell Focus/g, "Gate Attenuator") }));
}
