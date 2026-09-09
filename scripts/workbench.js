import { MODULE_ID } from "./constants.js";
import { validateUpgradeItem, retainedUpgradeMarks, buildUpgradePlan, upgradeSnapshot, selectUpgradeComponentTiers, retainedMaterialHistory } from "./upgrades.js";
import { assertSingleFreeMark } from "../content/artisan-marks.js";
import { getRulesConfig } from "./config-store.js";
import { getCraftingResourceData } from "./crafting-categories.js";
import { evaluateCraftingRecipe } from "./crafting-recipes.js";
import {
  advanceCraftingProject,
  projectArtisanCount,
  artisanWorkRate,
  buildConsumptionPlan,
  completeCraftingProject,
  createCraftingProject,
  normalizeCraftingWorkbench,
  releaseCraftingProject,
  replaceProject,
  reservationLedger,
  reserveCraftingProject,
} from "./crafting-projects.js";
import {
  buildCraftingRecipeFromBand,
  compatibleRecipeBands,
  defaultProjectProgress,
  getCraftingRecipeBand,
} from "./recipe-catalog.js";
import { normalizeItemFlags } from "./model.js";
import { normalizeDegreeOfSuccess } from "./gathering-model.js";
import { renderWorkbenchGathering, bindWorkbenchGathering } from "./gathering.js";
import { validateArtisanTeam, chooseSecondaryMaterials, materialDisplayName } from "./workbench-team.js";
import { recoverProjectItem } from "./project-recovery.js";
import { buildDisassemblyPlan, disassembleProjectItem, findDisassemblyItem, droppedDisassemblyContext } from "./disassembly.js";
import { markAppliesToItem, markConfigurationChoices, markAutomationLabel } from "./artisan-mark-effects.js";
import {
  augmentRecipeWithArtisanMarks,
  buildArtisanMarkAssignment,
  buildRecipeAnchorSlots,
  calculateMarkLabourDays,
  evaluateArtisanMarkChoice,
  getArtisanProfile,
  selectedMarkCapacity,
} from "./artisan-marks.js";

let WorkbenchApplication = null;
const WORKBENCH_SOCKET = `module.${MODULE_ID}`;
const COMPLETION_REQUEST_TIMEOUT_MS = 30_000;
const pendingCompletionRequests = new Map();
const completionLocks = new Set();
let workbenchSocketInstalled = false;
const openWorkbenches = new Set();

function workbenchEnabled() {
  return getRulesConfig().crafting?.workbenchEnabled === true;
}

