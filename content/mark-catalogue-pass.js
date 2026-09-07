/** Individually authored high-power review. Stable IDs retain existing maker provenance.
 * T = Core Tier. Structures/project changes are descriptive, never applied to actors.
 * No automatic text-to-rule inference: adapters are explicitly declared separately.
 */
const revisions = {};
const A = ["armor"], W = ["weapon"], F = ["spellFocus"], G = ["weapon", "armor", "shield", "spellFocus"], D = ["armor", "shield"];
const m = (effectSummary, validItemGroups = G, activation = null, categories = ["item"]) => ({ effectSummary, validItemGroups, activation, categories, stackGroup: "", rationale: "Full-catalogue high-power review: explicit scope, scaling and limits." });
const act = value => ({ type: "action", value });
const free = { type: "free", value: null }, reaction = { type: "reaction", value: null };
const project = text => m(text, [], null, ["project"]);
const structure = text => m(text, [], null, ["structure"]);
const consumable = (text, activation = null) => m(text, ["consumable"], activation, ["consumable"]);
function add(profession, section, entries) {
  for (const [slug, value] of Object.entries(entries)) revisions[`${profession}-${section}-${slug}`] = value;
}

add("blacksmithing", "universal", {
  "perfect-balance": m("Weapon grants an untyped bonus equal to Core Tier + 2 to one chosen Athletics manoeuvre made using it. Enable the Mark condition only while using this weapon for that manoeuvre. No Bulk reduction.", W),
  "reinforced-edge": m("Weapon deals +3 damage per weapon damage die against objects. At Core Tier 5+, this becomes +5 per die. Enable the object-target toggle; this does not ignore Hardness.", W),
  "master-reforge": project("Rebuilding recovers 90% of recorded ordinary components, rounded down, and preserves compatible Marks. Recovered value cannot exceed actual inputs; no duplicated items or components. Unique resources require GM approval."),
});
add("blacksmithing", "specialty-1", {
  "ember-temper": m("Weapon sheds controllable light and deals additional fire damage equal to 4 × Core Tier on a critical hit only.", W),
  "blood-temper": m("While the wielder is at or below half maximum HP, this weapon deals +4 × Core Tier damage. This is the wielder's HP, not the target's.", W),
  "hellfire-channel": m("Once per encounter, ignite the weapon for 1 minute. Its Strikes deal additional Core Tier d8 fire damage. Fire resistance is reduced by 3 × Core Tier against this added damage only, minimum 0; immunity is unaffected.", W, act(1)),
  "tormentors-edge": m("Once per round after this weapon critically hits, the target attempts a Will save against your higher class or spell DC. Failure: frightened 2; critical failure: frightened 3 and fleeing until the end of its next turn. Success: no effect. This is a mental, fear effect.", W, free),
  "soul-burned-steel": m("Reaction, once per day when damage would reduce you to 0 HP without killing you outright: remain at 1 HP, Step up to 15 feet and make one Strike with this weapon. Afterwards gain drained 1 until daily preparations. It does not prevent death effects.", W, reaction),
});
add("blacksmithing", "specialty-2", {
  "consecrated-finish": m("While worn or wielded, gain +Core Tier + 2 untyped to Religion checks to Recall Knowledge about undead or fiends. Enable the Mark condition for an eligible subject. The item bears a visible sacred dedication; it does not automatically bypass sanctification requirements."),
  "dawnbound": m("Weapon deals +3 spirit damage per weapon damage die against undead and fiends. Other targets gain no added damage.", W),
  "guardians-radiance": m("Reaction, once per round when an ally within 15 feet takes damage: reduce that instance by 6 × Core Tier, minimum 0. Requires the item worn or wielded; does not redirect damage to you.", G, reaction),
  "martyrs-forge": m("Reaction, once per encounter when an ally within 30 feet takes damage: take unpreventable damage equal to your level and reduce the ally's instance by 8 × your level, minimum 0. You cannot use this if the sacrifice would reduce you to 0 HP.", G, reaction),
  "solar-ascension": m("Two actions, once per day: for 1 minute radiate bright light in a 30-foot aura. Allies including you gain +Core Tier untyped to AC and saves while inside. Undead and fiends starting their turns inside take 3 × Core Tier d6 spirit damage, basic Will save against your higher class or spell DC.", G, act(2)),
});
add("blacksmithing", "specialty-3", {
  "diagnostic-matrix": m("While wielded or worn, gain +Core Tier + 2 untyped to Crafting checks to Repair or Identify Magic involving this item's mechanism. Enable the Mark condition only when this item is the subject; its display also reports damage."),
  "integrated-conduit": project("The item can accommodate two additional Mana or Aetherglass component sockets without added Bulk. Supply their materials normally. Sockets do not grant free Marks, Capacity, or Core progression."),
  "adaptive-configuration": m("Choose three legal weapon damage types or tool configurations at creation. One Interact action switches the active mode. Only one mode applies at a time; it cannot grant extra Marks or combine incompatible weapon statistics.", G, act(1)),
  "arcane-mechanism": m("Two actions, once per encounter: emit a 30-foot line dealing 2 × Core Tier d8 electricity damage with a basic Reflex save against your higher class or spell DC. Mechanism must be wielded. This is an electricity and magical effect.", G, act(2)),
  "phase-mechanism": m("One action, once per encounter: Stride up to your Speed through creatures and up to 10 feet of non-magical solid obstacles. End in an open space you can perceive; if none is reachable, the action fails without moving. This is magical movement, not teleportation.", G, act(1)),
  "reality-engine": m("One action, once per day: for 1 minute, once on each of your turns reduce one two-action activation of this item's other Marks to one action. Cannot reduce spellcasting, reactions, free actions, or this activation; does not refresh uses or bypass prerequisites.", G, act(1)),
});

