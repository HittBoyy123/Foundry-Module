import assert from "node:assert/strict";
import test from "node:test";
import { cloneDefaultRulesConfig } from "../scripts/constants.js";
import { registerRulesSetting } from "../scripts/config-store.js";
import { registerWorkbench, openWorkbenchApplication } from "../scripts/workbench.js";

test("disabled Workbench blocks menu/API access and GM socket completion, and reacts live", async () => {
  const hooks = new Map();
  globalThis.Hooks = {
    on(name, fn) { hooks.set(name, fn); },
    once(name, fn) { hooks.set(name, fn); },
    callAll(name, ...args) { hooks.get(name)?.(...args); },
  };
  let renders = 0;
  class Application {
    async _prepareContext() { return {}; }
    _onRender() {}
    render() { renders++; this.rendered = true; }
    async close() { this.rendered = false; }
  }
  globalThis.foundry = { applications: { api: {
    ApplicationV2: Application, HandlebarsApplicationMixin: Base => Base,
  } } };
  const gm = { id: "gm", name: "GM", active: true, isGM: true };
  const users = [gm];
  users.get = id => users.find(user => user.id === id);
  let settings;
  let saved = cloneDefaultRulesConfig();
  let socketHandler;
  let response;
  const party = { id: "party", type: "party", canUserModify: () => true };
  globalThis.game = {
    user: gm, users,
    actors: { contents: [], get: () => party },
    items: { contents: [] },
    settings: {
      register(_module, _key, options) { settings = options; },
      get() { return saved; },
    },
    i18n: { localize: key => key },
    socket: {
      on(_name, fn) { socketHandler = fn; },
      emit(_name, payload) { response = payload; },
    },
  };
  const warnings = [];
  globalThis.ui = { notifications: { warn: text => warnings.push(text) }, items: { render() {} } };
  registerRulesSetting();
  const Workbench = registerWorkbench();
  assert.equal(openWorkbenchApplication(), null);
  assert.equal(warnings.length, 1);
  const menu = new Workbench();
  assert.deepEqual(await menu._prepareContext({}), { workbenchEnabled: false });
  menu.rendered = true;
  menu._onRender({}, {});
  saved = { ...saved, crafting: { ...saved.crafting, workbenchEnabled: true } };
  settings.onChange();
  assert.equal(renders, 1, "an open disabled menu refreshes after enabling");
  assert.ok(openWorkbenchApplication() instanceof Workbench);
  saved.crafting.workbenchEnabled = false;
  settings.onChange();
  assert.deepEqual(await menu._prepareContext({}), { workbenchEnabled: false });
  hooks.get("ready")();
  const originalError = console.error;
  console.error = () => {};
  try {
    socketHandler({ type: "complete-request", gmId: "gm", userId: "gm", partyId: "party", projectId: "project" });
    await new Promise(resolve => setImmediate(resolve));
  } finally { console.error = originalError; }
  assert.equal(response.ok, false);
  assert.match(response.error, /FeatureDisabled/);
  await menu.close();
});