function requireWorkbench() {
  if (!workbenchEnabled()) throw new Error(localize("CMT.Workbench.FeatureDisabled"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

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

function partyActors() {
  const actors = Array.from(game.actors ?? []).filter((actor) => actor.type === "party");
  const active = game.actors?.party;
  if (active?.type === "party" && !actors.includes(active)) actors.unshift(active);
  return actors.sort((left, right) => left.name.localeCompare(right.name));
}

function partyMembers(party) {
  return Array.from(party?.members ?? []).map((member) => member.actor ?? member).filter(Boolean);
}

function userAuditIdentity() {
  return { id: game.user.id, name: game.user.name };
}

function canEditParty(party) {
  return party?.canUserModify?.(game.user, "update") === true;
}

function activePrimaryGM() {
  return Array.from(game.users ?? [])
    .filter((user) => user.isGM && user.active)
    .sort((left, right) => String(left.id).localeCompare(String(right.id)))[0] ?? null;
}

function projectState(party) {
  return normalizeCraftingWorkbench(party?.getFlag?.(MODULE_ID, "workbench"));
}

async function saveWorkbench(party, workbench) {
  requireWorkbench();
  if (!canEditParty(party)) throw new Error(localize("CMT.Workbench.NotEditable"));
  const normalized = normalizeCraftingWorkbench(workbench);
  await party.setFlag(MODULE_ID, "workbench", normalized);
  return normalized;
}

function materialLabel(materialId, tier = null) {
  const material = getRulesConfig().materials?.[materialId];
  if (!material) return materialDisplayName(materialId);
  if (tier && material.tierLabels?.[tier]) return material.tierLabels[tier];
  return material.label;
}

function virtualUnreservedInventory(party, projects, excludeProjectId = "") {
  const ledger = reservationLedger(projects, { excludeProjectId });
  return Array.from(party?.items ?? []).flatMap((item) => {
    const resource = getCraftingResourceData(item);
    if (!resource) return [];
    const quantity = Math.max(0, Math.trunc(Number(item.system?.quantity) || 0));
    const available = Math.max(0, quantity - (ledger.get(item.id) ?? 0));
    return [{
      id: item.id,
      _id: item.id,
      name: item.name,
      uuid: item.uuid,
      type: item.type,
      system: { quantity: available },
      flags: { [MODULE_ID]: { resource } },
    }];
  });
}

function degreeLabel(degree) {
  return localize(`CMT.Gathering.Outcomes.${degree}`, degree);
}

function currentWorldDate() {
  const worldTime = Number(game.time?.worldTime);
  if (!Number.isFinite(worldTime)) return "";
  try {
    return new Date(worldTime * 1000).toLocaleDateString();
  } catch (_error) {
    return "";
  }
}

async function resolveBaseItem(uuid) {
  if (!uuid || typeof globalThis.fromUuid !== "function") return null;
  const document = await fromUuid(uuid);
  return document?.documentName === "Item" ? document : null;
}

async function resolveActor(uuid) {
  if (!uuid || typeof globalThis.fromUuid !== "function") return null;
  const document = await fromUuid(uuid);
  return document?.documentName === "Actor" && ["character", "npc"].includes(document.type)
    ? document
    : null;
}

async function contributorProfiles(application) {
  const uuids = [...new Set(Array.isArray(application.workbenchState.contributorUuids)
    ? application.workbenchState.contributorUuids.filter(Boolean)
    : [])];
  const actors = (await Promise.all(uuids.map(resolveActor))).filter(Boolean);
  const profiles = actors.map(getArtisanProfile).filter((profile) => profile?.professions.length > 0);
  application.workbenchState.contributorUuids = profiles.map((profile) => profile.actorUuid);
  application.workbenchState.leadArtisanUuid = application.workbenchState.artisanSlots?.[0] ?? "";
  return profiles;
}

function reconcileMarkAssignments(application, profiles, recipe, itemGroup, coreTier, targetItem = null) {
  if (!recipe) {
    application.workbenchState.selectedMarks = [];
    return { assignments: [], anchorSlots: [], capacity: selectedMarkCapacity([], coreTier) };
  }
  const anchorSlots = buildRecipeAnchorSlots(recipe);
  const requested = Array.isArray(application.workbenchState.selectedMarks)
    ? application.workbenchState.selectedMarks
    : [];
  const retained = application.workbenchState.tab === "upgrade"
    ? retainedUpgradeMarks(targetItem, recipe, itemGroup, coreTier, application.workbenchState.rearrangement) : [];
  const assignments = [...retained];
  for (const choice of requested) {
    const profile = profiles.find((entry) => entry.actorUuid === choice.actorUuid);
    const mark = profile?.marks.find((entry) => entry.id === choice.definitionId);
    if (!profile || !mark) continue;
    const availability = evaluateArtisanMarkChoice(mark, {
      targetItem,
      itemGroup,
      coreTier,
      anchorSlots,
      capacityUsed: assignments.reduce((total, entry) => total + entry.capacityCost, 0),
      selectedDefinitionIds: assignments.map((entry) => entry.definitionId),
      selectedStackGroups: assignments.map((entry) => entry.stackGroup).filter(Boolean),
    });
    if (!availability.eligible) continue;
    const anchor = availability.anchors.find((entry) => entry.id === choice.anchorSlotId)
      ?? availability.anchors[0];
    if (!anchor) continue;
    const assignment = buildArtisanMarkAssignment(mark, profile, anchor, coreTier);
    const choices = markConfigurationChoices(mark.id);
    assignment.configuration = { choice: choices.includes(choice.configuration?.choice) ? choice.configuration.choice : choices[0] ?? "" };
    assignments.push(assignment);
  }
  application.workbenchState.selectedMarks = assignments.filter(a => !retained.includes(a)).map((assignment) => ({
    definitionId: assignment.definitionId,
    actorUuid: assignment.maker.actorUuid,
    anchorSlotId: assignment.anchorSlotIds[0],
    configuration: assignment.configuration,
  }));
  return { assignments, anchorSlots, capacity: selectedMarkCapacity(assignments, coreTier) };
}

function markTrayContext(profiles, assignments, anchorSlots, itemGroup, coreTier, leadArtisanUuid, targetItem = null) {
  const maximum = selectedMarkCapacity(assignments, coreTier).maximum;
  return profiles.map((profile) => {
    const marks = profile.marks.filter((mark) => markAppliesToItem(mark, itemGroup, targetItem)).map((mark) => {
      const selected = assignments.find((entry) => (
        entry.definitionId === mark.id && entry.maker?.actorUuid === profile.actorUuid
      ));
      const otherAssignments = assignments.filter((entry) => entry !== selected);
      const availability = evaluateArtisanMarkChoice(mark, {
        itemGroup,
        coreTier,
        anchorSlots,
        capacityUsed: otherAssignments.reduce((total, entry) => total + entry.capacityCost, 0),
        selectedDefinitionIds: otherAssignments.map((entry) => entry.definitionId),
        selectedStackGroups: otherAssignments.map((entry) => entry.stackGroup).filter(Boolean),
      });
      const chosenAnchorId = selected?.anchorSlotIds[0] ?? availability.defaultAnchorId;
      return {
        ...mark,
        automationLabel: markAutomationLabel(mark),
        configurationChoices: markConfigurationChoices(mark.id).map((value, index) => ({ value, selected: selected?.configuration?.choice === value || (!selected?.configuration?.choice && index === 0) })),
        gradeLabel: mark.grade[0].toUpperCase() + mark.grade.slice(1),
        selected: Boolean(selected),
        eligible: availability.eligible || Boolean(selected),
        reason: availability.reason,
        chosenAnchorId,
        anchors: availability.anchors.map((anchor) => ({
          ...anchor,
          selected: anchor.id === chosenAnchorId,
        })),
        materialSummary: mark.materialUnits > 0
          ? `${mark.materialUnits} unit${mark.materialUnits === 1 ? "" : "s"} of ${mark.requiredMaterialIds.map(id => materialLabel(id)).join(" or ")}`
          : "Workshop consumables only",
      };
    });
    return {
      actorUuid: profile.actorUuid,
      name: profile.name,
      img: profile.img,
      isLead: profile.actorUuid === leadArtisanUuid,
      professionSummary: profile.professions.map((entry) => entry.name).join(" · "),
      specializations: profile.specializations.map((entry) => ({
        ...entry,
        signature: entry.stages?.signature
          ? { name: entry.stages.signature.label, description: entry.stages.signature.description }
          : entry.features?.stages?.signature,
        mastery: entry.stages?.mastery
          ? { name: entry.stages.mastery.label, description: entry.stages.mastery.description }
          : entry.features?.stages?.mastery,
        legacy: entry.stages?.legacy
          ? { name: entry.stages.legacy.label, description: entry.stages.legacy.description }
          : entry.features?.stages?.legacy,
      })),
      availableMarks: marks.filter((mark) => mark.eligible),
      unavailableMarks: marks.filter((mark) => !mark.eligible),
      selectedCapacity: assignments
        .filter((entry) => entry.maker?.actorUuid === profile.actorUuid)
        .reduce((total, entry) => total + entry.capacityCost, 0),
      maximumCapacity: maximum,
    };
  });
}

function recipeGroupContext(group, config) {
  const options = group.options.map((option) => {
    const range = option.tierMode === "minimum" && option.maximumTier > option.tier
      ? `T${option.tier}–T${option.maximumTier}`
      : `T${option.tier}`;
    return {
      ...option,
      label: `${config.materials?.[option.materialId]?.label ?? option.materialId} ${range}`,
    };
  });
  return {
    id: group.id,
    label: group.label,
    available: options.some((option) => option.available),
    summary: options.map((option) => `${option.label}: ${option.owned}/${option.units}`).join(" or "),
  };
}

async function workbenchContext(application) {
  const config = getRulesConfig();
  const craftingEnabled = config.crafting?.enabled !== false;
  const parties = partyActors();
  application.workbenchState.partyId = parties.some((party) => party.id === application.workbenchState.partyId)
    ? application.workbenchState.partyId
    : game.actors?.party?.id ?? parties[0]?.id ?? "";
  const party = parties.find((entry) => entry.id === application.workbenchState.partyId) ?? null;
  const canEdit = canEditParty(party);
  const workbench = projectState(party);
  const baseItem = await resolveBaseItem(application.workbenchState.baseItemUuid);
  const recipeBands = baseItem ? compatibleRecipeBands(baseItem) : [];
  application.workbenchState.bandId = recipeBands.some((entry) => entry.id === application.workbenchState.bandId)
    ? application.workbenchState.bandId
    : recipeBands[0]?.id ?? "";
  const selectedBand = getCraftingRecipeBand(application.workbenchState.bandId);
  application.workbenchState.materialId = selectedBand?.coreMaterialIds.includes(application.workbenchState.materialId)
    ? application.workbenchState.materialId
    : selectedBand?.coreMaterialIds[0] ?? "";
  const tier = Math.min(6, Math.max(1, Math.trunc(Number(application.workbenchState.tier) || 1)));
  application.workbenchState.artisanSlots ??= Array.from({ length: 6 }, (_, i) => application.workbenchState.contributorUuids?.[i] ?? "");
  application.workbenchState.contributorUuids = application.workbenchState.artisanSlots.filter(Boolean);
  const profiles = await contributorProfiles(application);

  let recipe = null;
  let baseRecipe = null;
  let evaluation = null;
  let upgradeError = "";
  let markPlan = { assignments: [], anchorSlots: [], capacity: selectedMarkCapacity([], tier) };
  let requiredProgress = Math.max(1, Math.trunc(Number(application.workbenchState.requiredProgress) || 0));
  if (baseItem && selectedBand) {
    try {
      baseRecipe = buildCraftingRecipeFromBand(selectedBand.id, {
        targetItem: baseItem,
        tier,
        coreMaterialId: application.workbenchState.materialId,
      });
      chooseSecondaryMaterials(baseRecipe, application.workbenchState.secondaryMaterials ??= {});
      if (application.workbenchState.tab === "upgrade") selectUpgradeComponentTiers(baseRecipe, application.workbenchState.componentTiers);
      markPlan = reconcileMarkAssignments(application, profiles, baseRecipe, selectedBand.group, tier, baseItem);
      const newMarks = application.workbenchState.tab === "upgrade"
        ? markPlan.assignments.filter(m => m.status !== "completed") : markPlan.assignments;
      recipe = augmentRecipeWithArtisanMarks(baseRecipe, markPlan.assignments.map(m =>
        m.status === "completed" ? { ...m, materialUnits: 0 } : m));
      if (!application.workbenchState.requiredProgress) {
        requiredProgress = defaultProjectProgress(baseRecipe) + calculateMarkLabourDays(markPlan.assignments, tier);
      }
      if (application.workbenchState.tab === "upgrade") {
        const plan = buildUpgradePlan(baseItem, recipe, newMarks, application.workbenchState.upgradeDragon);
        recipe = plan.recipe;
        requiredProgress = plan.requiredProgress;
      }
      evaluation = evaluateCraftingRecipe(recipe, {
        targetItem: baseItem,
        inventoryItems: virtualUnreservedInventory(party, workbench.projects),
      });
    } catch (error) {
      upgradeError = error.message;
      console.warn(`${MODULE_ID} | Workbench recipe preview failed.`, error);
    }
  }

  const statusLabels = {
    draft: localize("CMT.Workbench.Status.Draft", "Draft"),
    reserved: localize("CMT.Workbench.Status.Reserved", "Reserved"),
    active: localize("CMT.Workbench.Status.Active", "In progress"),
    ready: localize("CMT.Workbench.Status.Ready", "Ready"),
    completed: localize("CMT.Workbench.Status.Completed", "Completed"),
    cancelled: localize("CMT.Workbench.Status.Cancelled", "Cancelled"),
  };
  const projects = workbench.projects
    .slice()
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .map((project) => ({
      ...project,
      recipeName: getCraftingRecipeBand(project.recipeBandId)?.label ?? project.recipe.name,
      coreLabel: `Tier ${project.coreTier} ${materialLabel(project.coreMaterialId, project.coreTier)}`,
      statusLabel: project.disassembledAt ? "Disassembled" : statusLabels[project.status] ?? project.status,
      statusClass: `is-${project.status}`,
      progressPercent: Math.round((project.currentProgress / project.requiredProgress) * 100),
      reservationCount: project.reservations.filter((entry) => entry.state === "reserved").length,
      contributorSummary: project.contributors.map((entry) => entry.name).join(", "),
      teamSize: projectArtisanCount(project),
      estimatedDays: Math.ceil((project.requiredProgress - project.currentProgress - project.teamworkRemainder) / artisanWorkRate(projectArtisanCount(project))),
      markCount: project.artisanMarks.length,
      canWork: craftingEnabled && canEdit && ["reserved", "active"].includes(project.status),
      canComplete: craftingEnabled && canEdit && project.status === "ready",
      canManage: canEdit,
      expanded: application.workbenchState.expandedProjectIds?.includes(project.id) === true,
      canArchive: canEdit && ["completed", "cancelled"].includes(project.status),
      canRecover: game.user.isGM && canEdit && project.status === "completed" && !project.disassembledAt && !project.supersededBy,
      canCancel: canEdit && !["completed", "cancelled"].includes(project.status),
    }));

  const preview = evaluation ? {
    craftable: evaluation.craftable,
    check: evaluation.check,
    requiredProgress,
    groups: evaluation.ingredientSets[0].groups.map((group) => recipeGroupContext(group, config)),
  } : null;

  const team = validateArtisanTeam(baseRecipe, application.workbenchState.artisanSlots, profiles);
  application.workbenchConfig = config;
  const gatheringHtml = application.workbenchState.tab === "gather" ? await renderWorkbenchGathering(application) : "";
  const activeProjectCount = projects.filter((project) => !["completed", "cancelled"].includes(project.status)).length;
  let droppedDisassembly = null;
  let disassemblyError = "";
  if (application.workbenchState.disassemblyItemUuid) {
    try {
      const item = await resolveBaseItem(application.workbenchState.disassemblyItemUuid);
      const owner = item?.actor ?? item?.parent;
      if (!item || (owner ? owner.canUserModify?.(game.user, "update") !== true : !game.user.isGM)) {
        throw new Error("You cannot dismantle this source item.");
      }
      const context = droppedDisassemblyContext(workbench, item, config);
      droppedDisassembly = { ...context.plan, sourceName: owner?.name ?? "World Items", canDisassemble: canEdit };
    } catch (error) { disassemblyError = error.message; }
  }
  return {
    party,
    droppedDisassembly, disassemblyError, upgradeError,
    upgradeDragonAvailable: baseItem?.type === "armor",
    upgradeDragonColors: Object.entries(config.materials["dragon-scale"].colors).map(([id, color]) => ({
      id, label: color.label, selected: application.workbenchState.upgradeDragon?.color === id,
    })),
    upgradeDragonTier: application.workbenchState.upgradeDragon?.tier ?? tier,
    upgradeAnchors: baseRecipe ? buildRecipeAnchorSlots(baseRecipe) : [],
    retainedMarks: application.workbenchState.tab === "upgrade" ? baseItem?.flags?.[MODULE_ID]?.crafting?.artisanMarks ?? [] : [],
    disassemblyItems: workbench.projects.filter(project => project.status === "completed" && !project.disassembledAt)
      .map(project => {
        const item = findDisassemblyItem(party, project);
        if (!item) return null;
        try { return { ...buildDisassemblyPlan(project, item), canDisassemble: canEdit }; }
        catch (error) { return { projectId: project.id, itemName: item.name, error: error.message, canDisassemble: false }; }
      }).filter(Boolean),
    gatheringHtml,
    teamReasons: baseRecipe ? team.reasons : [],
    artisanSlots: team.slots.map((slot) => ({ ...slot, marks: markPlan.assignments.filter((mark) => mark.maker.actorUuid === slot.actorUuid) })),
    secondaryMaterials: (selectedBand?.secondaries ?? []).filter((entry) => !entry.optional).map((entry) => ({
      upgradeTier: application.workbenchState.componentTiers?.[entry.id] ?? Math.max(1, tier - 2),
      id: entry.id, label: entry.label, options: entry.materialIds.map((id) => ({ id, label: config.materials?.[id]?.label ?? id, selected: application.workbenchState.secondaryMaterials?.[entry.id] === id })),
    })),
    showArchived: application.workbenchState.showArchived === true,
    archivedCount: projects.filter((entry) => entry.archived).length,
    canEdit,
    craftingEnabled,
    worldDate: currentWorldDate(),
    parties: parties.map((entry) => ({ id: entry.id, name: entry.name, selected: entry.id === party?.id })),
    tabs: {
      craft: ["craft", "upgrade"].includes(application.workbenchState.tab),
      upgrade: application.workbenchState.tab === "upgrade",
      gather: application.workbenchState.tab === "gather",
      projects: application.workbenchState.tab === "projects",
      disassemble: application.workbenchState.tab === "disassemble",
    },
    baseItem: baseItem ? {
      name: baseItem.name,
      img: baseItem.img,
      categoryLabel: evaluation?.targetCategory?.label ?? localize("CMT.Workbench.EligibleItem", "Eligible PF2e item"),
    } : null,
    recipeBands: recipeBands.map((entry) => ({ ...entry, selected: entry.id === selectedBand?.id })),
    selectedBand,
    coreMaterials: (selectedBand?.coreMaterialIds ?? []).map((materialId) => ({
      id: materialId,
      label: config.materials?.[materialId]?.label ?? materialId,
      selected: materialId === application.workbenchState.materialId,
    })),
    tiers: [1, 2, 3, 4, 5, 6].map((value) => ({
      value,
      label: config.materials?.[application.workbenchState.materialId]?.tierLabels?.[value]
        ?? config.tierLabels?.[value]
        ?? `Tier ${value}`,
      selected: value === tier,
    })),
    contributors: profiles.map((profile) => ({
      actorUuid: profile.actorUuid,
      name: profile.name,
      img: profile.img,
      professionSummary: profile.professions.map((entry) => entry.name).join(" · "),
      isLead: profile.actorUuid === application.workbenchState.leadArtisanUuid,
    })),
    markTrays: selectedBand ? markTrayContext(
      profiles,
      markPlan.assignments,
      markPlan.anchorSlots,
      selectedBand.group,
      tier,
      application.workbenchState.leadArtisanUuid,
      baseItem,
    ) : [],
    selectedMarks: markPlan.assignments,
    markCapacity: {
      ...markPlan.capacity,
      segments: Array.from({ length: markPlan.capacity.maximum }, (_value, index) => ({
        used: index < markPlan.capacity.used,
      })),
    },
    markLabourDays: calculateMarkLabourDays(markPlan.assignments, tier),
    teamSize: Math.max(1, new Set(profiles.map(profile => profile.actorUuid)).size),
    estimatedDays: Math.ceil(requiredProgress / artisanWorkRate(new Set(profiles.map(profile => profile.actorUuid)).size)),
    draft: {
      name: application.workbenchState.projectName || (baseItem ? `${materialLabel(application.workbenchState.materialId, tier)} ${baseItem.name}` : ""),
      requiredProgress,
    },
    preview,
    canCreate: Boolean(
      craftingEnabled
      && canEdit
      && baseItem
      && selectedBand
      && team.valid
      && profiles.length
      && application.workbenchState.leadArtisanUuid
      && preview?.craftable
      && !markPlan.capacity.overCapacity
    ),
    projects: projects.filter((entry) => application.workbenchState.showArchived ? entry.archived : !entry.archived),
    projectCount: projects.length,
    activeProjectCount,
  };
}

async function createAndReserve(application) {
  requireWorkbench();
  const party = partyActors().find((entry) => entry.id === application.workbenchState.partyId);
  const baseItem = await resolveBaseItem(application.workbenchState.baseItemUuid);
  const band = getCraftingRecipeBand(application.workbenchState.bandId);
  application.workbenchState.artisanSlots ??= Array.from({ length: 6 }, (_, i) => application.workbenchState.contributorUuids?.[i] ?? "");
  application.workbenchState.contributorUuids = application.workbenchState.artisanSlots.filter(Boolean);
  const profiles = await contributorProfiles(application);
  const lead = profiles.find((entry) => entry.actorUuid === application.workbenchState.leadArtisanUuid);
  if (!party || !baseItem || !band || !lead) throw new Error(localize("CMT.Workbench.IncompleteProject"));
  const baseRecipe = buildCraftingRecipeFromBand(band.id, {
    targetItem: baseItem,
    tier: application.workbenchState.tier,
    coreMaterialId: application.workbenchState.materialId,
  });
  chooseSecondaryMaterials(baseRecipe, application.workbenchState.secondaryMaterials ??= {});
  if (application.workbenchState.tab === "upgrade") selectUpgradeComponentTiers(baseRecipe, application.workbenchState.componentTiers);
  const team = validateArtisanTeam(baseRecipe, application.workbenchState.artisanSlots, profiles);
  if (!team.valid) throw new Error(team.reasons.join(" "));
  const markPlan = reconcileMarkAssignments(
    application,
    profiles,
    baseRecipe,
    band.group,
    application.workbenchState.tier,
    baseItem,
  );
  const upgrading = application.workbenchState.tab === "upgrade";
  const newMarks = upgrading ? markPlan.assignments.filter(m => m.status !== "completed") : markPlan.assignments;
  let recipe = augmentRecipeWithArtisanMarks(baseRecipe, markPlan.assignments.map(m =>
    upgrading && m.status === "completed" ? { ...m, materialUnits: 0 } : m));
  const workbench = projectState(party);
  let upgrade = null;
  if (upgrading) {
    validateUpgradeItem(baseItem, partyActors().flatMap(p => projectState(p).projects));
    upgrade = buildUpgradePlan(baseItem, recipe, newMarks, application.workbenchState.upgradeDragon);
    recipe = upgrade.recipe;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Confirm Upgrade" },
      content: "<p>Replace " + upgrade.replaced.map(escapeHtml).join(", ") +
        ". Old materials are lost. Replacement materials and component work cost 25% less; new Marks cost full price. The original item is updated on completion.</p>",
      modal: true,
    });
    if (!confirmed) return;
  }
  let project = createCraftingProject({
    upgrade,
    name: application.workbenchState.projectName || `${materialLabel(application.workbenchState.materialId, application.workbenchState.tier)} ${baseItem.name}`,
    partyUuid: party.uuid,
    baseItemUuid: baseItem.uuid,
    baseItemName: baseItem.name,
    baseItemImg: baseItem.img,
    recipeBandId: band.id,
    recipe,
    coreMaterialId: application.workbenchState.materialId,
    coreTier: application.workbenchState.tier,
    leadArtisanUuid: lead.actorUuid,
    leadArtisanName: lead.name,
    contributors: profiles.map((profile) => ({
      actorUuid: profile.actorUuid,
      actorId: profile.actorId,
      slotIndex: application.workbenchState.artisanSlots.indexOf(profile.actorUuid),
      name: profile.name,
      img: profile.img,
      professionIds: profile.professions.map((profession) => profession.id),
      specializations: profile.specializations.map((specialty) => ({
        professionId: specialty.professionId,
        specializationId: specialty.specializationId,
        name: specialty.name,
      })),
    })),
    artisanMarks: markPlan.assignments,
    requiredProgress: upgrade?.requiredProgress || application.workbenchState.requiredProgress
      || defaultProjectProgress(baseRecipe) + calculateMarkLabourDays(markPlan.assignments, application.workbenchState.tier),
  }, userAuditIdentity());
  project = reserveCraftingProject(project, {
    inventoryItems: party.items,
    otherProjects: workbench.projects,
    user: userAuditIdentity(),
  });
  if (upgrade && !await baseItem.update({ ["flags." + MODULE_ID + ".upgradeProject"]: project.id }))
    throw new Error("The item could not be reserved for upgrading.");
  try {
    await saveWorkbench(party, replaceProject(workbench, project));
  } catch (error) {
    if (upgrade) await baseItem.update({ ["flags." + MODULE_ID + ".-=upgradeProject"]: null }, { wrathmakerUpgrade: true });
    throw error;
  }
  application.workbenchState.tab = "projects";
  application.workbenchState.projectName = "";
  application.workbenchState.selectedMarks = [];
  ui.notifications.info(format("CMT.Workbench.ProjectCreated", { project: project.name }, `${project.name} was created and its resources were reserved.`));
}

async function rollWorkBlock(application, projectId, days, event) {
  requireWorkbench();
  const party = partyActors().find((entry) => entry.id === application.workbenchState.partyId);
  const workbench = projectState(party);
  const project = workbench.projects.find((entry) => entry.id === projectId);
  if (!project) throw new Error(localize("CMT.Workbench.ProjectMissing"));
  const artisan = await fromUuid(project.leadArtisanUuid);
  const statistic = artisan?.getStatistic?.("crafting");
  if (!statistic?.roll) throw new Error(localize("CMT.Workbench.CraftingUnavailable"));
  const dc = project.recipe.check ? evaluateCraftingRecipe(project.recipe, {
    targetItem: await resolveBaseItem(project.baseItemUuid),
    inventoryItems: party.items,
  }).check.dc : null;
  const progressBefore = project.currentProgress;
  const roll = await statistic.roll({
    event,
    dc,
    title: `${project.name} — Work Block`,
    label: project.name,
    extraRollOptions: ["action:craft", "wrathmaker:crafting", `wrathmaker:crafting:tier:${project.coreTier}`],
  });
  if (!roll) return;
  const degree = normalizeDegreeOfSuccess(roll.degreeOfSuccess ?? roll.options?.degreeOfSuccess);
  const updated = advanceCraftingProject(project, {
    days,
    degree,
    rollTotal: Number(roll.total),
    dc,
    artisanUuid: artisan.uuid,
    artisanName: artisan.name,
    user: userAuditIdentity(),
  });
  await saveWorkbench(party, replaceProject(workbench, updated));
  const content = await renderTemplate(`modules/${MODULE_ID}/templates/crafting-work-chat.hbs`, {
    projectName: project.name,
    artisanName: artisan.name,
    days,
    rollTotal: Number(roll.total),
    dc,
    degreeLabel: degreeLabel(degree),
    progressBefore,
    progressAfter: updated.currentProgress,
    requiredProgress: updated.requiredProgress,
    ready: updated.status === "ready",
  });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: artisan }), content });
  ui.notifications.info(updated.status === "ready"
    ? format("CMT.Workbench.ProjectReady", { project: updated.name }, `${updated.name} is ready to complete.`)
    : format("CMT.Workbench.ProgressSaved", { project: updated.name }, `${updated.name} progress was saved.`));
}

