import { CRAFTING_RESOURCE_SOURCES } from "../content/crafting-resources.js";
import {
  GATHERING_ENVIRONMENT_SOURCES,
  GATHERING_TASK_SOURCES,
} from "../content/gathering-presets.js";
import { MODULE_ID } from "./constants.js";
import { getCraftingResourceData } from "./crafting-categories.js";
import {
  GATHERING_REWARD_DESTINATIONS,
  resolveGatheringRecipient,
} from "./gathering-destination.js";
import {
  evaluateGatheringTask,
  findGatheringResource,
  gatheringResourceKey,
  listTasksForEnvironment,
  normalizeDegreeOfSuccess,
  normalizeGatheringEnvironment,
  normalizeGatheringTask,
  resolveGatheringOutcome,
} from "./gathering-model.js";
import { resolveGatheringRegion } from "./gathering-regions.js";

let GatheringApplication = null;

function localize(key, fallback = key) {
  const value = game.i18n.localize(key);
  return value === key ? fallback : value;
}

function format(key, data, fallback = key) {
  const value = game.i18n.format(key, data);
  return value === key ? fallback : value;
}

function rootElement(element) {
  return element instanceof HTMLElement ? element : element?.[0] ?? null;
}

function ownedCharacters() {
  return Array.from(game.actors ?? [])
    .filter((actor) => actor.type === "character" && (game.user.isGM || actor.isOwner))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function resourceIdentity(item) {
  return gatheringResourceKey(getCraftingResourceData(item));
}

function cloneSource(document) {
  if (typeof document?.toObject === "function") return document.toObject();
  return JSON.parse(JSON.stringify(document));
}

function currentSceneUuid() {
  return globalThis.canvas?.scene?.uuid ?? game.scenes?.current?.uuid ?? "";
}

function currentScene() {
  return globalThis.canvas?.scene ?? game.scenes?.current ?? null;
}

function gatheringRegion(actor, config) {
  return resolveGatheringRegion({
    actor,
    scene: currentScene(),
    useSceneRegion: config.gathering?.useSceneRegion !== false,
    fallbackEnvironmentId: config.gathering?.environmentId ?? "forest",
    fallbackMaxTier: config.gathering?.maxTier ?? 1,
  });
}

function gatheringRecipient(actor, config) {
  return resolveGatheringRecipient(actor, {
    actors: game.actors,
    activeParty: game.actors?.party ?? null,
    destination: config.gathering?.rewardDestination,
  });
}

function outcomeLabel(outcome) {
  return localize(`CMT.Gathering.Outcomes.${outcome}`, outcome);
}

async function resourceDocuments() {
  const pack = game.packs.get(`${MODULE_ID}.crafting-resources`);
  if (!pack) throw new Error(localize("CMT.Gathering.ResourcePackMissing"));
  return pack.getDocuments();
}

export async function grantGatheringResource(recipient, resourceDocument, quantity) {
  const amount = Math.max(0, Math.trunc(Number(quantity) || 0));
  if (!recipient?.canUserModify?.(game.user, "update")) {
    throw new Error(localize("CMT.Gathering.NotEditable"));
  }
  if (amount === 0) return null;
  const identity = resourceIdentity(resourceDocument);
  if (!identity) throw new Error(localize("CMT.Gathering.ResourceInvalid"));

  const existing = Array.from(recipient.items ?? []).find((item) => resourceIdentity(item) === identity);
  if (existing) {
    const current = Math.max(0, Math.trunc(Number(existing.system?.quantity) || 0));
    await existing.update({ "system.quantity": current + amount });
    return existing;
  }

  const source = cloneSource(resourceDocument);
  delete source._id;
  source.system ??= {};
  source.system.quantity = amount;
  const created = await recipient.createEmbeddedDocuments("Item", [source]);
  return created?.[0] ?? null;
}

async function postGatheringResult({ actor, recipient, task, evaluation, resource, resolution, roll }) {
  const content = await renderTemplate(`modules/${MODULE_ID}/templates/gathering-chat.hbs`, {
    actorName: actor.name,
    recipientName: recipient?.name ?? actor.name,
    taskName: task.name,
    taskImg: task.img,
    skill: task.check.skill.replace(/(^|-)([a-z])/gu, (_match, separator, letter) => `${separator}${letter.toUpperCase()}`),
    dc: evaluation.check.dc,
    rollTotal: Number(roll.total),
    outcome: outcomeLabel(resolution.outcome),
    success: resolution.quantity > 0,
    quantity: resolution.quantity,
    resourceName: resource.name,
    units: resolution.units,
    unit: evaluation.resource ? getCraftingResourceData(resource)?.unit?.replaceAll("-", " ") : "resource",
  });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
  });
}