add("alchemy", "universal", {
  "stable-formula": consumable("A dose lasts four times its normal shelf life and resists mundane temperature spoilage while sealed. This does not extend its effect duration or preserve an opened dose indefinitely."),
  "efficient-batch": project("A batch produces 25% additional identical doses, rounded down, minimum one extra per four paid doses. Bonus doses are outputs, not additional inputs for applying this Mark again."),
  "refined-reagent": consumable("Choose one fixed healing, movement-distance or resistance value at creation; multiply that value by 2 when the dose is used. Do not multiply DCs, damage, action counts, condition values, or resource returns."),
  "quick-preparation": project("Reduce this batch's required artisan-days by 40%, rounded up to whole days with a minimum of one. Apply to the original duration, not repeatedly to previously reduced work."),
  "catalyst-reserve": project("Reduce one named secondary ordinary resource cost by 25%, rounded down, minimum one unit still required. It cannot reduce Core, unique ingredients or its own catalyst cost."),
});
add("alchemy", "specialty-1", {
  "measured-dose": consumable("Halve one fixed numerical drawback of this dose, rounding its magnitude down. Cannot remove addiction, death, ability loss, action costs or a drawback that defines the item's identity."),
  "concentrated": consumable("Multiply this dose's HP healing by 3. If it grants temporary HP instead, add only 10 temporary HP to a separately tracked Artisan buffer; never multiply the original temporary HP. The buffer expires with the dose and cannot be refreshed by re-equipping."),
  "extended-formula": consumable("An effect lasting at least 1 minute lasts four times as long, maximum 24 hours. Does not extend persistent damage, poison stages, resource regeneration or another Mark's effect."),
  "rapid-infusion": consumable("One action: draw this accessible dose and consume or administer it to a willing adjacent creature. No extra Interact action is required. A dose is still consumed; this does not make an unwilling target willing.", act(1)),
  "restorative-panacea": consumable("On consumption, restore 8 × Core Tier additional HP and reduce two of clumsy, enfeebled, frightened, sickened or stupefied by 2, minimum 0. Attempt one counteract check against poison or disease using the drinker's higher class/spell DC minus 10 and counteract rank equal to Core Tier. Ongoing sources can reapply conditions.", act(1)),
  "phoenix-draught": consumable("One action to drink. Once per day per creature, for 1 hour: the first damage that would reduce you to 0 HP without outright death instead leaves you at 1 HP and restores 10 × Core Tier HP. The draught then ends. It cannot prevent death effects or be chained with another Phoenix Draught.", act(1)),
});
add("alchemy", "specialty-2", {
  "masked-toxin": consumable("The DC to detect this poison before exposure increases by Core Tier + 2. Its saving throw DC is unchanged; an identified poison remains identified."),
  "adhesive-poison": consumable("An applied injury poison survives misses and affects the next two successful weapon hits before the end of the encounter. Each hit follows normal exposure rules; hitting one creature twice does not create two independent copies of the same affliction."),
  "swift-venom": consumable("The poison's onset is immediate. On an initial failed save apply stage 1 immediately; on a critical failure apply stage 2 if available. Subsequent intervals are unchanged. A poison already having immediate onset gains +Core Tier to its initial save DC only."),
  "predator-formula": consumable("Choose one creature trait such as dragon, fiend or undead at creation. The poison gains +Core Tier + 2 to its save DC against that trait. This does not bypass poison immunity."),
  "mutagenic-venom": consumable("Choose clumsy, enfeebled or stupefied at creation. When the poison reaches stage 3, apply the chosen condition at 3 for 1 round. The rider triggers at most once per round per creature and does not permanently change its stage."),
  "perfect-killer": consumable("Poison save DC increases by 5. Once per target per dose, treat the first ordinary success as a failure; critical successes are unchanged. Poison immunity still applies, and the dose cannot retrigger this benefit via transfer."),
});
add("alchemy", "specialty-3", {
  "purified-matrix": project("Remove up to three mundane impurities from a component without losing material quantity. Cannot remove curses, change rarity or erase an intrinsic hazardous magical property."),
  "alchemical-alloy": project("Combine two paid same-tier material families into one component with both native tags. Choose one family for numerical Core progression; never add both Core progressions together."),
  "composite-matrix": project("One composite component can satisfy two compatible family requirements. Pay both quantities and use the lower tier for eligibility; the benefit is sharing one socket, not free materials."),
  "refined-substance": project("For one named Mark's Anchor eligibility only, treat this component as two tiers higher, maximum 6. Its actual tier, Core progression, sale value and other Marks are unchanged."),
  "philosophers-matrix": project("Once per project replace up to two missing ordinary resource families with equal quantities of paid same-tier resources. Cannot substitute unique, dragon-origin or story-gated ingredients."),
  "living-transmutation": project("Create three paid, compatible material identities for this component. Choose one during daily preparations. Native tags and eligibility change, but existing Marks must remain legal and only one identity supplies Core statistics."),
});

