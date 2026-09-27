import test from "node:test";
import assert from "node:assert/strict";
import { materialBenefits } from "../scripts/material-benefits.js";
import { cloneDefaultRulesConfig } from "../scripts/constants.js";
import { normalizeRulesConfig } from "../scripts/model.js";
test("material descriptions follow tier bonuses and item-specific Voidborn effects", () => {
 const config = normalizeRulesConfig(cloneDefaultRulesConfig());
 const preview = (type, material, tier) => materialBenefits({ type, name: "Test" }, material, tier, config);
 assert.match(preview("weapon", "metal", 2).lines.join(" "), /\+1 bonus to attack rolls/);
 assert.match(preview("weapon", "metal", 6).lines.join(" "), /\+5 bonus to attack rolls/);
 assert.match(preview("armor", "metal", 2).lines.join(" "), /saving throws while worn/);
 assert.match(preview("weapon", "omnipotisium", 1).lines.join(" "), /Deals full damage against Voidborn/);
 assert.match(preview("armor", "omnipotisium", 1).lines.join(" "), /halves damage received/);
 assert.doesNotMatch(preview("weapon", "metal", 2).lines.join(" "), /Voidborn/);
});