async function attemptGathering(application, formData, event) {
  const config = application.getConfig();
  if (config.gathering?.enabled === false) throw new Error(localize("CMT.Gathering.Disabled"));
  const actor = ownedCharacters().find((candidate) => candidate.id === formData.actorId);
  if (!actor) throw new Error(localize("CMT.Gathering.SelectCharacter"));
  const region = gatheringRegion(actor, config);
  const recipientResolution = gatheringRecipient(actor, config);
  if (recipientResolution.missingParty) throw new Error(localize("CMT.Gathering.PartyMissing"));
  const recipient = recipientResolution.recipient;
  const environmentSource = GATHERING_ENVIRONMENT_SOURCES.find((entry) => entry.id === formData.environmentId);
  const taskSource = GATHERING_TASK_SOURCES.find((entry) => entry.id === formData.taskId);
  if (!environmentSource || !taskSource) throw new Error(localize("CMT.Gathering.SelectTask"));
  const availableEnvironmentIds = region.active
    ? region.environmentIds
    : [config.gathering?.environmentId];
  if ((region.active || !game.user.isGM) && !availableEnvironmentIds.includes(environmentSource.id)) {
    throw new Error(localize("CMT.Gathering.EnvironmentUnavailable"));
  }
  if (taskSource.tier > region.maxTier) {
    throw new Error(localize("CMT.Gathering.TierUnavailable"));
  }

  const documents = await resourceDocuments();
  const materialEnabled = config.materials?.[taskSource.materialId]?.enabled !== false;
  const evaluation = evaluateGatheringTask(taskSource, {
    environment: environmentSource,
    resources: documents,
    materialEnabled,
    sceneUuid: currentSceneUuid(),
  });
  if (!evaluation.available) {
    throw new Error(format("CMT.Gathering.Unavailable", {
      reasons: evaluation.warnings.join(", "),
    }, `This gathering task is unavailable: ${evaluation.warnings.join(", ")}.`));
  }

  const statistic = actor.getStatistic?.(evaluation.task.check.skill);
  if (!statistic?.roll) throw new Error(localize("CMT.Gathering.SkillUnavailable"));
  const roll = await statistic.roll({
    event,
    dc: evaluation.check.dc,
    title: format("CMT.Gathering.RollTitle", { actor: actor.name, task: evaluation.task.name }),
    label: evaluation.task.name,
    extraRollOptions: [
      "action:gather",
      `action:gather:${evaluation.task.materialId}`,
      `wrathmaker:gathering:tier:${evaluation.task.tier}`,
    ],
  });
  if (!roll) return null;
  const degree = normalizeDegreeOfSuccess(roll.degreeOfSuccess ?? roll.options?.degreeOfSuccess);
  const resolution = resolveGatheringOutcome(evaluation.task, degree, evaluation.resource);
  const resource = evaluation.resource;
  if (resolution.quantity > 0) await grantGatheringResource(recipient, resource, resolution.quantity);
  await postGatheringResult({ actor, recipient, task: evaluation.task, evaluation, resource, resolution, roll });
  application.gatheringState.lastResult = {
    actorName: actor.name,
    recipientName: recipient.name,
    outcome: outcomeLabel(resolution.outcome),
    quantity: resolution.quantity,
    resourceName: resource.name,
    units: resolution.units,
  };
  ui.notifications.info(resolution.quantity > 0
    ? format("CMT.Gathering.Awarded", {
      actor: recipient.name,
      quantity: resolution.quantity,
      resource: resource.name,
    })
    : format("CMT.Gathering.NoAward", { actor: actor.name }));
  return resolution;
}

