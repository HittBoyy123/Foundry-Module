import { newCustomOre, customOreResource } from "./custom-ores.js";
import { MODULE_ID } from "./constants.js";
import { getRulesConfig, resetRulesConfig, setRulesConfig } from "./config-store.js";
import {
  applyDashboardChanges,
  applyMaterialChanges,
  applyProfessionChanges,
  buildDashboardContext,
  buildMaterialEditorContext,
  buildProfessionEditorContext,
} from "./settings-model.js";

function notifyError(error, context) {
  console.error(`${MODULE_ID} | ${context}`, error);
  ui.notifications.error(error.message, { permanent: true });
}

export function createRulesConfigApplication() {
  const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

  class MaterialRulesConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-material-config`,
      classes: [MODULE_ID, "cmt-rules-config", "cmt-material-config"],
      tag: "form",
      position: { width: 860, height: 680 },
      window: {
        icon: "fa-solid fa-gem",
        title: "CMT.Settings.Material.Title",
        resizable: true,
      },
      form: {
        closeOnSubmit: false,
        handler: this.submitMaterial,
      },
    };

    static PARTS = {
      main: { template: `modules/${MODULE_ID}/templates/material-config.hbs` },
    };

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      return { ...context, ...buildMaterialEditorContext(getRulesConfig(), this.materialId) };
    }

    static async submitMaterial(_event, _form, formData) {
      if (!game.user.isGM) return;
      try {
        const updated = applyMaterialChanges(getRulesConfig(), this.materialId, formData.object);
        await setRulesConfig(updated);
        ui.notifications.info(game.i18n.format("CMT.Notifications.MaterialSaved", {
          material: updated.materials[this.materialId].label,
        }));
        await this.parentApp?.render({ force: true });
        await this.close();
      } catch (error) {
        notifyError(error, `Material ${this.materialId} was not saved.`);
      }
    }
  }

  class ProfessionRulesConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-profession-config`,
      classes: [MODULE_ID, "cmt-rules-config", "cmt-profession-config"],
      tag: "form",
      position: { width: 680, height: 590 },
      window: {
        icon: "fa-solid fa-hammer",
        title: "CMT.Settings.Profession.Title",
        resizable: true,
      },
      form: {
        closeOnSubmit: false,
        handler: this.submitProfession,
      },
    };

    static PARTS = {
      main: { template: `modules/${MODULE_ID}/templates/profession-config.hbs` },
    };

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      return { ...context, ...buildProfessionEditorContext(getRulesConfig(), this.professionId) };
    }

    static async submitProfession(_event, _form, formData) {
      try {
        const updated = applyProfessionChanges(getRulesConfig(), this.professionId, formData.object);
        await setRulesConfig(updated);
        ui.notifications.info(game.i18n.format("CMT.Notifications.ProfessionSaved", {
          profession: buildProfessionEditorContext(updated, this.professionId).name,
        }));
        await this.parentApp?.render({ force: true });
        await this.close();
      } catch (error) {
        notifyError(error, `Profession ${this.professionId} was not saved.`);
      }
    }
  }

  return class WrathmakerRulesConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-rules-config`,
      classes: [MODULE_ID, "cmt-rules-config", "cmt-settings-dashboard"],
      tag: "form",
      position: { width: 820, height: 760 },
      window: {
        icon: "fa-solid fa-hammer",
        title: "CMT.Settings.Menu.Title",
        resizable: true,
      },
      form: {
        closeOnSubmit: false,
        handler: this.submitDashboard,
      },
      actions: {
        editMaterial: this.editMaterial,
        addCustomOre: this.addCustomOre,
        createOreIngot: this.createOreIngot,
        showMaterials: this.showMaterials,
        showCustomOres: this.showCustomOres,
        editProfession: this.editProfession,
        reset: this.resetRules,
      },
    };

    static PARTS = {
      main: { template: `modules/${MODULE_ID}/templates/rules-config.hbs` },
    };

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const config = getRulesConfig();
      const zones = Object.entries(globalThis.kingmaker?.CONST?.ZONES ?? {});
      this.regionKeys = zones.map(([key]) => key);
      return { ...context, ...buildDashboardContext(config), regionTierRows: zones.map(([key, zone], index) => ({
        index, name: game.i18n.localize(zone.label ?? key),
        options: [{ value: "", label: "Automatic (region level)", selected: !config.gathering.regionTierLimits?.[key] },
          ...[1, 2, 3, 4, 5, 6].map(tier => ({ value: tier, label: `Tier ${tier}`, selected: config.gathering.regionTierLimits?.[key] === tier }))],
      })) };
    }

    static async submitDashboard(_event, _form, formData) {
      try {
        const config = structuredClone(getRulesConfig());
        config.gathering.regionTierLimits ??= {};
        for (const [index, key] of (this.regionKeys ?? []).entries()) {
          const value = formData.object.regionTier?.[index];
          if (value === undefined) continue;
          if (value === "") delete config.gathering.regionTierLimits[key];
          else config.gathering.regionTierLimits[key] = Number(value);
        }
        await setRulesConfig(applyDashboardChanges(config, formData.object));
        ui.notifications.info(game.i18n.localize("CMT.Notifications.RulesSaved"));
        await this.render({ force: true });
      } catch (error) {
        notifyError(error, "Wrathmaker settings were not saved.");
      }
    }

    static showMaterials() { this.element.querySelector('[data-material-category="standard"]').hidden = false; this.element.querySelector('[data-material-category="custom"]').hidden = true; }
    static showCustomOres() { this.element.querySelector('[data-material-category="standard"]').hidden = true; this.element.querySelector('[data-material-category="custom"]').hidden = false; }
    static async addCustomOre() {
      if (!game.user.isGM) return;
      const name = await DialogV2.prompt({ window:{title:"Add Custom Ore"}, content:'<label>Name <input name="oreName" required></label>', ok:{label:"Create",callback:(_e,button)=>button.form.elements.oreName.value} });
      if (!name) return;
      try {
        const id = "custom-" + name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
        await setRulesConfig(newCustomOre(getRulesConfig(),name,id));
        await this.render({force:true});
        await this.constructor.editMaterial.call(this,null,{dataset:{materialId:id}});
      } catch(error) { notifyError(error,"Could not add custom ore."); }
    }
    static async createOreIngot(_event,target) {
      if (!game.user.isGM) return;
      const id=target.dataset.materialId, material=getRulesConfig().materials[id];
      if (!material?.customOre) return;
      const pack=game.packs.get(MODULE_ID+".omnipotisium-ingots");
      if (!pack) return ui.notifications.error("Custom Ores compendium is unavailable.");
      const locked=pack.locked;
      try {
        if(locked) await pack.configure({locked:false});
        const source=customOreResource(id,material);
        const existing=(await pack.getDocuments()).find(item=>item.flags?.[MODULE_ID]?.resource?.materialId===id);
        if(existing) await existing.update(source);
        else await pack.documentClass.createDocuments([source],{pack:pack.collection});
        ui.notifications.info("Ingot saved to Custom Ores.");
      } catch(error) { notifyError(error,"Could not save ingot."); }
      finally { if(locked) await pack.configure({locked:true}); }
    }
    static async editMaterial(_event, target) {
      if (!game.user.isGM) return;
      const materialId = target?.dataset.materialId;
      if (!materialId || !getRulesConfig().materials[materialId]) return;
      const application = new MaterialRulesConfig();
      application.materialId = materialId;
      application.parentApp = this;
      await application.render({ force: true });
    }

    static async editProfession(_event, target) {
      const professionId = target?.dataset.professionId;
      if (!professionId || !getRulesConfig().professions?.[professionId]) return;
      const application = new ProfessionRulesConfig();
      application.professionId = professionId;
      application.parentApp = this;
      await application.render({ force: true });
    }

    static async resetRules() {
      const confirmed = await DialogV2.confirm({
        window: { title: game.i18n.localize("CMT.Settings.Reset.Title") },
        content: `<p>${game.i18n.localize("CMT.Settings.Reset.Confirm")}</p>`,
        modal: true,
      });
      if (!confirmed) return;
      await resetRulesConfig();
      ui.notifications.info(game.i18n.localize("CMT.Notifications.RulesReset"));
      await this.render({ force: true });
    }
  };
}