function cloneItemSource(document) {
  const source = typeof document?.toObject === "function" ? document.toObject() : clone(document);
  delete source._id;
  delete source.folder;
  delete source.ownership;
  delete source._stats;
  return source;
}

export function buildCompletedItemSource(current, baseItem, config = getRulesConfig()) {
  const source = cloneItemSource(baseItem);
  source.system ??= {};
  source.system.quantity = current.recipe.result.quantity;
  source.flags ??= {};
  const priorFlags = source.flags[MODULE_ID] ?? {};
  const componentGroups = new Map();
  for (const reservation of current.reservations.filter((entry) => entry.groupId !== "core")) {
    const key = `${reservation.groupId}|${reservation.materialId}|${reservation.tier}|${reservation.variantId}`;
    const isMarkMaterial = reservation.groupId.startsWith("mark-");
    const component = componentGroups.get(key) ?? {
      id: reservation.groupId,
      name: reservation.groupLabel,
      classification: isMarkMaterial ? "special-treatment" : "required-secondary",
      slotType: isMarkMaterial ? "artisan-mark-material" : reservation.groupId,
      materialId: reservation.materialId,
      tier: reservation.tier,
      quantityRequired: 0,
      quantityCommitted: 0,
      structural: !isMarkMaterial,
      tags: [reservation.materialId, `tier-${reservation.tier}`],
      contributor: null,
    };
    component.quantityRequired += reservation.units;
    component.quantityCommitted += reservation.units;
    componentGroups.set(key, component);
  }
  const tierForAnchor = (anchorId) => {
    if (anchorId === "core") return current.coreTier;
    const tiers = current.reservations
      .filter((reservation) => reservation.groupId === anchorId)
      .map((reservation) => reservation.tier);
    return tiers.length ? Math.min(...tiers) : priorFlags.crafting?.components?.find(c => (c.slotType || c.id) === anchorId)?.tier ?? 1;
  };
  const completedMarks = current.artisanMarks.map((mark) => ({
    ...mark,
    status: "completed",
    effectiveMarkTier: Math.min(
      current.coreTier,
      ...mark.anchorSlotIds.map(tierForAnchor),
    ),
  }));
  const crafting = {
    ...(priorFlags.crafting ?? {}),
    core: {
      ...(priorFlags.crafting?.core ?? {}),
      materialId: current.coreMaterialId,
      tier: current.coreTier,
      resourceName: materialLabel(current.coreMaterialId, current.coreTier),
      quantityRequired: current.reservations
        .filter((entry) => entry.groupId === "core")
        .reduce((total, entry) => total + entry.units, 0),
      quantityCommitted: current.reservations
        .filter((entry) => entry.groupId === "core")
        .reduce((total, entry) => total + entry.units, 0),
      contributor: {
        actorUuid: current.leadArtisanUuid,
        name: current.leadArtisanName,
      },
    },
    components: [
      ...(priorFlags.crafting?.components ?? []).filter((component) => (
        ["optional", "special-treatment"].includes(component.classification)
      )),
      ...componentGroups.values(),
    ],
    artisanMarks: [
      ...(priorFlags.crafting?.artisanMarks ?? []).filter((existing) => (
        !completedMarks.some((mark) => mark.definitionId === existing.definitionId)
      )),
      ...completedMarks,
    ],
    provenance: [
      ...(priorFlags.crafting?.provenance ?? []),
      {
        projectId: current.id,
        projectName: current.name,
        artisanUuid: current.leadArtisanUuid,
        artisanName: current.leadArtisanName,
        completedAt: current.completedAt ?? Date.now(),
        downtimeSpent: current.downtimeSpent,
        contributors: current.contributors.map((contributor) => ({
          actorUuid: contributor.actorUuid,
          name: contributor.name,
          professionIds: contributor.professionIds,
        })),
        artisanMarks: completedMarks.map((mark) => ({
          definitionId: mark.definitionId,
          name: mark.name,
          maker: mark.maker,
          anchorSlotIds: mark.anchorSlotIds,
          effectiveMarkTier: mark.effectiveMarkTier,
        })),
      },
    ],
  };
  assertSingleFreeMark(crafting.artisanMarks);
  source.flags[MODULE_ID] = normalizeItemFlags({
    ...priorFlags,
    material: current.coreMaterialId,
    tier: current.coreTier,
    crafting,
  }, config);
  if (current.upgrade) {
    const result = source.flags[MODULE_ID].crafting;
    if (!current.upgrade.replaced.includes("core")) result.core = priorFlags.crafting.core;
    result.components = [
      ...(priorFlags.crafting.components ?? []).filter(c => !current.upgrade.replaced.includes(c.slotType || c.id)),
      ...componentGroups.values(),
    ];
    source.name = baseItem.name;
    if (current.upgrade.dragonScale?.color) source.flags[MODULE_ID].dragonScale = {
      ...current.upgrade.dragonScale,
      unitsCommitted: current.reservations.filter(r => r.groupId === "dragon-scale").reduce((n, r) => n + r.units, 0)
        || priorFlags.dragonScale?.unitsCommitted || 0,
    };
    delete source.flags[MODULE_ID].upgradeProject;
  }
  return source;
}

