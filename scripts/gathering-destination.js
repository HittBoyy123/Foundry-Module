export const GATHERING_REWARD_DESTINATIONS = Object.freeze({
  "party-stash": "Party Stash",
  character: "Gathering Character",
});

export function normalizeGatheringRewardDestination(value) {
  return Object.hasOwn(GATHERING_REWARD_DESTINATIONS, value) ? value : "party-stash";
}

function memberMatchesActor(member, actor) {
  if (!member || !actor) return false;
  if (typeof member === "string") return member === actor.id || member === actor.uuid;
  const candidate = member.actor ?? member;
  return candidate === actor
    || candidate.id === actor.id
    || candidate.uuid === actor.uuid
    || candidate.actorId === actor.id;
}

export function findGatheringParty(actor, actors, activeParty = null) {
  if (activeParty?.type === "party" && Array.from(activeParty.members ?? []).some(member => memberMatchesActor(member, actor))) return activeParty;
  const parties = Array.from(actors ?? []).filter((candidate) => candidate?.type === "party");
  if (activeParty?.type === "party" && !parties.includes(activeParty)) parties.unshift(activeParty);
  return parties.find((party) => Array.from(party.members ?? []).some((member) => memberMatchesActor(member, actor)))
    ?? null;
}

export function gatheringParticipantCount(party) {
  const characters = Array.from(party?.members ?? []).map(member => member?.actor ?? member)
    .filter(member => member?.type === "character");
  return new Set(characters.map(member => member.uuid ?? member.id ?? member)).size;
}

export function groupGatheringTask(task, participantCount) {
  if (!Number.isInteger(participantCount) || participantCount < 1) {
    throw new Error("The gathering party must contain at least one player character.");
  }
  return { ...task, yields: { criticalFailure: 0, failure: 0,
    success: participantCount, criticalSuccess: participantCount * 2 } };
}

export function resolveGatheringRecipient(actor, {
  actors = [],
  activeParty = null,
  destination = "party-stash",
} = {}) {
  const normalizedDestination = normalizeGatheringRewardDestination(destination);
  if (normalizedDestination === "character") {
    return { recipient: actor ?? null, destination: normalizedDestination, missingParty: false };
  }
  const party = findGatheringParty(actor, actors, activeParty);
  return { recipient: party, destination: normalizedDestination, missingParty: !party };
}
