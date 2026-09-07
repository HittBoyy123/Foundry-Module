import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { WRATHMAKER_PLAYER_GUIDE as player, WRATHMAKER_GM_GUIDE as gm } from "../content/wrathmaker-guide.js";
import { SPECIALTIES_BY_PROFESSION } from "../content/professions.js";

test("player handbook covers all systems, 33 specialisations and 253 Marks", () => {
  assert.equal(player.pages.length, 274);
  const text = player.pages.map(page => page.text.content).join(" ");
  for (const phrase of ["Nephilim", "Hero Points", "Apex", "Dragon Scales", "Disassemble", "Express Rider", "Capacity", "Spell Focus"]) assert.ok(text.includes(phrase));
  for (const specialty of Object.values(SPECIALTIES_BY_PROFESSION).flat()) assert.ok(text.includes(specialty.stages.signature.label));
  for (const guide of [player, gm]) {
    assert.match(guide._id, /^[A-Za-z0-9]{16}$/);
    assert.equal(new Set(guide.pages.map(page => page._id)).size, guide.pages.length);
    for (const page of guide.pages) {
      assert.match(page._id, /^[A-Za-z0-9]{16}$/);
      assert.ok(!page.text.content.includes("undefined"));
    }
  }
});

test("GM content is absent from player pack and restricted at pack, journal and page levels", async () => {
  const manifest = JSON.parse(await readFile(new URL("../module.json", import.meta.url)));
  const gmPack = manifest.packs.find(pack => pack.name === "gm-guide");
  for (const role of ["PLAYER", "TRUSTED"]) assert.equal(gmPack.ownership[role], "NONE");
  assert.equal(gm.ownership.default, 0);
  assert.ok(gm.pages.every(page => page.ownership.default === 0));
  assert.equal(player.ownership.default, 2);
  assert.ok(player.pages.every(page => page.ownership.default === 2));
  const publishedPlayer = JSON.parse((await readFile(new URL("../packs/player-guide.db", import.meta.url), "utf8")).trim());
  const publishedGM = JSON.parse((await readFile(new URL("../packs/gm-guide.db", import.meta.url), "utf8")).trim());
  assert.deepEqual(publishedPlayer, player);
  assert.deepEqual(publishedGM, gm);
  assert.ok(!JSON.stringify(player).includes("GM — Settings"));
});
