import { MODULE_ID } from "./constants.js";
import { getRulesConfig, resetRulesConfig, setRulesConfig } from "./config-store.js";

export function createRulesConfigApplication() {
  const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

  return class CraftingMaterialRulesConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-rules-config`,
      classes: [MODULE_ID, "cmt-rules-config"],
      tag: "form",
      position: { width: 760, height: 720 },
      window: {
        icon: "fa-solid fa-hammer",
        title: "CMT.Settings.Menu.Title",
        resizable: true,
      },
      form: {
        closeOnSubmit: false,
        handler: this.submitRules,
      },
      actions: {
        format: this.formatRules,
        reset: this.resetRules,
      },
    };

    static PARTS = {
      main: { template: `modules/${MODULE_ID}/templates/rules-config.hbs` },
    };

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      return {
        ...context,
        configJson: JSON.stringify(getRulesConfig(), null, 2),
      };
    }

    static async submitRules(_event, _form, formData) {
      try {
        await setRulesConfig(formData.object.config);
        ui.notifications.info(game.i18n.localize("CMT.Notifications.RulesSaved"));
        await this.render({ force: true });
      } catch (error) {
        console.error(`${MODULE_ID} | Rules configuration was not saved.`, error);
        ui.notifications.error(error.message, { permanent: true });
      }
    }

    static async formatRules() {
      const textarea = this.element.querySelector('textarea[name="config"]');
      if (!textarea) return;
      try {
        textarea.value = JSON.stringify(JSON.parse(textarea.value), null, 2);
      } catch (error) {
        ui.notifications.error(`${game.i18n.localize("CMT.Notifications.InvalidJson")} ${error.message}`);
      }
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