async function completeProjectTransaction(party, projectId, auditUser) {
  requireWorkbench();
  const workbench = projectState(party);
  const current = workbench.projects.find((entry) => entry.id === projectId);
  if (!current) throw new Error(localize("CMT.Workbench.ProjectMissing"));
  const freshPlan = buildConsumptionPlan(current, party.items);
  const baseItem = await resolveBaseItem(current.baseItemUuid);
  if (!baseItem) throw new Error(localize("CMT.Workbench.BaseItemMissing"));
  if (current.upgrade && upgradeSnapshot(baseItem) !== current.upgrade.originalSnapshot)
    throw new Error("The original item changed. Cancel this upgrade and review a fresh project.");
  const source = buildCompletedItemSource(current, baseItem);
  const originalSource = current.upgrade ? baseItem.toObject() : null;
  if (current.upgrade && !baseItem.testUserPermission(game.users?.get(auditUser.id) ?? game.user, "OWNER"))
    throw new Error("The requesting player no longer owns the upgrade item.");

  const consumeUpdates = freshPlan.map((entry) => ({ _id: entry.itemId, "system.quantity": entry.afterQuantity }));
  const rollbackUpdates = freshPlan.map((entry) => ({ _id: entry.itemId, "system.quantity": entry.beforeQuantity }));
  let created = null;
  requireWorkbench();
  try {
    await party.updateEmbeddedDocuments("Item", consumeUpdates);
    if (current.upgrade) {
      const updated = await baseItem.update({ ...source, ["flags." + MODULE_ID + ".-=upgradeProject"]: null }, { wrathmakerUpgrade: true });
      if (!updated) throw new Error("The item update was rejected; no materials should be consumed.");
      created = baseItem;
    } else [created] = await party.createEmbeddedDocuments("Item", [source]);
    if (!created?.uuid) throw new Error("Foundry did not create the completed item.");
    const completed = completeCraftingProject(current, {
      finalItemUuid: created?.uuid ?? "",
      finalItemSource: source,
      user: auditUser,
    });
    if (current.upgrade) completed.reservations.push(...retainedMaterialHistory(
      { flags: originalSource.flags }, current.upgrade.replaced));
    const next = replaceProject(workbench, completed);
    if (current.upgrade) {
      for (const previous of next.projects) {
        if (previous.id !== current.id && (previous.finalItemUuid === baseItem.uuid ||
          originalSource.flags?.[MODULE_ID]?.crafting?.provenance?.some(p => p.projectId === previous.id)))
          previous.supersededBy = current.id;
      }
    }
    await saveWorkbench(party, next);
  } catch (error) {
    try {
      if (current.upgrade) await baseItem.update(originalSource, { wrathmakerUpgrade: true, diff: false, recursive: false });
      else if (created) await party.deleteEmbeddedDocuments("Item", [created.id]);
      await party.updateEmbeddedDocuments("Item", rollbackUpdates);
    } catch (rollbackError) {
      console.error(`${MODULE_ID} | Workbench completion rollback failed.`, rollbackError);
    }
    throw error;
  }
  const depletedItemIds = freshPlan.filter((entry) => entry.afterQuantity === 0).map((entry) => entry.itemId);
  if (depletedItemIds.length) {
    try {
      await party.deleteEmbeddedDocuments("Item", depletedItemIds);
    } catch (error) {
      // A zero-quantity stack is already fully consumed. Failure to clean up its
      // empty row must not duplicate the output or roll the completed project back.
      console.warn(`${MODULE_ID} | Empty resource stacks could not be removed.`, error);
    }
  }
  return { projectId: current.id, projectName: current.name, finalItemUuid: created?.uuid ?? "" };
}