function applicationContext(application) {
  const config = application.getConfig();
  const actors = ownedCharacters();
  application.gatheringState.actorId = actors.some((actor) => actor.id === application.gatheringState.actorId)
    ? application.gatheringState.actorId
    : actors[0]?.id ?? "";
  const actor = actors.find((entry) => entry.id === application.gatheringState.actorId) ?? null;
  const region = gatheringRegion(actor, config);
  const recipientResolution = gatheringRecipient(actor, config);
  const enabledTasks = GATHERING_TASK_SOURCES.filter((task) => (
    config.materials?.[task.materialId]?.enabled !== false
    && task.tier <= region.maxTier
  ));
  const visibleEnvironmentSources = region.active
    ? GATHERING_ENVIRONMENT_SOURCES.filter((environment) => region.environmentIds.includes(environment.id))
    : game.user.isGM
    ? GATHERING_ENVIRONMENT_SOURCES
    : GATHERING_ENVIRONMENT_SOURCES.filter((environment) => environment.id === config.gathering?.environmentId);
  const environments = visibleEnvironmentSources
    .map((source) => normalizeGatheringEnvironment(source))
    .filter((environment) => environment.enabled && listTasksForEnvironment(environment, enabledTasks).length > 0);

  application.gatheringState.environmentId = environments.some((entry) => entry.id === application.gatheringState.environmentId)
    ? application.gatheringState.environmentId
    : environments[0]?.id ?? "";
  const environment = environments.find((entry) => entry.id === application.gatheringState.environmentId) ?? null;
  const tasks = environment ? listTasksForEnvironment(environment, enabledTasks) : [];
  application.gatheringState.taskId = tasks.some((task) => task.id === application.gatheringState.taskId)
    ? application.gatheringState.taskId
    : tasks[0]?.id ?? "";
  const task = tasks.find((entry) => entry.id === application.gatheringState.taskId) ?? null;
  const resource = task ? findGatheringResource(task, CRAFTING_RESOURCE_SOURCES) : null;
  const evaluation = task ? evaluateGatheringTask(task, {
    environment,
    resources: CRAFTING_RESOURCE_SOURCES,
    materialEnabled: config.materials?.[task.materialId]?.enabled !== false,
    sceneUuid: currentSceneUuid(),
  }) : null;
  const resourceData = resource ? getCraftingResourceData(resource) : null;

  return {
    gatheringEnabled: config.gathering?.enabled !== false,
    actors: actors.map((actor) => ({
      id: actor.id,
      name: actor.name,
      img: actor.img,
      selected: actor.id === application.gatheringState.actorId,
    })),
    environments: environments.map((entry) => ({
      ...entry,
      selected: entry.id === application.gatheringState.environmentId,
    })),
    region: {
      ...region,
      levelLabel: region.level ? `Level ${region.level}` : localize("CMT.Gathering.ManualTierFallback"),
      tierLabel: `Tier ${region.maxTier}`,
    },
    environment,
    tasks: tasks.map((entry) => ({
      ...entry,
      optionLabel: `${entry.name} — Tier ${entry.tier}`,
      selected: entry.id === application.gatheringState.taskId,
    })),
    task: task ? {
      ...task,
      skillLabel: task.check.skill.replace(/(^|-)([a-z])/gu, (_match, separator, letter) => `${separator}${letter.toUpperCase()}`),
      dc: evaluation.check.dc,
      level: evaluation.check.level,
      successQuantity: task.yields.success,
      criticalSuccessQuantity: task.yields.criticalSuccess,
    } : null,
    resource: resource ? {
      name: resource.name,
      img: resource.img,
      unitsPerItem: resourceData.unitsPerItem,
      unit: resourceData.unit.replaceAll("-", " "),
    } : null,
    rewardDestinationLabel: GATHERING_REWARD_DESTINATIONS[recipientResolution.destination],
    rewardRecipientName: recipientResolution.recipient?.name ?? "",
    rewardTargetAvailable: !recipientResolution.missingParty,
    canAttempt: config.gathering?.enabled !== false
      && actors.length > 0
      && evaluation?.available === true
      && !recipientResolution.missingParty,
    lastResult: application.gatheringState.lastResult,
  };
}

export function createGatheringApplication(getConfig) {
  const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

  return class WrathmakerGathering extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-gathering`,
      classes: [MODULE_ID, "cmt-gathering-app"],
      tag: "form",
      position: { width: 720, height: 700 },
      window: {
        icon: "fa-solid fa-basket-shopping",
        title: "CMT.Gathering.Title",
        resizable: true,
      },
      form: {
        closeOnSubmit: false,
        handler: this.submitGathering,
      },
    };

    static PARTS = {
      main: { template: `modules/${MODULE_ID}/templates/gathering.hbs` },
    };

    constructor(options = {}) {
      super(options);
      this.getConfig = getConfig;
      this.gatheringState = {
        actorId: options.actorId ?? "",
        environmentId: options.environmentId ?? "",
        taskId: options.taskId ?? "",
        lastResult: null,
      };
    }

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      return { ...context, ...applicationContext(this) };
    }

    _onRender(context, options) {
      super._onRender(context, options);
      const root = rootElement(this.element);
      for (const field of ["actorId", "environmentId", "taskId"]) {
        root?.querySelector(`[name="${field}"]`)?.addEventListener("change", async (event) => {
          this.gatheringState[field] = event.currentTarget.value;
          if (field === "environmentId") this.gatheringState.taskId = "";
          this.gatheringState.lastResult = null;
          await this.render({ force: true });
        });
      }
    }

    static async submitGathering(event, _form, formData) {
      try {
        this.gatheringState.actorId = formData.object.actorId ?? "";
        this.gatheringState.environmentId = formData.object.environmentId ?? "";
        this.gatheringState.taskId = formData.object.taskId ?? "";
        await attemptGathering(this, formData.object, event);
        await this.render({ force: true });
      } catch (error) {
        console.error(`${MODULE_ID} | Gathering attempt failed.`, error);
        ui.notifications.error(error.message);
      }
    }
  };
}

export function registerGathering(getConfig) {
  GatheringApplication = createGatheringApplication(getConfig);
  Hooks.on("renderItemDirectory", (_application, element) => {
    if (getConfig().gathering?.enabled === false) return;
    const root = rootElement(element);
    if (!root || root.querySelector("[data-cmt-open-gathering]")) return;
    const actions = root.querySelector(".directory-header .header-actions, .directory-header .action-buttons, .directory-header");
    if (!actions) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cmt-open-gathering";
    button.dataset.cmtOpenGathering = "true";
    button.innerHTML = `<i class="fa-solid fa-basket-shopping" aria-hidden="true"></i> ${localize("CMT.Gathering.Open")}`;
    button.addEventListener("click", () => openGatheringApplication());
    actions.append(button);
  });
  return GatheringApplication;
}

export function openGatheringApplication(options = {}) {
  if (!GatheringApplication) throw new Error("Wrathmaker gathering has not been initialized.");
  const application = new GatheringApplication(options);
  application.render({ force: true });
  return application;
}