add("enchanting", "universal", {
  "stable-matrix": m("The item gains +Core Tier + 2 to its DC against counteract attempts targeting its magic. This protects the item only, not the bearer's spells, and does not make it immune to suppression."),
  "attuned-craft": m("During daily preparations authorise up to six named bearers to use this item's custom activations. An unauthorised user cannot activate them; it remains usable as an ordinary item. No effect on native spellcasting or ownership."),
  "resonant-channel": m("Add two charges to one explicitly identified custom daily charge pool on this item. These charges return only at daily preparations; they cannot fuel charge-regeneration or Mark-refresh effects."),
  "efficient-activation": m("Free action, once per encounter immediately before using this item's two-action custom activation: reduce it to one action. Cannot affect spellcasting, change use limits or combine with another action reduction on the same activation.", G, free),
  "arcane-safeguard": m("Reduce self-damage from this item's own overload or critical activation failure by 75%, rounding damage down. Other creatures and normal enemy attacks are unaffected. Non-damage drawbacks remain."),
});
add("enchanting", "specialty-1", {
  "minor-empowerment": m("Gain an untyped bonus equal to Core Tier + 2 to one chosen narrow skill use. Enable the Mark condition only for the agreed use, not all checks with that skill."),
  "focused-empowerment": m("Gain an untyped bonus equal to Core Tier to one selected skill or initiative while this item is wielded or worn."),
  "twin-empowerment": m("Choose two different skills at creation. While wielded or worn gain +Core Tier untyped to checks with both. Record the choices on the item; neither can be an attack, AC or spell DC."),
  "overcharged-matrix": m("Free action, once per encounter before one roll: add 5 to one existing positive flat Artisan bonus on this item for that roll only. Cannot improve Over-Potency, a multiplier, DC, condition, resource quantity or another Overcharged Matrix. This cannot raise the +2 per-Mark Over-Potency cap.", G, free),
  "overlord-matrix": m("While wielded or held, weapon gains +2 untyped to its attack rolls, or spell focus gains +2 untyped to spell attack and spell DC. This Over-Potency is capped at +2 per Mark beyond Core progression and stacks with different Marks.", ["weapon", "spellFocus"]),
  "aetherheart-lattice": m("One action, three charges per day: refresh one expended once-per-encounter Standard or Major activation on this item. Each target activation can be refreshed once per day. Cannot refresh charges, healing, recovery, action-reduction or other refresh effects.", G, act(1)),
});
add("enchanting", "specialty-2", {
  "minor-binding": m("At creation add two descriptive utility tags from the component's source, such as luminous or water-resistant. They unlock compatible crafting requirements but grant no numerical Core progression or creature immunities."),
  "bound-trait": m("Weapon gains two chosen compatible traits from trip, shove, disarm or versatile B/P/S. Record the exact traits at creation. This does not add reach, deadly or fatal.", W),
  "elemental-essence": m("Weapon deals additional Core Tier d8 damage of a selected acid, cold, electricity or fire type. Worn armor or held shield instead grants resistance equal to 5 × Core Tier to that type. Resistance uses the highest source.", ["weapon", "armor", "shield"]),
  "predatory-essence": m("Choose at creation either precise darkvision 60 feet, imprecise scent 30 feet, climb Speed 30 feet or swim Speed 30 feet from the harvested essence. Active while worn or wielded; the choice is fixed until recrafted."),
  "greater-binding": m("Weapon gains +5 feet reach and +2 additional base weapon damage dice. These extra dice use the weapon's die size and damage type; reach does not improve ranged attacks. Over-Striking stacks with different Marks.", W),
  "living-essence": m("Two actions, once per day for 1 minute: gain fly Speed equal to land Speed and resistance equal to 4 × Core Tier to the essence's one chosen energy type. Choose one type at creation from acid, cold, electricity or fire; no immunity is granted.", G, act(2)),
});
add("enchanting", "specialty-3", {
  "runic-signature": m("While worn or held, gain +Core Tier + 2 untyped to Arcana checks involving this artisan's sigils. Enable the Mark condition only for those sigils."),
  "resonant-pair": m("Link two paid items at creation. While both are worn or wielded within 30 feet, each bearer gains +Core Tier untyped to saves against the last creature damaged by the other bearer this round. Track the eligible creature manually."),
  "layered-inscription": m("Choose one Standard Mark on this item and record three legal configurations of its existing choices. Switch one configuration during daily preparations; this does not grant all three benefits or bypass prerequisites."),
  "runic-feedback": m("Reaction, once per round when a linked weapon within 30 feet critically hits: its paired bearer gains +5 untyped to their next attack or save before the end of their next turn. A bearer cannot trigger this from their own attack.", G, reaction),
  "living-rune": m("One action, once per round: switch one Major-or-lower Mark between two recorded, equally costed configurations. Used charges and frequency limits remain spent across configurations; switching cannot refresh effects.", G, act(1)),
  "grand-glyph": m("Three actions, once per day: place a visible 20-foot-radius glyph within 60 feet for 1 minute. Allies in it gain +Core Tier untyped to AC. Enemies starting turns inside take Core Tier d8 force damage, basic Reflex save against your higher class or spell DC. The glyph is stationary.", G, act(3)),
});

