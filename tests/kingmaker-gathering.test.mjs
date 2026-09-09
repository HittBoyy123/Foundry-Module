import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRulesConfig } from "../scripts/model.js";
import { cloneDefaultRulesConfig } from "../scripts/constants.js";
import { HEX_TERRAIN_RESOURCES, resolveKingmakerGathering, kingmakerTaskAllowed, kingmakerEnvironment } from "../scripts/kingmaker-gathering.js";
function fixture() {
  const actor = { id: "pc", type: "character", level: 4 };
  const party = { id: "party", members: [actor, { id: "other", type: "character", level: 4 }] };
  const hex = { key: 1002, toString: () => "1.2", zone: { label: "Greenbelt", level: 12 },
    data: { terrain: "forest", travel: "open", zone: "test", exploration: 1,
      showResources: true, commodity: "ore", features: [{ type: "ruin", discovered: false }] } };
  const kingmaker = { active: true, region: { active: true, getHexFromPoint: () => hex } };
  const canvas = { scene: {}, tokens: { placeables: [{ actor: party, center: { x: 10, y: 20 } }] } };
  return { actor, party, hex, kingmaker, canvas };
}

test("region tier overrides persist and respect the party cap", () => {
  const config = cloneDefaultRulesConfig();
  config.gathering.regionTierLimits = { test: 1 };
  const normalized = normalizeRulesConfig(config);
  const f = fixture();
  assert.equal(resolveKingmakerGathering({ ...f, regionTierLimits: normalized.gathering.regionTierLimits }).maxTier, 1);
  assert.equal(resolveKingmakerGathering({ ...f, regionTierLimits: { test: 6 } }).maxTier, 2);
  assert.equal(resolveKingmakerGathering({ ...f, regionTierLimits: { another: 1 } }).maxTier, 2);
  config.gathering.regionTierLimits.test = 7;
  assert.throws(() => normalizeRulesConfig(config), /between 1 and 6/);
});
test("party occupied hex provides terrain and zone; level 4 caps at tier 2", () => {
  const result = resolveKingmakerGathering(fixture());
  assert.equal(result.id, "1002");
  assert.equal(result.maxTier, 2);
  assert.equal(result.exploration, "Reconnoitred");
  assert.deepEqual(result.materialIds, ["wood", "herbs", "leather", "metal"]);
  assert.deepEqual(result.tags, ["ore"]);
  assert.equal(kingmakerTaskAllowed(result, { materialId: "metal", tier: 2 }), true);
  assert.equal(kingmakerTaskAllowed(result, { materialId: "metal", tier: 3 }), false);
  assert.equal(kingmakerTaskAllowed(result, { materialId: "dragon-scale", tier: 1 }), false);
});
test("hidden deposits never unlock resources or disclose secret features", () => {
  const f = fixture(); f.hex.data.showResources = false;
  const result = resolveKingmakerGathering(f);
  assert.equal(result.materialIds.includes("metal"), false);
  assert.deepEqual(result.tags, []);
});
test("missing module, map or party position blocks gathering rather than falling back", () => {
  const f = fixture();
  assert.equal(resolveKingmakerGathering({ ...f, kingmaker: null }).maxTier, 0);
  f.kingmaker.region.active = false;
  assert.equal(resolveKingmakerGathering(f).blocked, true);
  f.kingmaker.region.active = true; f.canvas.tokens.placeables = [];
  assert.equal(resolveKingmakerGathering(f).blocked, true);
});
test("deposit tasks can appear in a terrain which normally excludes that resource", () => {
  const region = resolveKingmakerGathering(fixture());
  const environment = kingmakerEnvironment({ id: "forest" }, region, [
    { id: "ore", materialId: "metal", tier: 2 }, { id: "crystal", materialId: "mana-crystals", tier: 2 },
  ]);
  assert.deepEqual(environment.taskIds, ["ore"]);
});

test("all mapped terrains supply their base resource families", () => {
  for (const [terrain, materials] of Object.entries(HEX_TERRAIN_RESOURCES)) {
    const f = fixture(); f.hex.data.terrain = terrain; f.hex.data.showResources = false;
    assert.deepEqual(resolveKingmakerGathering(f).materialIds, materials);
  }
});

test("both regional level and party level limit tiers at every threshold", () => {
  for (const [index, level] of [1, 4, 8, 12, 16, 20].entries()) {
    const f = fixture(); f.party.members.forEach(m => m.level = 20); f.hex.zone.level = level;
    assert.equal(resolveKingmakerGathering(f).maxTier, index + 1);
    f.hex.zone.level = 20; f.party.members.forEach(m => m.level = level);
    assert.equal(resolveKingmakerGathering(f).maxTier, index + 1);
  }
});

test("invalid zone or terrain data fails closed", () => {
  for (const level of [null, undefined, "", -1, "unknown"]) {
    const f = fixture(); f.hex.zone.level = level;
    assert.equal(resolveKingmakerGathering(f).blocked, true);
  }
  const f = fixture(); f.hex.data.terrain = "unknown";
  assert.equal(resolveKingmakerGathering(f).blocked, true);
});

test("selected party membership and conflicting positions are checked", () => {
  const f = fixture(); f.party.members = [];
  assert.equal(resolveKingmakerGathering(f).blocked, true);
  const g = fixture();
  g.canvas.tokens.placeables.push({ actor: g.party, center: { x: 30, y: 20 } });
  g.kingmaker.region.getHexFromPoint = point => point.x === 10 ? g.hex : { ...g.hex, key: 2002 };
  assert.equal(resolveKingmakerGathering(g).blocked, true);
});

test("only discovered special features affect the readout", () => {
  const f = fixture(); f.hex.data.features.push({ type: "farmland", discovered: true });
  assert.deepEqual(resolveKingmakerGathering(f).tags, ["ore", "farmland"]);
});
