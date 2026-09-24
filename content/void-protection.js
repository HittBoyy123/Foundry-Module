import { MODULE_ID } from "../scripts/constants.js";
export const VOID_PROTECTION_SOURCE = {
  name: "Void Protection", type: "effect", img: "icons/magic/unholy/orb-glowing-purple.webp",
  flags: { [MODULE_ID]: { voidProtection: true } },
  system: { slug: "wrathmaker-void-protection", tokenIcon: { show: true }, duration: { value: -1, unit: "unlimited", expiry: null },
    level: { value: 0 }, start: { value: 0, initiative: null }, traits: { value: [], rarity: "unique" }, rules: [],
    description: { value: "<p>You take half damage from weapons and spells, rounded down using the system's normal damage rounding. Omnipotassium weapons and spells channelled through an active Omnipotassium focus bypass this protection. Your attacks deal half damage to creatures wearing Omnipotassium armour.</p><p>Apply this adjustment before ordinary resistances and hardness. Other immunities, resistances, saving throws, and Shield Block still apply. Remove this effect to end the protection.</p>" } },
};