add("leatherwork", "universal", {
  "flexible-construction": m("Reduce this armor's land Speed penalty by 10 feet, minimum 0. It does not grant bonus Speed if the penalty is already absent.", A),
  "weather-seal": m("Worn armor grants +Core Tier + 2 untyped to Fortitude saves against environmental heat, cold or exposure. Enable the Mark condition only for exposure, not energy attacks.", A),
  "adaptive-strapping": m("Once per round, draw or stow one strapped light item as part of an Interact action using that item. Also secure up to three such items against accidental loss; deliberate Disarm and theft are unaffected."),
});
add("leatherwork", "specialty-1", {
  "wyrm-inscription": m("The dragon's identity is visible on the item. While wielded or worn, gain +Core Tier + 2 untyped to Arcana checks about that dragon type. Enable the Mark condition only for that subject."),
  "draconic-resistance": m("Requires Dragon Scale Core or Reinforcement. Add 3 × Dragon Tier to this item's native dragon resistance. This increases one resistance source, not all of the wearer's resistances.", D),
  "scale-dominion": m("Requires Dragon Scale Core or Reinforcement. Armor or shield gains +5 × Dragon Tier Hardness and +30 × Dragon Tier item HP. A weapon instead ignores 3 × Dragon Tier resistance against its associated dragon damage type; immunity remains.", ["weapon", "armor", "shield"]),
  "draconic-constitution": m("Requires Dragon Scale Core or Reinforcement. Worn armor grants +16 × Dragon Tier maximum HP and +5 untyped to saves against its associated damage type; green scales apply to poison. Maximum HP is not healing.", A),
  "wyrms-fury": m("Requires Dragon Scale Core or Reinforcement. Weapon gains +3 additional base weapon damage dice, using its existing die size and damage type. This Over-Striking stacks with different Marks.", W),
  "dragonheart-awakening": m("Two actions, once per day for 1 minute: gain fly Speed equal to twice land Speed and increase this item's native dragon resistance by 5 × Dragon Tier. Once during the duration, use two actions for a 30-foot cone dealing 3 × Dragon Tier d8 of the scale's damage type, basic Reflex against your higher class or spell DC.", G, act(2)),
});
add("leatherwork", "specialty-2", {
  "trophy-memory": m("While worn or wielded, gain +Core Tier + 2 untyped to Nature checks to Recall Knowledge about the source creature family. Enable the Mark condition only for that family."),
  "predators-sense": m("While worn, gain imprecise scent 30 feet and +Core Tier untyped to Survival checks to Track the source creature family. Scent detects presence, not precise location; record the source family on the item.", A),
  "natural-movement": m("Choose a source-appropriate climb or swim Speed at creation. Worn armor grants that Speed at 40 feet and +10 feet to land Speed in one recorded natural terrain. Terrain does not change during combat.", A),
  "apex-hide": m("Worn armor grants +10 × Core Tier maximum HP and +Core Tier untyped to Fortitude saves against one recorded creature theme: poison, cold or disease. This replaces the former start-of-combat temporary HP grant.", A),
  "apex-trait": m("Worn armor grants imprecise tremorsense 30 feet while you share a solid surface with the target, and doubles your ordinary Leap distance. Tremorsense does not detect airborne creatures or bypass concealment.", A),
  "chimera-binding": m("Free action once per round: select one of two recorded creature-source senses or movement modes for this item. Once per day, both can be active for 10 minutes. Pay for both source components; no access to unrecorded creature abilities.", G, free),
});
add("leatherwork", "specialty-3", {
  "trophy-finish": m("Worn armor grants +Core Tier + 2 untyped to Intimidation checks when the visible trophy is relevant to the audience. Enable the Mark condition only then; it is not mental control.", A),
  "predators-cloak": m("Worn armor grants +Core Tier untyped to Stealth and Survival in one recorded terrain. Free action once per round after successfully Hiding there: Step up to 10 feet. The terrain must match the trophy's source.", A, free),
  "court-mantle": m("Worn armor grants +Core Tier untyped to Diplomacy and Society in formal settings. Allies within 15 feet who can see you gain +3 untyped to saves against fear while you are conscious; adjudicate the aura manually.", A),
  "legendary-pelt": m("One action, once per day for 1 minute: become invisible. After each hostile action the invisibility is suppressed until the start of your next turn. While invisible this way, gain +Core Tier untyped to Stealth; invisibility is not undetectability.", A, act(1)),
});
add("carpentry", "universal", {
  "seasoned-construction": m("Wooden armor or shield resists mundane warping and gains +100% of pre-Mark maximum item HP. This additive durability bonus does not multiply other Mark bonuses.", D),
  "light-frame": m("Reduce Bulk by 2, minimum 0, when the wooden frame forms most of this item. Contents and attached equipment retain their own Bulk."),
  "precision-joinery": m("While held or worn, gain +Core Tier + 2 untyped to Crafting checks to Repair this item or operate its mechanism. Enable the Mark condition only for that mechanism."),
  "modular-frame": project("During daily preparations replace up to three ordinary wooden components with paid compatible alternatives. Retain legal Marks and maker records; no free resources, Capacity or extra active Core progression."),
});
add("carpentry", "specialty-1", {
  "true-fletching": m("Ranged weapon gains +Core Tier untyped to attacks affected by ordinary wind. Enable the Mark condition only during such wind. Magical wind and range penalties remain.", W),
  "specialist-ammo-chamber": m("Ranged weapon accepts two recorded compatible specialist ammunition families. Ammunition is paid and consumed normally; this does not enable ammunition of the wrong weapon category.", W),
  "longshot-construction": m("Double this ranged weapon's range increment. Normal increment penalties and line of effect still apply; this does not increase melee reach.", W),
  "rapid-mechanism": m("Free action once per round: reload this ranged weapon by up to two Interact actions. Supply ammunition and a free hand normally. A reload-0 weapon instead gains +5 untyped to its next Strike this turn; these options are exclusive.", W, free),
  "warbow-overdraw": m("Ranged weapon gains +3 additional base weapon damage dice using its own die size and type. After a natural 1 on a Strike, you are off-guard until the start of your next turn. Over-Striking stacks with different Marks.", W),
});
add("carpentry", "specialty-2", {
  "builders-mark": structure("Inspecting this wooden construction grants +Core Tier + 2 to Crafting checks to identify weaknesses or plan repairs. The mark records load paths; no actor effect is created."),
  "reinforced-frame": structure("Wooden structure or vehicle gains ×3 pre-Mark maximum HP and +4 × Core Tier Hardness. Other durability bonuses add from the same base rather than compounding."),
  "rapid-assembly": structure("Qualifying construction or field fortification takes half its original artisan-days, minimum one. Apply once to original work, not recursively after other reductions."),
  "modular-construction": structure("Recover 90% of recorded ordinary inputs when dismantling, rounded down; unique inputs require GM adjudication. Re-deploy the stored modules in one-quarter normal assembly time, minimum 10 minutes."),
  "grand-design": structure("Choose recurring Lumber or repair cost: reduce it by 40%, minimum one unit. Gain +5 on the structure's principal construction check. These are campaign project benefits, not character Crafting bonuses."),
  "citadel-framework": structure("Defenders gain +5 to checks and saves against forced entry, collapse and siege movement while within the fortification. Gates and walls gain structural damage resistance equal to 8 × Core Tier."),
});
add("carpentry", "specialty-3", {
  "carved-grip": m("Gain +Core Tier + 2 to your DC against Disarm attempts targeting this weapon. It does not protect other held items or prevent voluntary dropping.", W),
  "wolf-carving": m("Free action once per round after this weapon hits: Stride up to half Speed toward that target. Movement must end closer and triggers reactions normally.", W, free),
  "bear-carving": m("While the shield is raised, gain physical resistance equal to 3 × Core Tier; against damage caused by forced movement, use 6 × Core Tier instead. Use only the applicable value, not both.", ["shield"]),
  "serpent-carving": m("Weapon gains +5 feet melee reach. Free action once per round after hitting: Step up to 15 feet; this movement does not trigger that target's reactions. Other creatures react normally if applicable.", W, free),
  "spirit-carving": m("One action, once per encounter for 1 minute: gain +5 untyped to this weapon's attacks and imprecise scent 30 feet. This is a magical spirit manifestation; it grants no extra actions.", W, act(1)),
  "totemic-ascendance": m("Two actions, once per day for 1 minute: gain +Core Tier untyped to Athletics, +20 feet land Speed and resistance equal to 4 × Core Tier to physical damage. A visible animal spirit surrounds the wearer.", A, act(2)),
});

