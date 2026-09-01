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
        editProfession: this.editProfession,
        reset: this.resetRules,
      },
    };

    static PARTS = {
      main: { template: `modules/${MODULE_ID}/templates/rules-config.hbs` },
    };

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      return { ...context, ...buildDashboardContext(getRulesConfig()) };
    }

    static async submitDashboard(_event, _form, formData) {
      try {
        await setRulesConfig(applyDashboardChanges(getRulesConfig(), formData.object));
        ui.notifications.info(game.i18n.localize("CMT.Notifications.RulesSaved"));
        await this.render({ force: true });
      } catch (error) {
        notifyError(error, "Wrathmaker settings were not saved.");
      }
    }

    static async editMaterial(_event, target) {
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
