import { MODULE_ID } from "./constants.js";
import { getRulesConfig } from "./config-store.js";
import { gmItemPlan, buildGMItemSource } from "./gm-item-model.js";
import { markConfigurationChoices } from "./artisan-mark-effects.js";

function requireGM() { if (!game.user.isGM) throw new Error("Only a GM can use the item creator."); }

export function registerGMItemCreator() {
  const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
  class GMItemCreator extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: MODULE_ID + "-gm-item-creator", classes: [MODULE_ID, "cmt-workbench-app"],
      tag: "form", position: { width: 850, height: 760 },
      window: { title: "Wrathmaker GM Item Creator", icon: "fa-solid fa-wand-magic-sparkles", resizable: true },
    };
    static PARTS = { main: { template: "modules/" + MODULE_ID + "/templates/gm-item-creator.hbs" } };
    constructor(options = {}) {
      super(options);
      this.draft = { name: "", maker: "", tier: 1, materialId: "", components: {}, marks: [] };
      this.base = null;
      this.scrollTop = 0;
      this.creating = false;
    }
    async _prepareContext(options) {
      requireGM();
      const config = getRulesConfig();
      const context = { ...(await super._prepareContext(options)), draft: this.draft, base: this.base,
        marks: this.draft.marks.map((mark, index) => ({ name: mark.id, makerName: mark.maker, index })) };
      if (!this.base) return context;
      try {
        const plan = gmItemPlan(this.base, this.draft, config);
        context.plan = plan;
        context.materials = plan.band.coreMaterialIds.map(id => ({ id, label: config.materials[id]?.label ?? id, selected: id === plan.materialId }));
        context.tiers = [1,2,3,4,5,6].map(value => ({ value, label: config.materials[plan.materialId]?.tierLabels[value] ?? "Tier " + value, selected: value === plan.tier }));
        context.components = plan.band.secondaries.filter(group => !group.optional).map(group => ({
          ...group,
          materials: group.materialIds.map(id => ({ id, label: config.materials[id]?.label ?? id, selected: id === (this.draft.components[group.id]?.materialId ?? group.materialIds[0]) })),
          tiers: [1,2,3,4,5,6].filter(value => value >= Math.max(1, plan.tier - 2) && value <= plan.tier).map(value => ({ value, selected: value === Number(this.draft.components[group.id]?.tier ?? plan.tier) })),
        }));
        context.marks = plan.assignments.map((mark, index) => ({ ...mark, index, makerName: this.draft.marks[index].maker }));
      } catch (error) { context.error = error.message; }
      return context;
    }
    _onRender(context, options) {
      super._onRender(context, options);
      requireGM();
      const root = this.element;
      const body = root.querySelector(".cmt-workbench-body");
      body.scrollTop = this.scrollTop;
      body.addEventListener("scroll", () => { this.scrollTop = body.scrollTop; });
      const capture = () => {
        this.draft.name = root.querySelector('[name="itemName"]')?.value ?? this.draft.name;
        this.draft.maker = root.querySelector('[name="maker"]')?.value ?? this.draft.maker;
        for (const input of root.querySelectorAll("[data-maker]")) this.draft.marks[Number(input.dataset.maker)].maker = input.value;
      };
      for (const input of root.querySelectorAll('input[type="text"]')) input.addEventListener("input", capture);
      const drop = root.querySelector("[data-base-drop]");
      drop.addEventListener("dragover", event => event.preventDefault());
      drop.addEventListener("drop", async event => {
        event.preventDefault();
        try {
          requireGM(); capture();
          const data = JSON.parse(event.dataTransfer.getData("text/plain"));
          const item = await fromUuid(data.uuid);
          if (item?.documentName !== "Item") throw new Error("Drop a PF2e item.");
          const draft = { name: item.name, maker: this.draft.maker, tier: 1, materialId: "", components: {}, marks: [] };
          gmItemPlan(item, draft, getRulesConfig());
          this.base = item; this.draft = draft;
          await this.render({ force: true });
        } catch (error) { ui.notifications.error(error.message); }
      });
      for (const field of root.querySelectorAll("[data-core], [data-component]")) field.addEventListener("change", async () => {
        capture();
        // Chassis changes explicitly clear Marks, avoiding silently retaining incompatible selections.
        if (this.draft.marks.length && !await DialogV2.confirm({ window: { title: "Change materials?" }, content: "<p>Changing materials or Tier clears the selected Marks. Continue?</p>" })) {
          await this.render({ force: true }); return;
        }
        if (field.dataset.core) {
          this.draft[field.dataset.core] = field.value;
          this.draft.components = {};
        } else {
          const id = field.dataset.component;
          this.draft.components[id] ??= {};
          this.draft.components[id][field.dataset.part] = field.value;
        }
        this.draft.marks = [];
        await this.render({ force: true });
      });
      const select = root.querySelector("[data-add-mark]");
      select?.addEventListener("change", () => {
        const definition = context.plan.available.find(result => result.mark.id === select.value);
        const anchors = root.querySelector("[data-anchor]");
        anchors.replaceChildren();
        for (const anchor of definition?.anchors ?? []) anchors.add(new Option(anchor.label, anchor.id));
        const choices = root.querySelector("[data-choice]");
        choices.replaceChildren();
        for (const choice of markConfigurationChoices(select.value)) choices.add(new Option(choice, choice));
        choices.hidden = !choices.options.length;
      });
      root.querySelector("[data-add]")?.addEventListener("click", async () => {
        capture();
        const id = select.value;
        if (!id) return;
        this.draft.marks.push({ id, anchorId: root.querySelector("[data-anchor]").value,
          choice: root.querySelector("[data-choice]").value, maker: this.draft.maker.trim() || "Unknown Artisan" });
        await this.render({ force: true });
      });
      for (const button of root.querySelectorAll("[data-remove]")) button.addEventListener("click", async () => {
        capture(); this.draft.marks.splice(Number(button.dataset.remove), 1); await this.render({ force: true });
      });
      root.querySelector("[data-create]")?.addEventListener("click", async () => {
        if (this.creating) return;
        this.creating = true;
        try {
          requireGM(); capture();
          const draft = structuredClone(this.draft);
          const base = this.base;
          const config = getRulesConfig();
          const plan = gmItemPlan(base, draft, config);
          const override = plan.capacity.overCapacity && await DialogV2.confirm({
            window: { title: "Exceed Artisan Capacity?" },
            content: "<p>This item uses " + plan.capacity.used + " / " + plan.capacity.maximum + " Capacity. Create it with a GM override?</p>",
          });
          if (plan.capacity.overCapacity && !override) return;
          requireGM();
          const source = buildGMItemSource(base, draft, config, { isGM: game.user.isGM, allowOverCapacity: override });
          const item = await Item.create(source);
          if (!item) throw new Error("The item was not created.");
          ui.notifications.info("Custom item created in the Items Directory.");
          item.sheet?.render(true);
        } catch (error) { ui.notifications.error(error.message); }
        finally { this.creating = false; }
      });
    }
  }
  game.settings.registerMenu(MODULE_ID, "gmItemCreator", {
    name: "Wrathmaker GM Item Creator", label: "Create Custom Item", hint: "Create world items with named makers and Artisan Marks. No materials or downtime required.",
    icon: "fa-solid fa-wand-magic-sparkles", type: GMItemCreator, restricted: true,
  });
  Hooks.on("renderItemDirectory", (_app, element) => {
    if (!game.user.isGM) return;
    const root = element instanceof HTMLElement ? element : element?.[0];
    const actions = root?.querySelector(".directory-header .header-actions, .directory-header .action-buttons, .directory-header");
    if (!actions || root.querySelector("[data-cmt-gm-create]")) return;
    const button = document.createElement("button");
    button.type = "button"; button.dataset.cmtGmCreate = "true"; button.textContent = "Create Custom Item";
    button.addEventListener("click", () => { requireGM(); new GMItemCreator().render({ force: true }); });
    actions.append(button);
  });
  return GMItemCreator;
}