add("stonemason", "universal", {
  "perfect-foundation": structure("Gain +Core Tier + 2 on checks to stabilise or repair a structure built on this foundation. Its reference lines reveal subsidence before ordinary collapse."),
  "anchored-construction": structure("Structure gains +Core Tier + 2 to its DC against forced movement or toppling and counts as two sizes larger for those contests. It can still be damaged or destroyed."),
  "load-bearing-cut": structure("Stone structure gains +100% of pre-Mark maximum HP. This adds to other durability bonuses using the same base; it does not grant character HP."),
  "resonant-stone": project("The component can provide both ward and arcane-anchor tags for compatible work. Tags grant eligibility only, not extra Capacity, Core progression or free Marks."),
});
add("stonemason", "specialty-1", {
  "masons-seal": structure("Gain +Core Tier + 2 on Crafting checks to identify damage, load paths or reconstruction methods in the sealed stonework. Inspection reveals non-magical hidden cavities within 5 feet of the examined surface."),
  "enduring-monument": structure("Monument has ×4 pre-Mark maximum HP and +5 × Core Tier Hardness. Durability bonuses add from the pre-Mark base rather than multiplying one another."),
  "grand-foundation": structure("Structures on this foundation gain +5 against collapse, subsidence and siege movement. Repairs restore twice normal item HP without consuming additional ordinary repair materials."),
  "civic-wonder": structure("Choose Culture, Defence, Trade, Faith or Infrastructure at creation. Once per Kingdom turn gain +5 on one project check directly serving that purpose. The wonder also acts as a recognised landmark; no automatic income is created."),
  "imperial-work": structure("Reduce one named recurring Kingdom resource cost tied to this structure by 40%, minimum one unit. Once per Kingdom turn reroll one failed maintenance check for it and use the new result."),
  "world-rooted-foundation": structure("The structure cannot be moved or toppled by non-magical effects. It gains structural damage resistance equal to 12 × Core Tier; magical displacement requires a counteract check against the completed project's recorded DC."),
});
add("stonemason", "specialty-2", {
  "inscribed-keystone": structure("Gain +Core Tier + 2 on checks to identify or repair this ward. Authorised users can read its owner, purpose and whether it has been breached."),
  "sentinel-rune": structure("Detect a recorded creature trait crossing the site's boundary within 300 feet of the rune. Alert up to six designated creatures anywhere inside the site; this is an alarm, not precise tracking or a hostile effect."),
  "sanctuary-ward": structure("A stationary 30-foot zone grants authorised allies +5 to saves while inside. Once per creature per day on entering, restore 10 × Core Tier HP. Leaving and re-entering does not refresh healing."),
  "war-rune": structure("In a stationary 30-foot zone, authorised defenders gain +5 to attack rolls and +3 × Core Tier damage on their first successful Strike each round. The rune does not move with a bearer."),
  "fortress-sigil": structure("Hostile teleportation or planar entry into the recorded site requires a counteract check against the project's recorded DC +5. Failure prevents entry and spends the attempt normally; authorised travel is unaffected."),
  "dominion-ward": structure("One recorded hostile creature trait suffers -5 to attacks and saves within a 60-foot ward. Those creatures cannot use ordinary concealment against authorised defenders; invisibility and total cover remain unless separately overcome."),
});
add("stonemason", "specialty-3", {
  "titanic-fit": m("Ignore up to 3 Bulk belonging to this stone item while properly worn or wielded, minimum 0. Contents and other equipment are unaffected."),
  "anchored": m("While worn or raised, gain +5 to the DC against Trip or Reposition and count as two sizes larger for resisting forced movement. This does not increase your actual size or offensive manoeuvre limits.", D),
  "earthshaker": m("Free action once per round after a critical weapon hit or successful Shield Block: choose an adjacent enemy. Fortitude against your higher class/spell DC: failure pushes it 10 feet and makes it off-guard until the end of its next turn; critical failure also knocks it prone. No effect on success.", ["weapon", "shield"], free),
  "living-colossus": m("Two actions, once per day for 1 minute: grow one size category, gain +10 feet melee reach, +5 untyped Athletics and physical resistance equal to 5 × Core Tier. End in sufficient space; equipment enlarges but its sale value and permanent Bulk do not change.", A, act(2)),
});

add("glassmaking", "universal", {
  "perfect-clarity": m("A held optic grants +Core Tier + 2 untyped to Perception checks involving visual detail. Enable the Mark condition only when viewing through the optic; it does not bypass concealment.", F),
  "arcane-lens": project("The optical component grants arcane, optic and conductor tags and can provide two compatible lens sockets. Supply their materials and Marks normally; no Capacity increase."),
  "precision-focus": m("Ranged weapon gains +Core Tier untyped to attacks against a target you successfully Sought this turn using the mounted optic. Enable the Mark condition only for that target and turn.", W),
  "shatter-safe": m("Twice per day when damage would destroy this glass-bearing item, it instead remains at 1 item HP. This protects the item only; worn-item protection does not prevent bearer damage. Record spent uses manually."),
});
add("glassmaking", "specialty-1", {
  "focusing-lens": m("Increase the ranged weapon's range increment by 50%. The mounted optical sight does not affect melee reach or remove range penalties.", W),
  "spectrum-prism": m("Choose two energy types from acid, cold, electricity or fire at creation. Free action once per round before this weapon's Strike: convert all its added energy damage from the first type to the second, or back. Base physical damage is unchanged.", W, free),
  "beam-splitter": m("Reaction, once per encounter after a ranged weapon Strike hits: make a second Strike against a different target within 30 feet of the first, using the same multiple attack penalty as the triggering Strike. This additional Strike counts toward later attacks; pay ammunition normally.", W, reaction),
  "trueglass-crown": m("Worn armor reveals invisible creatures to you within 60 feet as concealed rather than invisible. Gain +5 untyped to saves against visual illusions. It does not see through walls or automatically disbelieve illusions.", A),
});
add("glassmaking", "specialty-2", {
  "perfect-reflection": m("A held focus grants +Core Tier + 2 untyped to Deception checks to Impersonate using the mirror to prepare your disguise. Enable the Mark condition only for that prepared disguise.", F),
  "truth-mirror": m("A held focus grants +Core Tier + 2 untyped to Perception checks to Sense Motive or detect a visual disguise through the mirror. Enable the Mark condition only for those checks; no automatic lie detection.", F),
  "reflective-ward": m("Reaction, once per encounter when a spell attack targets you: gain +5 untyped AC against that attack. If it critically misses, deal Core Tier d8 force damage to its caster within 60 feet, basic Reflex against your higher class/spell DC. This is retaliation, not a copied spell.", D, reaction),
  "doppelglass": m("One action, once per encounter: gain concealed until the start of your next turn. The first attack that misses because of this flat check lets you Step 10 feet as a free action; this movement does not end the concealment.", D, act(1)),
  "gate-mirror": m("Three actions, once per day: open a two-way portal between this mirror and its paid, attuned partner within 10 miles on the same plane for 1 minute. Up to six willing creatures may cross. Both exits require open space; dimensional wards can block passage.", F, act(3)),
  "mirror-lord": m("Two actions, once per day for 1 minute: once per round use your reaction when targeted by a spell attack to counteract it using your higher class/spell DC minus 10 and counteract rank equal to Core Tier. Success negates it; critical success also deals 2 × Core Tier d8 force damage to the caster, basic Reflex against that DC.", D, act(2)),
});
add("glassmaking", "specialty-3", {
  "stable-cell": m("Recorded magical charges cannot decay from ordinary time or environmental exposure. Once per day ignore one effect that would drain a single charge; this does not stop deliberate use or regenerate spent charges."),
  "mana-reservoir": m("Add three daily charges to one named custom activation on this item. Charges cannot fuel recovery, extra-charge or refresh effects and return only at daily preparations."),
  "arcane-conductor": m("Weapon gains +2 additional base weapon damage dice from a luminous glass channel. Use its existing die size and type; this Over-Striking stacks with different Marks.", W),
  "overflow-channel": m("Free action once per encounter before a damaging item activation: add Core Tier d8 damage of that activation's primary damage type. If it costs charges, pay one additional charge. Applies once to one damage roll, not persistent or repeated damage.", G, free),
  "crystal-matrix": project("Reduce the Capacity cost of one compatible paid Enchanting or Azlanti Artifice Mark by 2, minimum 1. Does not grant a free Mark or raise maximum Capacity. Multiple discounts apply to the original cost, never below 1."),
  "eternity-cell": m("Add five charges per day to one named custom activation. Once per encounter when you critically succeed at an attack or save, recover one charge spent on that activation. Cannot fuel charge generation, resource recovery, healing or refresh effects."),
});