async function recoverFinishedItem(application, projectId) {
  requireWorkbench();
  if (!game.user.isGM) throw new Error("Only a GM can recover a project item.");
  const primaryGM = activePrimaryGM();
  if (primaryGM && primaryGM.id !== game.user.id) {
    throw new Error(`Ask ${primaryGM.name}, the active primary GM, to recover this item.`);
  }
  const party = partyActors().find(entry => entry.id === application.workbenchState.partyId);
  if (!party) throw new Error("Choose the project's party.");
  const project = projectState(party).projects.find(entry => entry.id === projectId);
  if (!project || project.status !== "completed") throw new Error("Only completed projects can recover an item.");
  const legacyNotice = project.finalItemSource ? "" : "<p>This older project will be rebuilt from its original base item and saved crafting data.</p>";
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: "Recover finished item" },
    content: "<p>Create a replacement in the Party Stash if the original item is missing? This costs no resources or downtime.</p>" + legacyNotice,
  });
  if (!confirmed) return;
  requireWorkbench();
  await recoverProjectItem(party, projectId, {
    user: game.user, locks: completionLocks, loadWorkbench: projectState, saveWorkbench,
    findExisting: async (entry) => {
      if (entry.finalItemUuid && await resolveBaseItem(entry.finalItemUuid)) return true;
      const actors = [...Array.from(game.actors ?? []), ...Array.from(game.scenes ?? []).flatMap(scene =>
        Array.from(scene.tokens ?? []).map(token => token.actor).filter(Boolean))];
      const items = [...Array.from(game.items ?? []), ...actors.flatMap(actor => Array.from(actor.items ?? []))];
      return items.some(item => item.flags?.[MODULE_ID]?.crafting?.provenance?.some(record => record.projectId === entry.id));
    },
    buildLegacySource: async (entry) => {
      const base = await resolveBaseItem(entry.baseItemUuid);
      if (!base) throw new Error("The original base item is missing and this older project has no saved output snapshot.");
      return buildCompletedItemSource(entry, base);
    },
  });
  ui.notifications.info("Finished item recovered into the Party Stash. No resources were consumed.");
}

async function runCompletionWithLock(party, projectId, auditUser) {
  requireWorkbench();
  // Lock the whole Party Stash, not only one project. Two different projects
  // can reserve different quantities from the same stack and must not calculate
  // their before/after values concurrently.
  const key = party.id;
  if (completionLocks.has(key)) throw new Error(localize("CMT.Workbench.CompletionInProgress"));
  completionLocks.add(key);
  try {
    return await completeProjectTransaction(party, projectId, auditUser);
  } finally {
    completionLocks.delete(key);
  }
}

function requestGMProjectCompletion(party, projectId, disassemblySignature = null, itemUuid = null) {
  const gm = activePrimaryGM();
  if (!gm) return Promise.reject(new Error(localize("CMT.Workbench.NoActiveGM")));
  const requestId = foundry.utils.randomID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingCompletionRequests.delete(requestId);
      reject(new Error(localize("CMT.Workbench.CompletionTimeout")));
    }, COMPLETION_REQUEST_TIMEOUT_MS);
    pendingCompletionRequests.set(requestId, { resolve, reject, timeout, gmId: gm.id });
    game.socket.emit(WORKBENCH_SOCKET, {
      type: disassemblySignature ? "disassemble-request" : "complete-request",
      disassemblySignature,
      itemUuid,
      requestId,
      gmId: gm.id,
      userId: game.user.id,
      partyId: party.id,
      projectId,
    });
  });
}

function settleCompletionResponse(payload) {
  if (payload?.type !== "complete-response" || payload.userId !== game.user.id) return false;
  const pending = pendingCompletionRequests.get(payload.requestId);
  if (!pending || pending.gmId !== payload.gmId) return true;
  clearTimeout(pending.timeout);
  pendingCompletionRequests.delete(payload.requestId);
  if (payload.ok) pending.resolve(payload.result ?? {});
  else pending.reject(new Error(payload.error || localize("CMT.Workbench.CompletionFailed")));
  return true;
}

async function handleCompletionRequest(payload) {
  const response = {
    type: "complete-response",
    requestId: payload.requestId,
    gmId: game.user.id,
    userId: payload.userId,
    ok: false,
  };
  try {
    const requestingUser = game.users?.get(payload.userId);
    const party = game.actors?.get(payload.partyId);
    if (!requestingUser || !party || party.type !== "party") {
      throw new Error(localize("CMT.Workbench.CompletionNotAllowed"));
    }
    if (party.canUserModify?.(requestingUser, "update") !== true) {
      throw new Error(localize("CMT.Workbench.CompletionNotAllowed"));
    }
    response.result = payload.type === "disassemble-request"
      ? await runDisassembly(party, payload.projectId, payload.disassemblySignature, payload.itemUuid, requestingUser)
      : await runCompletionWithLock(party, payload.projectId, {
        id: requestingUser.id,
        name: requestingUser.name,
      });
    response.ok = true;
  } catch (error) {
    console.error(`${MODULE_ID} | GM project completion failed.`, error);
    response.error = error?.message || localize("CMT.Workbench.CompletionFailed");
  }
  game.socket.emit(WORKBENCH_SOCKET, response);
}

function installWorkbenchSocket() {
  if (workbenchSocketInstalled) return;
  workbenchSocketInstalled = true;
  game.socket.on(WORKBENCH_SOCKET, (payload) => {
    if (settleCompletionResponse(payload)) return;
    if (!["complete-request", "disassemble-request"].includes(payload?.type) || !game.user.isGM) return;
    const primaryGM = activePrimaryGM();
    if (payload.gmId !== game.user.id || primaryGM?.id !== game.user.id) return;
    void handleCompletionRequest(payload);
  });
}

