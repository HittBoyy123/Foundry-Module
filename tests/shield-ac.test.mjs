import test from "node:test";
import assert from "node:assert/strict";
import { raisedShieldMarkBonus } from "../scripts/artisan-mark-effects.js";
test("shield mark AC depends on raised state and shield type", () => {
  const shield = { type: "shield", isRaised: true, system: { baseItem: "steel-shield" } };
  assert.equal(raisedShieldMarkBonus(shield), 1);
  for (const baseItem of ["tower-shield", "fortress-shield"]) assert.equal(raisedShieldMarkBonus({ ...shield, system: { baseItem } }), 2);
  for (const baseItem of ["buckler", "gauntlet-buckler"]) assert.equal(raisedShieldMarkBonus({ ...shield, system: { baseItem } }), 0);
  assert.equal(raisedShieldMarkBonus({ ...shield, isRaised: false }), 0);
  assert.equal(raisedShieldMarkBonus({ ...shield, isBroken: true }), 0);
  assert.equal(raisedShieldMarkBonus({ ...shield, isDestroyed: true }), 0);
});