add("pottery", "universal", {
  "thermal-craft": m("Contents remain at their stored mundane temperature for 24 hours while sealed. The vessel ignores ordinary heat/cold damage from storage; attacks, spells and bearer damage are unaffected."),
  "sealed-vessel": m("Contents cannot leak, evaporate or become mundanely contaminated until the vessel is destroyed, not merely Broken. Does not preserve a consumed dose or increase storage capacity."),
  "shock-fired": m("The ceramic item gains +Core Tier + 2 to its DC or checks against shattering and rupture effects. This is item protection, not a bonus to the bearer's saves."),
  "nested-chamber": m("Add three concealed internal chambers, each holding one light dose or object. Their contents count toward Bulk; searching the chambers uses the normal concealment rules with +Core Tier + 2 to the item's concealment DC."),
});
add("pottery", "specialty-1", {
  "fired-seal": m("While worn or held, gain +Core Tier + 2 untyped to Crafting checks to Repair or identify this ceramic item. Enable the Mark condition only when working on this item."),
  "ceramic-plate": m("Armor or shield gains +5 × Core Tier Hardness and +40 × Core Tier item HP without increased Bulk. This improves the item, not wearer maximum HP.", D),
  "living-clay": m("At the start of the wearer's turn during an encounter, repair this item for 5 × Core Tier HP if it is not destroyed. Outside encounters it repairs once per minute. It cannot restore missing components or the wearer's HP.", D),
  "terracotta-guardian": m("Three actions, once per day: animate a guardian for 1 minute using a creature stat block recorded at creation, maximum level equal to twice Core Tier. It has the minion trait and requires one action to command; no independent extra turns or summoning abilities. The GM approves the exact stat block.", F, act(3)),
  "adaptive-ceramic": m("Reaction once per round before taking bludgeoning, piercing or slashing damage: gain resistance equal to 6 × Core Tier against that type, including the triggering damage, until the start of your next turn. Other physical types are unaffected.", A, reaction),
  "living-ceramic-shell": m("Worn armor grants +20 × Core Tier maximum HP. At the start of each encounter turn repair the armor itself for 4 × Core Tier item HP. Replaces regenerating temporary HP; removing or re-equipping grants no healing.", A),
});
add("pottery", "specialty-2", {
  "sanctified-vessel": m("While holding the vessel, gain +Core Tier + 2 untyped to Religion checks to identify its contained essence. Enable the Mark condition for that essence only. Mundane spiritual leakage is prevented.", F),
  "essence-vessel": project("Store up to three separately sealed harvested essences without ordinary degradation. They remain distinct paid inputs; opening one chamber does not consume or expose the others."),
  "bound-spirit": m("Record a willing spirit and one Lore at creation. While holding the vessel gain +5 untyped to checks with that Lore; the spirit can speak to its bearer. It grants neither extra turns nor access to undisclosed creature abilities.", F),
  "sealed-curse": project("A successfully contained curse cannot spread while this vessel remains intact. Gain +5 on attempts to counteract the contained curse using the normal counteract procedure. The containment itself requires resolving the curse, not simply placing this Mark."),
  "release-matrix": m("Two actions, once per day: discharge one paid stored essence in a 30-foot cone for 3 × Core Tier d8 spirit damage, basic Will against your higher class/spell DC. Consume the essence; recharging requires another compatible harvested essence.", F, act(2)),
  "grand-reliquary": m("Hold three paid compatible essences. Two actions once per day: consume two to heal up to six willing creatures within 30 feet for 8 × Core Tier HP each and reduce their frightened by 2. Refilling does not reset the daily use.", F, act(2)),
});
add("pottery", "specialty-3", {
  "heatproof-glaze": m("The vessel ignores ordinary forge heat and gains +Core Tier + 2 to checks against magical thermal breakage. This does not protect the bearer from fire damage or create a resistance aura."),
  "thermal-crucible": project("When processing heat-sensitive ordinary materials, recover 30% of otherwise lost units, rounded down. Recovery cannot exceed recorded loss and cannot be recycled through the same process for new material."),
  "fragmenting-casing": consumable("A bomb gains 10 feet additional splash radius and +3 × Core Tier splash damage. Allies in the enlarged area are affected normally; do not multiply direct-hit damage."),
  "shaped-charge": consumable("On use choose concentrated detonation: remove all splash damage and add Core Tier d12 primary damage against the directly hit creature or object. A miss does not deal this additional damage."),
  "pressure-vessel": consumable("Multiply the explosive's base primary damage dice by 3. Do not multiply flat bonuses, splash, persistent damage or added Mark dice. A critical manufacturing failure destroys the paid ordinary casing inputs."),
  "furnace-heart": m("Two actions, once per day: a 20-foot emanation deals 3 × Core Tier d8 fire damage to other creatures, basic Reflex against your higher class/spell DC. The item also serves as a portable forge for downtime when set down safely.", G, act(2)),
});

