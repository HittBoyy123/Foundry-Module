import assert from "node:assert/strict";
import test from "node:test";

import {
  findGatheringParty,
  normalizeGatheringRewardDestination,
  resolveGatheringRecipient,
} from "../scripts/gathering-destination.js";
import {
  gatheringEnvironmentForDocument,
  gatheringEnvironmentsForDocument,
  gatheringTierForRegionLevel,
  parseGatheringRegionLevel,
  resolveGatheringRegion,
} from "../scripts/gathering-regions.js";

test("gathering defaults to the PF2e party containing the selected character", () => {
  const character = { id: "hero", uuid: "Actor.hero", type: "character" };
  const party = { id: "party", type: "party", members: [character] };
  const otherParty = { id: "other", type: "party", members: [{ id: "other-hero" }] };

  assert.equal(normalizeGatheringRewardDestination("unknown"), "party-stash");
  assert.equal(findGatheringParty(character, [otherParty, party]), party);
  assert.deepEqual(resolveGatheringRecipient(character, { actors: [party] }), {
    recipient: party,
    destination: "party-stash",
    missingParty: false,
  });
  assert.deepEqual(resolveGatheringRecipient(character, { destination: "character" }), {
    recipient: character,
    destination: "character",
    missingParty: false,
  });
  assert.equal(resolveGatheringRecipient(character).missingParty, true);
});

test("region levels follow the crafting resource thresholds", () => {
  assert.equal(parseGatheringRegionLevel("Narlmarches — Level 8"), 8);
  assert.equal(parseGatheringRegionLevel("Kamelands Lv. 12"), 12);
  assert.equal(parseGatheringRegionLevel("Greenbelt"), null);
  assert.deepEqual(
    [1, 3, 4, 7, 8, 12, 16, 20].map((level) => gatheringTierForRegionLevel(level)),
    [1, 1, 2, 2, 3, 4, 5, 6],
  );
});

test("PF2e Scene Region terrain and level determine available gathering goods", () => {
  const actor = { id: "hero", uuid: "Actor.hero" };
  const token = { actor, actorId: actor.id };
  const region = {
    id: "narlmarches",
    name: "Narlmarches — Level 8",
    tokens: new Set([token]),
    behaviors: [{ type: "environment", system: { environmentTypes: new Set(["forest"]) } }],
  };
  const resolved = resolveGatheringRegion({
    actor,
    scene: { id: "stolen-lands", name: "The Stolen Lands", regions: [region] },
    fallbackEnvironmentId: "plains",
    fallbackMaxTier: 1,
  });

  assert.equal(gatheringEnvironmentForDocument(region), "forest");
  assert.deepEqual(resolved, {
    active: true,
    source: "scene-region",
    id: "narlmarches",
    name: "Narlmarches — Level 8",
    level: 8,
    environmentId: "forest",
    environmentIds: ["forest"],
    maxTier: 3,
  });
});

test("a Stolen Lands region can expose more than one PF2e terrain", () => {
  const region = {
    behaviors: [{
      type: "environment",
      system: { environmentTypes: new Set(["forest", "plains", "mountain"]) },
    }],
  };
  assert.deepEqual(gatheringEnvironmentsForDocument(region), ["forest", "plains", "mountains"]);
});

test("a Kingmaker party token locates the region for one of its members", () => {
  const actor = { id: "hero", uuid: "Actor.hero", parties: new Set() };
  const party = { id: "party", uuid: "Actor.party", type: "party", members: [actor] };
  actor.parties.add(party);
  const partyToken = { actor: party, actorId: party.id };
  const region = {
    id: "kamelands",
    name: "Kamelands — Level 4",
    tokens: new Set([partyToken]),
    behaviors: [{ type: "environment", system: { environmentTypes: new Set(["plains"]) } }],
  };
  const resolved = resolveGatheringRegion({
    actor,
    scene: { id: "stolen-lands", name: "The Stolen Lands", tokens: [partyToken], regions: [region] },
  });
  assert.equal(resolved.id, "kamelands");
  assert.equal(resolved.environmentId, "plains");
  assert.equal(resolved.maxTier, 2);
});

test("Wrathmaker region flags override PF2e terrain and scene settings remain a fallback", () => {
  const flagged = {
    name: "Custom Mine",
    flags: {
      "pf2e-crafting-material-tiers": {
        gathering: { enabled: true, level: 16, environmentId: "underground" },
      },
    },
  };
  assert.equal(gatheringEnvironmentForDocument(flagged, "forest"), "underground");

  const scene = {
    id: "slough",
    name: "Hooktongue Slough — Level 4",
    environmentTypes: new Set(["swamp"]),
    regions: [],
  };
  const resolved = resolveGatheringRegion({ actor: { id: "hero" }, scene });
  assert.equal(resolved.source, "scene");
  assert.equal(resolved.environmentId, "wetlands");
  assert.equal(resolved.maxTier, 2);

  const manual = resolveGatheringRegion({
    scene,
    useSceneRegion: false,
    fallbackEnvironmentId: "mountains",
    fallbackMaxTier: 4,
  });
  assert.equal(manual.active, false);
  assert.equal(manual.environmentId, "mountains");
  assert.equal(manual.maxTier, 4);
});
