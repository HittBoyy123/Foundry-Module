import test from "node:test";
import assert from "node:assert/strict";
import { createLiveGatheringRefresh } from "../scripts/live-gathering-refresh.js";
test("continuous movement refreshes immediately and during movement, not only on stop", async () => {
  const scheduled = []; let renders = 0;
  const app = { workbenchState: { tab: "gather" }, render: () => { renders++; } };
  const refresh = createLiveGatheringRefresh(() => [app], callback => { scheduled.push(callback); return scheduled.length; });
  const tick = () => new Promise(resolve => setImmediate(resolve));
  refresh(); await tick(); assert.equal(renders, 1);
  for (let i = 0; i < 10; i++) refresh();
  scheduled.shift()(); await tick(); assert.equal(renders, 2);
  refresh(); scheduled.shift()(); await tick(); assert.equal(renders, 3);
  app.workbenchState.tab = "craft";
  refresh(); scheduled.shift()(); await tick(); assert.equal(renders, 3);
});