async function completeProject(application, projectId) {
  requireWorkbench();
  const { DialogV2 } = foundry.applications.api;
  const party = partyActors().find((entry) => entry.id === application.workbenchState.partyId);
  const workbench = projectState(party);
  const project = workbench.projects.find((entry) => entry.id === projectId);
  if (!project) throw new Error(localize("CMT.Workbench.ProjectMissing"));
  const plan = buildConsumptionPlan(project, party.items);
  const list = plan.map((entry) => `<li>${entry.itemName}: ${entry.beforeQuantity} → ${entry.afterQuantity}</li>`).join("");
  const confirmed = await DialogV2.confirm({
    window: { title: localize("CMT.Workbench.ConfirmTitle", "Complete Crafting Project") },
    content: `<p><strong>${project.name}</strong></p><p>${localize("CMT.Workbench.ConfirmConsumption")}</p><ul>${list}</ul>`,
    modal: true,
  });
  if (!confirmed) return;

  // The selected GM re-reads the project and Party Stash after confirmation,
  // then performs consumption, output creation, and audit updates as one guarded flow.
  const primaryGM = activePrimaryGM();
  const result = game.user.isGM && primaryGM?.id === game.user.id
    ? await runCompletionWithLock(party, projectId, userAuditIdentity())
    : await requestGMProjectCompletion(party, projectId);
  if (project.upgrade) {
    ui.notifications.info("Upgrade completed. The original item has been updated in its existing inventory.");
    return;
  }
  ui.notifications.info(format(
    "CMT.Workbench.ProjectCompleted",
    { project: result.projectName ?? project.name },
    `${result.projectName ?? project.name} was completed and added to the Party Stash.`,
  ));
}

async function runDisassembly(party, projectId, expectedSignature, itemUuid = null, requestingUser = game.user) {
  return disassembleProjectItem(party, projectId, {
    user: game.user, locks: completionLocks, loadWorkbench: projectState, requireEnabled: requireWorkbench,
    expectedSignature,
    itemUuid, requestingUser, resolveItem: resolveBaseItem, config: getRulesConfig(),
    saveWorkbench: (actor, state, options = {}) => options.rollback
      ? actor.setFlag(MODULE_ID, "workbench", normalizeCraftingWorkbench(state))
      : saveWorkbench(actor, state),
  });
}

async function confirmDisassembly(application, projectId, itemUuid = null) {
  requireWorkbench();
  const party = partyActors().find(entry => entry.id === application.workbenchState.partyId);
  if (!canEditParty(party)) throw new Error("You cannot modify this Party Stash.");
  const project = projectState(party).projects.find(entry => entry.id === projectId);
  const sourceItem = itemUuid ? await resolveBaseItem(itemUuid) : findDisassemblyItem(party, project);
  const plan = itemUuid ? droppedDisassemblyContext(projectState(party), sourceItem, getRulesConfig()).plan : buildDisassemblyPlan(project, sourceItem);
  const owner = sourceItem?.actor ?? sourceItem?.parent;
  if (itemUuid && (owner ? owner.canUserModify?.(game.user, "update") !== true : !game.user.isGM)) throw new Error("You cannot dismantle this source item.");
  const list = plan.returns.map(row => `<li>${escapeHtml(row.name)}: ${row.consumed} → ${row.quantity}</li>`).join("");
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: "Disassemble Item" }, modal: true,
    content: `<p>Permanently remove <strong>${escapeHtml(plan.itemName)}</strong> from ${escapeHtml(owner?.name ?? "the Party Stash / World Items")} and return these materials to the Party Stash?</p><p>${escapeHtml(plan.basis ?? "Recorded crafting materials")}</p><ul>${list}</ul><p>50% return, rounded up per material. Artisan Marks are destroyed. This item cannot be recreated with Recover Missing Item.</p>`,
  });
  if (!confirmed) return;
  requireWorkbench();
  const primaryGM = activePrimaryGM();
  if (game.user.isGM && primaryGM?.id === game.user.id) await runDisassembly(party, projectId, plan.signature, itemUuid);
  else await requestGMProjectCompletion(party, projectId, plan.signature, itemUuid);
  application.workbenchState.disassemblyItemUuid = "";
  ui.notifications.info("Item disassembled. Returned materials are in the Party Stash.");
}

async function cancelProject(application, projectId) {
  const { DialogV2 } = foundry.applications.api;
  const party = partyActors().find((entry) => entry.id === application.workbenchState.partyId);
  const workbench = projectState(party);
  const project = workbench.projects.find((entry) => entry.id === projectId);
  if (!project) throw new Error(localize("CMT.Workbench.ProjectMissing"));
  const confirmed = await DialogV2.confirm({
    window: { title: localize("CMT.Workbench.CancelProject") },
    content: `<p>${format("CMT.Workbench.ConfirmCancel", { project: project.name }, `Cancel ${project.name} and release its reservations?`)}</p>`,
    modal: true,
  });
  if (!confirmed) return;
  const cancelled = releaseCraftingProject(project, userAuditIdentity());
  let unlockedItem = null;
  if (project.upgrade) {
    const item = await resolveBaseItem(project.baseItemUuid);
    if (item) {
      if (!await item.update({ ["flags." + MODULE_ID + ".-=upgradeProject"]: null }, { wrathmakerUpgrade: true }))
        throw new Error("The item could not be unlocked. Ask its owner or the GM to cancel.");
      unlockedItem = item;
    }
  }
  try {
    await saveWorkbench(party, replaceProject(workbench, cancelled));
  } catch (error) {
    if (unlockedItem) await unlockedItem.update({ ["flags." + MODULE_ID + ".upgradeProject"]: project.id }, { wrathmakerUpgrade: true });
    throw error;
  }
  ui.notifications.info(format("CMT.Workbench.ProjectCancelled", { project: project.name }, `${project.name} was cancelled.`));
}

