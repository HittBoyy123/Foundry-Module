import { MODULE_ID } from "./constants.js";
import { materialBenefits } from "./material-benefits.js";
import { normalizeMasterstrokes } from "./crafting-edges.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

const materialFlavour = (material, title) => {
  if (title.startsWith("Cold Iron ·")) return "A sombre, grey metal with a restrained sheen. Careful finishing leaves its surface smooth beneath the hand, with the maker’s work visible in every clean line.";
  return ({
    metal: "Carefully shaped and finished, the metal bears the small, deliberate details of a practiced hand.",
    wood: "The maker has worked with the grain, bringing out the natural character of the wood in every curve.",
    leather: "Supple layers and neatly finished seams reveal the care taken in fitting and shaping this hide.",
    "dragon-scale": "Overlapping scales catch the light, preserving a trace of their draconic splendour within the finished work.",
    "mana-crystals": "Light gathers within the crystal, its facets carefully set to form the heart of the finished piece.",
    omnipotisium: "An unfamiliar lustre moves across this rare material, lending even its simplest surfaces an otherworldly beauty.",
  })[material] ?? "Each surface has been carefully worked to bring out the character of the material.";
};
const strokeFlavour = {
  "Perfect Balance": "A final adjustment brought every part into harmony; the weapon seems to settle naturally into the hand.",
  "Unerring Strike": "During the final fitting, the maker found a line of alignment so precise that every motion feels certain.",
  "Unyielding Edge": "The last finishing pass left a flawless working surface, untouched by the smallest imperfection.",
  "Relentless Assault": "The maker found a rhythm in the finishing strokes, leaving the weapon eager to follow one motion with another.",
  "Guardian’s Weapon": "A protective instinct guided the final touches, giving the weapon a reassuring presence in its wielder’s hand.",
  "Overwhelming Impact": "The final assembly concentrated the weapon’s weight with remarkable precision, lending it a commanding heft.",
  "Artisan’s Triumph": "In a moment of perfect focus, the maker’s final stroke brought the whole piece together beyond even their own expectations.",
  "Limitless Channel": "A subtle pattern emerged during the finishing work, leaving room for one more thread of enchantment.",
  "Indomitable Construction": "Every joint and layer settled into place with exceptional precision, making the finished piece feel remarkably solid.",
  "Protective Finish": "The final polish revealed an unbroken finish, smooth and even across every vulnerable surface.",
  "Defy Death": "An inspired adjustment during the final fitting gave the armour a remarkable ability to turn a telling blow aside.",
  "Unbreakable Guard": "The maker’s last reinforcement joined the shield’s parts into a single, steadfast whole.",
  "Perfect Focus": "As the final setting was secured, the focus answered with a moment of clear, steady resonance.",
  "Adamant Will": "Patient finishing lent this piece a quiet solidity, a reassuring reminder of the hands that made it.",
  "Weightless Wonder": "Through an inspired arrangement of its parts, the maker achieved a piece that feels astonishingly light.",
};

/** Derived presentation only: never save generated text into the item's description. */
export function craftingDescription(item, config) {
  if (item.isIdentified === false) return "";
  const flags = item.flags?.[MODULE_ID];
  if (!flags?.material) return "";
  const benefits = materialBenefits(item, flags.material, flags.tier, config, flags.dragonScale);
  if (!benefits) return "";
  const strokes = normalizeMasterstrokes(flags.crafting?.masterstrokes);
  const maker = flags.crafting?.core?.contributor?.name || strokes.find(entry => entry.maker)?.maker;
  const runes = item.system?.runes?.property ?? [];
  const catalogue = globalThis.CONFIG?.PF2E?.runes?.[item.type]?.property ?? {};
  const runeNames = runes.map(slug => {
    const name = catalogue[slug]?.name;
    return name ? (globalThis.game?.i18n?.localize(name) ?? name) : String(slug).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/-/g, " ").replace(/\b\w/g, char => char.toUpperCase());
  });
  return `<section class="cmt-crafting-description"><h3>${escape(maker ? `Crafted by ${maker}` : "Craftsmanship")}</h3>`
    + (runeNames.length ? `<p><strong>Property Runes</strong> ${runeNames.map(escape).join(" · ")}</p>` : "")
    + `<div class="cmt-crafted-material"><h4>${escape(benefits.title)}</h4><p><em>${escape(materialFlavour(flags.material, benefits.title))}</em></p>${benefits.lines.filter(line => !(line.includes("property-rune") && line.includes("slot")) && line !== "Extra weapon damage dice come from Striking runes.").map(line => `<p>${escape(line)}</p>`).join("")}</div>`
    + strokes.map(entry => `<div class="cmt-crafted-masterstroke"><h4>Masterstroke · ${escape(entry.name)}${entry.used ? " · Used" : ""}</h4><p><em>${escape(strokeFlavour[entry.name] ?? "An inspired finishing touch set this piece apart, leaving a lasting signature of the maker’s skill.")}</em></p><p>${escape(entry.description)}</p></div>`).join("")
    + "</section>";
}

export function installCraftingDescription(getConfig, classes = CONFIG.PF2E.Item.documentClasses) {
  const marker = Symbol.for(`${MODULE_ID}.craftingDescription`);
  for (const type of ["weapon", "armor", "shield", "equipment"]) {
    const prototype = classes[type]?.prototype;
    const original = prototype?.getDescription;
    if (!original || original[marker]) continue;
    const wrapper = async function(...args) {
      const result = await original.apply(this, args);
      if (result.value?.includes('class="cmt-crafting-description"')) return result;
      const extra = craftingDescription(this, getConfig());
      return extra ? { ...result, value: `${result.value ?? ""}${extra}` } : result;
    };
    wrapper[marker] = true;
    prototype.getDescription = wrapper;
  }
}