add("weaving", "universal", {
  "lightweave": m("Reduce this primarily textile item's Bulk by 2, minimum 0. This does not reduce the Bulk of its contents or other carried equipment."),
  "perfect-thread": project("Gain +Core Tier + 2 on the next Tailoring or Leatherwork project check that consumes this textile. Once consumed, the thread cannot grant this benefit to a second project."),
  "weatherproof-weave": m("Worn armor ignores ordinary rain exposure and grants +Core Tier + 2 untyped to Fortitude saves against severe non-magical weather. Enable the Mark condition only for weather.", A),
  "tensioned-thread": m("A woven weapon gains +Core Tier + 2 untyped to Athletics checks to Grapple or Trip with it. Enable the Mark condition only when using that weapon, and it must already have the relevant trait.", W),
});
add("weaving", "specialty-1", {
  "resonant-thread": project("Textile supplies mana, conductor and aetherwoven tags for compatible work. Its visible pattern grants +Core Tier + 2 to identify its own magic; it does not add free Marks or spell slots."),
  "manaweave": m("Worn armor grants resistance equal to 4 × Core Tier to one chosen acid, cold, electricity or fire type. Use the highest applicable resistance source.", A),
  "spellthread": m("Two actions once per day: restore 6 × Core Tier HP to one willing touched creature and let it immediately Step up to 10 feet. This is a magical restoration activation, not a stored spell slot.", A, act(2)),
  "ethereal-weave": m("Ignore non-magical ground difficult terrain while wearing this armor. Free action once per encounter: Step up to 20 feet through occupied creature spaces, ending in an open space. Does not pass through walls.", A, free),
  "expanded-matrix": project("Reduce the Capacity cost of one compatible paid Enchanting or Tailoring Mark by 2, minimum 1. Total costs still cannot exceed Core Capacity. Discounts apply to the original cost, not recursively."),
  "aetherbound-form": m("Two actions once per day for 1 minute: gain fly Speed 40 feet, physical resistance equal to 5 × Core Tier, and squeeze through openings as though two sizes smaller. You are not incorporeal and cannot pass through solid walls.", A, act(2)),
});
add("weaving", "specialty-2", {
  "warcloth-finish": m("Textile armor gains +100% of pre-Mark maximum item HP. This does not increase wearer HP; other durability bonuses use the same original base.", A),
  "impact-mesh": m("Worn armor grants physical resistance equal to 3 × Core Tier. Resistance does not add to other physical-resistance sources.", A),
  "flexible-weave": m("Reduce this armor's land Speed penalty by 15 feet, minimum 0, and raise its Dexterity modifier cap by 3. This changes the armor cap, not your Dexterity score.", A),
  "shock-absorbing-warcloth": m("Worn armor grants +12 × Core Tier maximum HP. This replaces per-turn temporary HP; it does not heal when equipped or grant damage absorption beyond the maximum-HP increase.", A),
  "silken-steel": m("Worn armor grants +5 untyped AC beyond Core progression and physical resistance equal to 4 × Core Tier. AC stacks with different Marks; resistance uses the highest source.", A),
});
add("weaving", "specialty-3", {
  "heraldic-seal": m("Gain +Core Tier + 2 untyped to Society checks proving the authority or affiliation displayed by this worn armor. Enable the Mark condition only where that affiliation matters.", A),
  "unbroken-standard": m("While this focus is held and displayed, allies within 30 feet who can see it gain +Core Tier untyped to saves against fear. The bearer must be conscious; resolve recipients manually.", F),
  "marching-banner": m("Allies starting their turns within 30 feet of the displayed focus gain +15 feet untyped land Speed for that turn and ignore the first 15 feet of difficult terrain. Does not grant extra actions.", F),
  "kings-colours": m("Allies within 30 feet of the displayed focus gain +5 untyped to Aid checks and saves against mental effects while they can see its conscious bearer.", F),
  "conquerors-standard": m("Two actions once per encounter for 1 minute: when an ally within 30 feet reduces a hostile creature to 0 HP, that ally gains +5 untyped to attacks until the end of its next turn. Multiple defeats refresh duration, not bonus magnitude.", F, act(2)),
  "sovereign-standard": m("Two actions once per day for 1 minute: allies within 30 feet gain +5 untyped to saves and +3 × Core Tier damage on their first hit each round. On activation grant each ally a separately tracked 10-point Artisan temporary-HP buffer, expiring after 1 minute. Do not overwrite class temporary HP; record and deduct the buffer manually.", F, act(2)),
});

add("bookmaking", "universal", {
  "perfect-index": m("Find any recorded entry in this held focus immediately. Gain +Core Tier + 2 untyped to Society checks to Recall Knowledge directly documented in it; enable the Mark condition only for that subject.", F),
  "preserved-knowledge": m("The work is immune to mundane water, ageing and mildew. A legible copy of damaged pages can be restored during one hour of study if at least half the original survives; it does not recover erased magical secrets.", F),
  "master-copy": project("Copy a paid formula or mundane text in one-quarter normal downtime, minimum 10 minutes. Material and licence costs remain; copying does not duplicate magic, consumables or activation charges."),
  "encoded-script": m("Gain +Core Tier + 2 to the DC to Decipher Writing in this focus without its key. Authorised readers can read normally; possession of a stolen key bypasses the encoding.", F),
  "reference-tabs": m("Free action once per 10 minutes before Recall Knowledge using this held focus's recorded subject: gain +5 untyped to that check. No benefit on an undocumented subject.", F, free),
});
add("bookmaking", "specialty-1", {
  "indexed-arcana": m("Held focus grants +Core Tier + 2 untyped to Arcana checks about spells recorded in it. Enable the Mark condition only for those spells; the index locates their entries immediately.", F),
  "mnemonic-pages": m("Once per day after 10 minutes of study, replace up to three unexpended prepared spells with known spells of the same ranks. Does not restore spent slots or grant spells the reader cannot normally prepare.", F),
  "resonant-chapter": m("Choose one spell trait at creation. Spells with that trait gain +3 damage per spell rank on their first damage roll against each target. This is flat bonus damage, not multiplied ongoing damage; record the chosen trait.", F),
  "spell-echo": m("Reaction once per encounter after a spell deals damage to one target: deal additional damage equal to Core Tier d8 of its primary type to that target or a second creature within 15 feet. Basic Reflex against your spell DC. This is a separate magical echo and cannot echo itself.", F, reaction),
  "archmage-codex": m("One action once per day for 1 minute: the first damaging spell each turn gains Core Tier d8 additional damage on its first damage roll. Do not add to persistent or repeated damage. The codex must remain held.", F, act(1)),
  "endless-grimoire": m("Three actions once per day: recover one expended spell slot of rank no higher than Core Tier, maximum 6. It cannot recover a slot used to create permanent resources, restore slots or activate another recovery effect. Non-slot casters require a recorded equivalent before crafting.", F, act(3)),
});
add("bookmaking", "specialty-2", {
  "scholars-index": m("Held focus grants +Core Tier + 2 untyped to Society research checks on its documented subject. Enable the Mark condition only during that research.", F),
  "lore-codex": m("After 10 minutes study choose one recorded narrow Lore. Gain +5 untyped to checks with that Lore for 8 hours, even if untrained, but do not gain proficiency ranks or trained-only actions.", F),
  "crafting-manual": project("For one recorded recipe family reduce required artisan-days by 40%, minimum one, and gain +5 to its first project check each day. Reductions use original work; this does not create free materials."),
  "tactical-treatise": m("Free action once per encounter before an attack, save or Recall Knowledge against a documented creature trait: gain +5 untyped to that roll. The trait is chosen at creation and must match the target.", F, free),
  "masters-testament": m("During daily preparations choose one of three recorded skill feats whose level and other prerequisites you meet. Gain its use until next preparations. No ancestry, class, dedication or spellcasting feats; it cannot grant crafting outputs retroactively.", F),
  "legendary-chronicle": m("Up to six readers study for 10 minutes during daily preparations. Each gains +5 untyped to one recorded narrow Lore for the day and one fortune reroll of a failed check with that Lore, using the new result. Restudying does not reset uses.", F),
});
add("bookmaking", "specialty-3", {
  "surveyors-mark": m("Held map grants +Core Tier + 2 untyped to Survival checks to navigate its recorded territory. Enable the Mark condition only within mapped territory.", F),
  "safe-passage": project("In mapped territory reduce travel delays from documented non-magical hazards by 50%. Does not increase encounter Speed, remove hazards outright or reduce an undelayed journey."),
  "resource-survey": project("A successful survey reveals one hidden ordinary resource site and grants +5 on the first extraction check there each Kingdom turn. No resource is created without a site; unique discoveries remain GM-controlled."),
  "strategic-map": m("Held map grants +5 untyped to initiative in its recorded region when studied for 10 minutes earlier that day. Enable the Mark condition only within the studied region.", F),
  "hidden-paths": project("Establish a mapped secret route: travel along it takes half normal non-combat time and travellers gain +5 to avoid detection on the route. It cannot cross impassable terrain or ignore hostile fortifications."),
  "world-atlas": project("At each Kingdom turn choose one mapped region: double ordinary resource output, halve ordinary travel time, or gain +5 on settlement-planning checks there for that turn. Only one mode applies; never duplicate unique or story resources."),
});