export function createWorkbenchApplication() {
  const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

  return class WrathmakerWorkbench extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-workbench`,
      classes: [MODULE_ID, "cmt-workbench-app"],
      tag: "form",
      position: { width: 900, height: 780 },
      window: {
        icon: "fa-solid fa-hammer",
        title: "CMT.Workbench.Title",
        resizable: true,
      },
    };

    static PARTS = {
      main: { template: `modules/${MODULE_ID}/templates/workbench.hbs` },
    };

    constructor(options = {}) {
      super(options);
      this.workbenchState = {
        partyId: options.partyId ?? "",
        tab: options.tab ?? "craft",
        baseItemUuid: options.baseItemUuid ?? "",
        bandId: options.bandId ?? "",
        materialId: options.materialId ?? "",
        tier: Number(options.tier) || 1,
        contributorUuids: Array.isArray(options.contributorUuids)
          ? [...options.contributorUuids]
          : options.artisanId ? [`Actor.${options.artisanId}`] : [],
        leadArtisanUuid: options.leadArtisanUuid ?? "",
        artisanSlots: Array.from({ length: 6 }, (_, i) => options.contributorUuids?.[i] ?? (i === 0 && options.artisanId ? `Actor.${options.artisanId}` : "")),
        secondaryMaterials: {},
        showArchived: false,
        expandedProjectIds: [],
        selectedMarks: [],
        disassemblyItemUuid: "",
        projectName: "",
        requiredProgress: 0,
        scrollTop: 0,
      };
    }

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      if (!workbenchEnabled()) return { ...context, workbenchEnabled: false };
      return { ...context, ...(await workbenchContext(this)), workbenchEnabled: true };
    }

    async close(options) {
      openWorkbenches.delete(this);
      return super.close(options);
    }

    _onRender(context, options) {
      super._onRender(context, options);
      openWorkbenches.add(this);
      if (!workbenchEnabled()) return;
      const root = rootElement(this.element);
      if (!root) return;
      if (this.workbenchState.tab === "gather") bindWorkbenchGathering(this, root);
      const disassemblyDrop = root.querySelector("[data-cmt-disassembly-drop]");
      disassemblyDrop?.addEventListener("dragover", event => event.preventDefault());
      disassemblyDrop?.addEventListener("drop", async event => {
        event.preventDefault();
        try {
          requireWorkbench();
          const data = JSON.parse(event.dataTransfer.getData("text/plain"));
          const item = await resolveBaseItem(data.uuid);
          if (item?.documentName !== "Item" || item.pack) throw new Error("Drop a world or inventory item, not a compendium entry.");
          this.workbenchState.disassemblyItemUuid = item.uuid;
          await this.render({ force: true });
        } catch (error) { ui.notifications.error(error.message); }
      });
      root.querySelector("[data-cmt-disassembly-clear]")?.addEventListener("click", async () => {
        this.workbenchState.disassemblyItemUuid = "";
        await this.render({ force: true });
      });
      root.querySelector("[data-cmt-disassembly-confirm]")?.addEventListener("click", async () => {
        try {
          await confirmDisassembly(this, null, this.workbenchState.disassemblyItemUuid);
          await this.render({ force: true });
        } catch (error) { ui.notifications.error(error.message, { permanent: true }); }
      });
      for (const button of root.querySelectorAll("[data-cmt-disassemble]")) {
        button.addEventListener("click", async () => {
          try {
            await confirmDisassembly(this, button.dataset.cmtDisassemble);
            await this.render({ force: true });
          } catch (error) { ui.notifications.error(error.message, { permanent: true }); }
        });
      }
      for (const select of root.querySelectorAll("[data-cmt-secondary]")) {
        select.addEventListener("change", async () => {
          this.workbenchState.secondaryMaterials[select.dataset.cmtSecondary] = select.value;
          this.workbenchState.requiredProgress = 0;
          await this.render({ force: true });
        });
      }
      for (const input of root.querySelectorAll("[data-cmt-upgrade-tier]")) {
        input.addEventListener("change", async () => {
          this.workbenchState.componentTiers ??= {};
          this.workbenchState.componentTiers[input.dataset.cmtUpgradeTier] = Number(input.value);
          await this.render({ force: true });
        });
      }
      root.querySelector("[data-cmt-reanchor]")?.addEventListener("click", async () => {
        this.workbenchState.rearrangement = {
          definitionId: root.querySelector("[data-cmt-reanchor-mark]").value,
          anchorId: root.querySelector("[data-cmt-reanchor-anchor]").value,
        };
        await this.render({ force: true });
      });
      for (const field of root.querySelectorAll("[data-cmt-upgrade-dragon]")) field.addEventListener("change", async () => {
        this.workbenchState.upgradeDragon = {
          color: root.querySelector('[data-cmt-upgrade-dragon="color"]').value,
          tier: Number(root.querySelector('[data-cmt-upgrade-dragon="tier"]').value),
        };
        await this.render({ force: true });
      });
      for (const button of root.querySelectorAll("[data-cmt-open-marks]")) {
        button.addEventListener("click", () => openArtisanMarkPicker(this, button.dataset.cmtOpenMarks));
      }
      bindMarkDetails(root, context.selectedMarks ?? []);
      root.querySelector("[data-cmt-show-archived]")?.addEventListener("click", async () => {
        this.workbenchState.showArchived = !this.workbenchState.showArchived;
        await this.render({ force: true });
      });
      const scrollContainer = root.querySelector(".cmt-workbench-body");
      if (scrollContainer) {
        scrollContainer.scrollTop = Math.max(0, Number(this.workbenchState.scrollTop) || 0);
        scrollContainer.addEventListener("scroll", () => {
          this.workbenchState.scrollTop = scrollContainer.scrollTop;
        }, { passive: true });
      }
      for (const button of root.querySelectorAll("[data-cmt-workbench-tab]")) {
        button.addEventListener("click", async () => {
          this.workbenchState.scrollTop = 0;
          this.workbenchState.tab = button.dataset.cmtWorkbenchTab;
          await this.render({ force: true });
        });
      }
      for (const field of root.querySelectorAll("[data-cmt-workbench-field]")) {
        const stateKey = {
          party: "partyId",
          recipe: "bandId",
          material: "materialId",
          tier: "tier",
          "project-name": "projectName",
          "required-progress": "requiredProgress",
        }[field.dataset.cmtWorkbenchField];
        if (!stateKey) continue;
        const eventName = field.dataset.cmtWorkbenchField === "project-name" ? "input" : "change";
        field.addEventListener(eventName, async () => {
          this.workbenchState[stateKey] = ["tier", "requiredProgress"].includes(stateKey)
            ? Number(field.value)
            : field.value;
          if (stateKey === "partyId") {
            this.workbenchState.disassemblyItemUuid = "";
            this.workbenchState.artisanSlots = Array(6).fill("");
            this.workbenchState.contributorUuids = [];
            this.workbenchState.leadArtisanUuid = "";
            this.workbenchState.selectedMarks = [];
            this.workbenchState.rearrangement = null;
            this.workbenchState.componentTiers = {};
            this.workbenchState.upgradeDragon = null;
            this.workbenchState.baseItemUuid = "";
          }
          if (["partyId", "bandId", "materialId", "tier"].includes(stateKey)) {
            if (["bandId", "materialId", "tier"].includes(stateKey)) this.workbenchState.requiredProgress = 0;
            await this.render({ force: true });
          }
        });
      }
      const drop = root.querySelector('[data-cmt-workbench-drop="base-item"]');
      drop?.addEventListener("dragover", (event) => {
        event.preventDefault();
        drop.classList.add("is-dragover");
      });
      drop?.addEventListener("dragleave", () => drop.classList.remove("is-dragover"));
      drop?.addEventListener("drop", async (event) => {
        event.preventDefault();
        drop.classList.remove("is-dragover");
        try {
          const data = TextEditor.getDragEventData(event);
          const uuid = data.uuid ?? (data.type === "Item" && data.id ? `Item.${data.id}` : "");
          const item = await resolveBaseItem(uuid);
          if (!item || compatibleRecipeBands(item).length === 0) throw new Error(localize("CMT.Workbench.InvalidBase"));
          if (this.workbenchState.tab === "upgrade") {
            validateUpgradeItem(item, partyActors().flatMap(p => projectState(p).projects));
            this.workbenchState.rearrangement = null;
            this.workbenchState.componentTiers = {};
            this.workbenchState.materialId = item.flags[MODULE_ID].crafting.core.materialId;
            this.workbenchState.tier = item.flags[MODULE_ID].crafting.core.tier;
            this.workbenchState.secondaryMaterials = Object.fromEntries((item.flags[MODULE_ID].crafting.components ?? [])
              .filter(c => c.structural).map(c => [c.slotType || c.id, c.materialId]));
            this.workbenchState.selectedMarks = [];
          }
          this.workbenchState.baseItemUuid = item.uuid;
          this.workbenchState.bandId = "";
          this.workbenchState.projectName = "";
          this.workbenchState.requiredProgress = 0;
          await this.render({ force: true });
        } catch (error) {
          ui.notifications.error(error.message);
        }
      });

      for (const slot of root.querySelectorAll("[data-cmt-artisan-slot]")) {
        const index = Number(slot.dataset.cmtArtisanSlot);
        slot.addEventListener("dragover", (event) => { event.preventDefault(); slot.classList.add("is-dragover"); });
        slot.addEventListener("dragleave", () => slot.classList.remove("is-dragover"));
        slot.addEventListener("drop", async (event) => {
          event.preventDefault();
          slot.classList.remove("is-dragover");
          try {
            const data = TextEditor.getDragEventData(event);
            const profile = getArtisanProfile(await resolveActor(data.uuid ?? (data.type === "Actor" ? `Actor.${data.id}` : "")));
            if (!profile?.professions.length) throw new Error("Choose an actor with a Wrathmaker profession.");
            const requirement = context.artisanSlots[index];
            if (requirement.required && requirement.materialIds.length && !profile.professions.some((profession) => (
              profession.materialIds.some((id) => requirement.materialIds.includes(id))
            ))) throw new Error(`${requirement.role} requires ${requirement.requirement} expertise.`);
            if (this.workbenchState.artisanSlots.some((uuid, i) => uuid === profile.actorUuid && i !== index)) {
              throw new Error("This artisan already occupies a slot.");
            }
            this.workbenchState.artisanSlots[index] = profile.actorUuid;
            this.workbenchState.requiredProgress = 0;
            await this.render({ force: true });
          } catch (error) { ui.notifications.error(error.message); }
        });
      }
      for (const button of root.querySelectorAll("[data-cmt-slot-remove]")) {
        button.addEventListener("click", async () => {
          this.workbenchState.artisanSlots[Number(button.dataset.cmtSlotRemove)] = "";
          this.workbenchState.requiredProgress = 0;
          await this.render({ force: true });
        });
      }
      root.querySelector('[data-cmt-workbench-action="clear-base"]')?.addEventListener("click", async () => {
        this.workbenchState.baseItemUuid = "";
        this.workbenchState.bandId = "";
        await this.render({ force: true });
      });
      root.querySelector('[data-cmt-workbench-action="open-stash"]')?.addEventListener("click", () => {
        const party = partyActors().find((entry) => entry.id === this.workbenchState.partyId);
        party?.sheet?.render(true);
      });

      root.querySelector('[data-cmt-workbench-action="create-project"]')?.addEventListener("click", async () => {
        try {
          await createAndReserve(this);
          await this.render({ force: true });
        } catch (error) {
          console.error(`${MODULE_ID} | Workbench project creation failed.`, error);
          ui.notifications.error(error.message);
        }
      });
      for (const card of root.querySelectorAll("[data-cmt-project-id]")) {
        card.querySelector(".cmt-project-details")?.addEventListener("toggle", (event) => {
          const ids = new Set(this.workbenchState.expandedProjectIds ?? []);
          if (event.currentTarget.open) ids.add(card.dataset.cmtProjectId);
          else ids.delete(card.dataset.cmtProjectId);
          this.workbenchState.expandedProjectIds = [...ids];
        });
        const projectId = card.dataset.cmtProjectId;
        bindMarkDetails(card, context.projects.find((entry) => entry.id === projectId)?.artisanMarks ?? []);
        for (const action of ["archive", "remove"]) {
          card.querySelector(`[data-cmt-project-action="${action}"]`)?.addEventListener("click", async () => {
            try {
              const party = partyActors().find((entry) => entry.id === this.workbenchState.partyId);
              if (!canEditParty(party)) throw new Error("You cannot edit this Party Stash.");
              if (action === "remove" && !await foundry.applications.api.DialogV2.confirm({
                window: { title: "Remove project" },
                content: "<p>Remove this project record and release any unconsumed reservations? Created items and spent materials are unaffected.</p>",
              })) return;
              const state = projectState(party);
              const project = state.projects.find((entry) => entry.id === projectId);
              if (!project) return;
              if (completionLocks.has(party.id)) throw new Error("This Party Stash is completing a project.");
              if (action === "archive") {
                if (!["completed", "cancelled"].includes(project.status)) throw new Error("Complete or cancel this project first.");
                project.archived = !project.archived;
              } else {
                state.projects = state.projects.filter((entry) => entry.id !== projectId);
              }
              await saveWorkbench(party, state);
              await this.render({ force: true });
            } catch (error) { ui.notifications.error(error.message); }
          });
        }
        card.querySelector('[data-cmt-project-action="roll-work"]')?.addEventListener("click", async (event) => {
          try {
            const days = Number(card.querySelector('[data-cmt-project-field="days"]')?.value) || 1;
            await rollWorkBlock(this, projectId, days, event);
            await this.render({ force: true });
          } catch (error) {
            console.error(`${MODULE_ID} | Work Block failed.`, error);
            ui.notifications.error(error.message);
          }
        });
        card.querySelector('[data-cmt-project-action="complete"]')?.addEventListener("click", async () => {
          try {
            await completeProject(this, projectId);
            await this.render({ force: true });
          } catch (error) {
            console.error(`${MODULE_ID} | Project completion failed.`, error);
            ui.notifications.error(error.message, { permanent: true });
          }
        });
        card.querySelector('[data-cmt-project-action="recover"]')?.addEventListener("click", async () => {
          try {
            await recoverFinishedItem(this, projectId);
            await this.render({ force: true });
          } catch (error) { ui.notifications.error(error.message); }
        });
        card.querySelector('[data-cmt-project-action="cancel"]')?.addEventListener("click", async () => {
          try {
            await cancelProject(this, projectId);
            await this.render({ force: true });
          } catch (error) {
            console.error(`${MODULE_ID} | Project cancellation failed.`, error);
            ui.notifications.error(error.message);
          }
        });
      }
    }
  };
}

export function registerWorkbench() {
  WorkbenchApplication = createWorkbenchApplication();
  Hooks.once("ready", installWorkbenchSocket);
  const refreshGathering = createLiveGatheringRefresh(() => openWorkbenches);
  for (const event of ["refreshToken", "updateToken", "createToken", "deleteToken", "canvasReady", "updateActor", "updateSetting"]) {
    Hooks.on(event, (_document, flags) => {
      if (event === "refreshToken" && !flags?.refreshPosition) return;
      refreshGathering();
    });
  }
  Hooks.on("wrathmakerRulesConfigChanged", () => {
    for (const application of openWorkbenches) {
      if (application.rendered) void application.render({ force: true });
    }
    ui.items?.render?.(false);
  });
  Hooks.on("renderItemDirectory", (_application, element) => {
    const root = rootElement(element);
    if (!workbenchEnabled()) {
      root?.querySelector("[data-cmt-open-workbench]")?.remove();
      return;
    }
    if (!root || root.querySelector("[data-cmt-open-workbench]")) return;
    const actions = root.querySelector(".directory-header .header-actions, .directory-header .action-buttons, .directory-header");
    if (!actions) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.cmtOpenWorkbench = "true";
    button.innerHTML = `<i class="fa-solid fa-hammer" aria-hidden="true"></i> ${localize("CMT.Workbench.Open")}`;
    button.addEventListener("click", () => openWorkbenchApplication());
    actions.prepend(button);
  });
  const injectPartyButton = (application, element) => {
    const party = application.actor ?? application.document;
    if (party?.type !== "party") return;
    const root = rootElement(element) ?? rootElement(application.element);
    if (!workbenchEnabled()) {
      root?.querySelector("[data-cmt-party-workbench]")?.remove();
      return;
    }
    const form = root?.matches?.("form") ? root : root?.querySelector("form");
    const details = form?.querySelector(":scope > header .details");
    if (!details || details.querySelector("[data-cmt-party-workbench]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cmt-party-workbench-button";
    button.dataset.cmtPartyWorkbench = "true";
    button.dataset.tooltip = localize("CMT.Workbench.Open");
    button.setAttribute("aria-label", localize("CMT.Workbench.Open"));
    button.innerHTML = '<i class="fa-solid fa-hammer" aria-hidden="true"></i>';
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openWorkbenchApplication({ partyId: party.id });
    });
    details.append(button);
  };
  Hooks.on("renderActorSheet", injectPartyButton);
  Hooks.on("renderActorSheetV2", injectPartyButton);
  Hooks.on("renderPartySheetPF2e", injectPartyButton);
  return WorkbenchApplication;
}

export function openWorkbenchApplication(options = {}) {
  if (!workbenchEnabled()) {
    ui.notifications.warn(localize("CMT.Workbench.FeatureDisabled"));
    return null;
  }
  if (!WorkbenchApplication) throw new Error("Wrathmaker Workbench has not been initialized.");
  const application = new WorkbenchApplication(options);
  application.render({ force: true });
  return application;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function bindMarkDetails(root, marks) {
  for (const badge of root.querySelectorAll("[data-cmt-mark-detail]")) {
    const mark = marks.find((entry) => entry.definitionId === badge.dataset.cmtMarkDetail || entry.id === badge.dataset.cmtMarkDetail);
    if (!mark || badge.dataset.cmtDetailBound) continue;
    badge.dataset.cmtDetailBound = "true";
    badge.addEventListener("dblclick", () => {
      new foundry.applications.api.DialogV2({
        window: { title: mark.name },
        content: `<p>${escapeHtml(mark.profession)} — ${escapeHtml(mark.specialisation || "Universal")}</p><p>${escapeHtml(mark.effectSummary)}</p><p>${escapeHtml(mark.gradeLabel ?? (mark.grade[0].toUpperCase() + mark.grade.slice(1)))} · ${mark.capacityCost} Capacity · ${escapeHtml(mark.activationLabel || "Passive")}</p><p>Synergy tags: ${escapeHtml((mark.synergyTags ?? []).join(", ") || "None")}</p>`,
        buttons: [{ action: "close", label: "Close", default: true }],
      }).render({ force: true });
    });
  }
}

function openArtisanMarkPicker(owner, actorUuid) {
  const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
  const planKey = () => JSON.stringify([
    owner.workbenchState.baseItemUuid, owner.workbenchState.bandId,
    owner.workbenchState.materialId, owner.workbenchState.tier,
    owner.workbenchState.artisanSlots, owner.workbenchState.secondaryMaterials,
    owner.workbenchState.selectedMarks,
  ]);
  const originalPlan = planKey();
  class ArtisanMarkPicker extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      classes: [MODULE_ID, "cmt-workbench-app", "cmt-mark-picker"],
      position: { width: 780, height: 700 },
      window: { title: "Choose Artisan Marks", resizable: true },
    };
    static PARTS = { main: { template: `modules/${MODULE_ID}/templates/artisan-mark-picker.hbs` } };
    constructor() {
      super();
      this.draft = { workbenchState: clone(owner.workbenchState) };
      this.scrollTop = 0;
    }
    async _prepareContext() {
      const context = await workbenchContext(this.draft);
      const tray = context.markTrays.find((entry) => entry.actorUuid === actorUuid);
      return { ...context, markTrays: tray ? [tray] : [] };
    }
    _onRender(context, options) {
      super._onRender(context, options);
      const root = rootElement(this.element);
      const scroll = root.querySelector(".cmt-workbench-body");
      scroll.scrollTop = this.scrollTop;
      scroll.addEventListener("scroll", () => { this.scrollTop = scroll.scrollTop; }, { passive: true });
      for (const button of root.querySelectorAll("[data-cmt-mark-toggle]")) {
        button.addEventListener("click", async () => {
          const marks = this.draft.workbenchState.selectedMarks;
          const index = marks.findIndex((entry) => entry.definitionId === button.dataset.cmtMarkToggle);
          if (index >= 0) marks.splice(index, 1);
          else marks.push({ definitionId: button.dataset.cmtMarkToggle, actorUuid, anchorSlotId: button.dataset.cmtAnchorId });
          await this.render({ force: true });
        });
      }
      for (const select of root.querySelectorAll("[data-cmt-mark-anchor]")) {
        select.addEventListener("change", () => {
          const mark = this.draft.workbenchState.selectedMarks.find((entry) => entry.definitionId === select.dataset.cmtMarkAnchor);
          if (mark) mark.anchorSlotId = select.value;
        });
      }
      for (const select of root.querySelectorAll("[data-cmt-mark-choice]")) {
        select.addEventListener("change", () => {
          const mark = this.draft.workbenchState.selectedMarks.find((entry) => entry.definitionId === select.dataset.cmtMarkChoice);
          if (mark) mark.configuration = { choice: select.value };
        });
      }
      root.querySelector("[data-cmt-marks-continue]").addEventListener("click", async () => {
        if (planKey() !== originalPlan) {
          ui.notifications.warn("The project changed. Reopen this artisan to choose Marks for the current plan.");
          return;
        }
        owner.workbenchState.selectedMarks = clone(this.draft.workbenchState.selectedMarks);
        owner.workbenchState.requiredProgress = 0;
        await owner.render({ force: true });
        await this.close();
      });
    }
  }
  new ArtisanMarkPicker().render({ force: true });
}
import { createLiveGatheringRefresh } from "./live-gathering-refresh.js";
