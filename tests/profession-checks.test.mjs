import test from "node:test";
import assert from "node:assert/strict";
import { PROFESSION_ITEM_SOURCES } from "../content/professions.js";
import { createProfessionLoreSource } from "../scripts/professions.js";
import { professionSkillChoices, resolveProfessionStatistic } from "../scripts/profession-checks.js";

function fixture() {
  const profession = structuredClone(PROFESSION_ITEM_SOURCES[0]);
  const data = profession.flags["pf2e-crafting-material-tiers"].profession;
  const lore = createProfessionLoreSource(data, 4);
  lore.id = "lore-item";
  const statistic = { label: lore.name, rank: 2, roll: async () => ({ total: 24 }) };
  const actor = {
    level: 4, items: [profession, lore],
    skills: { "prepared-lore": { lore: true, itemId: lore.id } },
    getStatistic: id => id === "prepared-lore" ? statistic :
      ["crafting", "survival"].includes(id) ? { label: id, roll() {} } : null,
  };
  return { actor, lore, statistic, material: data.materialIds[0] };
}

test("relevant profession Lore is offered for crafting and gathering and uses its prepared statistic", () => {
  const { actor, material, statistic } = fixture();
  for (const skill of ["crafting", "survival"]) {
    assert.deepEqual(professionSkillChoices(actor, skill, [material]).map(choice => choice.id), [skill, "prepared-lore"]);
    assert.equal(resolveProfessionStatistic(actor, skill, [material], "prepared-lore").statistic, statistic);
  }
});

test("unrelated, missing and untrained Lore cannot be selected", () => {
  const { actor, material, statistic } = fixture();
  assert.throws(() => resolveProfessionStatistic(actor, "crafting", ["unrelated"], "prepared-lore"), /eligible/);
  statistic.rank = 0;
  assert.equal(professionSkillChoices(actor, "crafting", [material]).length, 1);
  actor.items = [];
  assert.throws(() => resolveProfessionStatistic(actor, "crafting", [material], "prepared-lore"), /eligible/);
});

test("a relevant secondary project material permits Lore without changing the normal skill", () => {
  const { actor, material } = fixture();
  assert.equal(professionSkillChoices(actor, "crafting", ["unrelated", material]).length, 2);
  assert.equal(resolveProfessionStatistic(actor, "crafting", [material]).label, "crafting");
});