add("tailoring", "universal", {
  "hidden-pocketing": m("Worn armor grants +Core Tier + 2 untyped to Thievery checks to Conceal an Object in its fitted pockets. Enable the Mark condition only for an object that fits; Bulk is unchanged.", A),
  "quick-access-cut": m("Once per round draw one accessible light object as part of the action that uses it. Also secure two additional light objects against accidental loss. Does not reduce the use action's cost.", A),
  "layered-lining": project("Garment supports two paid secondary textile or leather components without additional empty-lining Bulk. Materials and Marks still cost normally; this grants no Capacity or duplicate Core progression."),
});
add("tailoring", "specialty-1", {
  "combat-cut": m("Worn armor grants +Core Tier + 2 untyped to Acrobatics checks to Tumble Through. It does not change movement cost or negate reactions from a failed check.", A),
  "quickdraw-harness": m("Free action once per round: draw up to two weapons secured to this harness, provided you have enough free hands. It does not make a Strike or reduce other activation costs.", A, free),
  "reactive-weave": m("Reaction once per round when damaged: reduce that damage instance by 6 × Core Tier, or 10 × Core Tier if caused by a critical hit, minimum 0. This is reduction of one instance, not resistance for the round.", A, reaction),
  "war-skin-regeneration": m("Worn armor grants +24 × Core Tier maximum HP. Once per day after an encounter, spend 10 minutes adjusting it to restore 8 × Core Tier HP. Replaces per-turn temporary HP and cannot heal through repeated equipping.", A),
});
add("tailoring", "specialty-2", {
  "silent-stitch": m("Worn armor grants +Core Tier + 2 untyped to Stealth checks where clothing noise matters. Enable the Mark condition only when muffling the garment would help.", A),
  "chameleon-cloth": m("Worn armor grants +Core Tier untyped to Stealth checks to Hide or Sneak in one recorded environment palette. Enable the Mark condition only there; no half-Speed requirement beyond normal Sneak rules.", A),
  "many-faced-weave": m("One minute of adjustment creates a recorded mundane disguise of clothing and facial framing. Gain +5 untyped to Deception checks to Impersonate that identity. No size change or copied abilities; close examination still permits detection.", A),
  "shadow-mantle": m("One action once per encounter for 1 minute: gain concealed in dim light or darkness and +Core Tier untyped to Stealth there. Attacking does not end concealment, but bright light suppresses it until you leave that light.", A, act(1)),
  "phase-veil": m("One action once per encounter until the end of your next turn: move through creature spaces and non-magical difficult terrain, gaining physical resistance equal to 6 × Core Tier. You cannot cross solid walls and must end movement in open space.", A, act(1)),
  "null-mantle": m("One action once per day for 1 minute: become invisible and gain +5 untyped to saves against magical detection. Hostile actions suppress invisibility until the start of your next turn. Does not negate precise non-visual senses.", A, act(1)),
});
add("tailoring", "specialty-3", {
  "court-finish": m("Worn armor grants +Core Tier + 2 untyped to Society checks involving formal protocol or heraldry. Enable the Mark condition only for those subjects.", A),
  "envoys-raiment": m("Worn armor grants +Core Tier + 2 untyped to Diplomacy checks when acting in an officially recognised capacity. Enable the Mark condition only with a relevant mandate; social consequences still apply.", A),
  "commanders-mantle": m("Conscious wearer visibly leading allies grants those allies within 30 feet +5 untyped to Aid checks and saves against fear. The wearer is not their own ally for this aura; record recipients manually.", A),
  "judicators-robes": m("Gain +5 untyped to Perception checks to Sense Motive. One action once per encounter: designate a visible creature within 60 feet; allies gain +5 untyped to their first save against it before the end of your next turn.", A, act(1)),
  "sovereign-presence": m("Two actions once per encounter for 1 minute: allies within 30 feet gain +5 untyped to saves. Enemies within 30 feet take -3 untyped to saves against your fear effects. This is a mental aura; unconsciousness ends it.", A, act(2)),
  "coronation-regalia": m("Worn armor grants its recognised office-holder +18 × Core Tier maximum HP and +5 untyped to Diplomacy and Intimidation. Two actions once per day: allies within 30 feet gain a separately tracked 10-point Artisan temporary-HP buffer for 10 minutes. Do not overwrite class temporary HP; track and deduct this buffer manually.", A, act(2)),
});

export const CATALOGUE_REVISIONS = Object.freeze(revisions);
