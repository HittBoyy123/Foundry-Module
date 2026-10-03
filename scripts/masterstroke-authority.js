import { MODULE_ID } from "./constants.js";
import { currentMasterstroke, masterstrokeAvailable, usageKey } from "./masterstroke-rules.js";

const pending = new Map();
let queue = Promise.resolve();
const channel = `module.${MODULE_ID}`;
const primaryGM = () => [...game.users].filter(user => user.active && user.isGM).sort((a,b) => a.id.localeCompare(b.id))[0];
const owns = (actor, user) => user?.isGM || actor?.testUserPermission?.(user, "OWNER");

async function execute(request, user) {
  const item = await fromUuid(request.itemUuid);
  const roller = await fromUuid(request.rollerUuid);
  if (!user?.active || !item || !currentMasterstroke(item) || !owns(roller, user)) throw new Error("The Masterstroke or rolling character is unavailable.");
  if (request.action === "impact") {
    if (currentMasterstroke(item).id !== "overwhelming-impact" || item.actor?.uuid !== roller.uuid) throw new Error("This character cannot use Overwhelming Impact.");
    const claim = item.flags?.[MODULE_ID]?.crafting?.masterstrokeClaims?.turn;
    if (!request.token || claim?.token !== request.token || claim.userId !== user.id || claim.applied) throw new Error("This impact has already been resolved or is no longer available.");
    const target = await fromUuid(request.targetTokenUuid);
    const origin = await fromUuid(request.sourceTokenUuid);
    if (!target?.actor || origin?.actor?.uuid !== roller.uuid || origin.parent?.id !== target.parent?.id) throw new Error("Both tokens must be on the same scene.");
    const sizes = ["tiny", "sm", "med", "lg", "huge", "grg"];
    if (sizes.indexOf(target.actor.system.traits.size.value) > sizes.indexOf(roller.system.traits.size.value) + 2) throw new Error("The target is too large.");
    if (request.choice === "prone") {
      if (!target.actor.hasCondition("prone")) await target.actor.increaseCondition("prone");
      await item.update({ [`flags.${MODULE_ID}.crafting.masterstrokeClaims.turn.applied`]: true });
      return true;
    }
    if (request.choice !== "push" || !origin.object || !target.object || canvas.scene?.id !== target.parent.id) throw new Error("The GM must view this scene to resolve forced movement.");
    const a = origin.object.center, b = target.object.center;
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    if (!length) throw new Error("Tokens overlap; move them apart before resolving the push.");
    const grid = target.parent.grid;
    const pixelDistance = 10 * grid.size / grid.distance;
    // Stop at the first obstruction rather than crossing walls or the scene edge.
    let destination = null;
    for (let distance = pixelDistance; distance > 0; distance -= grid.size / 2) {
      const center = { x: b.x + dx / length * distance, y: b.y + dy / length * distance };
      if (canvas.dimensions.sceneRect.contains(center.x, center.y) && !target.object.checkCollision(center, { origin: b, type: "move", mode: "any" })) {
        destination = { x: target.x + center.x - b.x, y: target.y + center.y - b.y }; break;
      }
    }
    if (!destination) throw new Error("There is no unobstructed space to push the target.");
    await target.update(destination);
    await item.update({ [`flags.${MODULE_ID}.crafting.masterstrokeClaims.turn.applied`]: true });
    return true;
  }
  const frequency = request.frequency;
  if (!["encounter", "day", "round", "turn"].includes(frequency)) throw new Error("Invalid Masterstroke frequency.");
  if (frequency !== currentMasterstroke(item).frequency) throw new Error("This Masterstroke does not use that frequency.");
  // Uses live on the item, including while it changes owners. A claim is atomic on the GM.
  const path = `flags.${MODULE_ID}.crafting.masterstrokeUses`;
  const claimsPath = `flags.${MODULE_ID}.crafting.masterstrokeClaims`;
  const claims = item.flags?.[MODULE_ID]?.crafting?.masterstrokeClaims ?? {};
  const uses = item.flags?.[MODULE_ID]?.crafting?.masterstrokeUses ?? {};
  if (request.action === "reserve") {
    if (!masterstrokeAvailable(item, frequency)) return null;
    const token = foundry.utils.randomID();
    await item.update({ [`${path}.${frequency}`]: usageKey(frequency), [`${claimsPath}.${frequency}`]: { token, userId: user.id, previous: uses[frequency] ?? null } }, { wrathmakerUpgrade: true });
    return token;
  }
  if (request.action === "release") {
    const claim = claims[frequency];
    if (claim?.token !== request.token || claim.userId !== user.id) return false;
    await item.update({ [`${path}.${frequency}`]: claim.previous, [`${claimsPath}.-=${frequency}`]: null }, { wrathmakerUpgrade: true });
    return true;
  }
  throw new Error("Unknown Masterstroke operation.");
}
const enqueue = (request, user) => {
  const result = queue.catch(() => {}).then(() => execute(request, user));
  queue = result;
  return result;
};
export async function masterstrokeRequest(action, item, roller, token = null, details = {}) {
  const request = { ...details, action, itemUuid: item.uuid, rollerUuid: roller.uuid, frequency: currentMasterstroke(item)?.frequency, token };
  const gm = primaryGM();
  if (!gm) {
    if (item.isOwner && roller.isOwner) return enqueue(request, game.user);
    throw new Error("An active GM is needed to resolve this Masterstroke against another character.");
  }
  if (gm.id === game.user.id) return enqueue(request, game.user);
  const id = foundry.utils.randomID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error("The GM did not confirm the Masterstroke. Check its usage before retrying.")); }, 20000);
    pending.set(id, { resolve, reject, timer, gmId: gm.id });
    game.socket.emit(channel, { type: "masterstroke-request", id, gmId: gm.id, userId: game.user.id, request });
  });
}
export function registerMasterstrokeAuthority() {
  game.socket.on(channel, async payload => {
    if (payload?.type === "masterstroke-result" && payload.userId === game.user.id) {
      const task = pending.get(payload.id);
      if (!task || task.gmId !== payload.gmId) return;
      pending.delete(payload.id); clearTimeout(task.timer);
      payload.error ? task.reject(new Error(payload.error)) : task.resolve(payload.result);
    }
    if (payload?.type !== "masterstroke-request" || !game.user.isGM || primaryGM()?.id !== game.user.id || payload.gmId !== game.user.id) return;
    const response = { type: "masterstroke-result", id: payload.id, gmId: game.user.id, userId: payload.userId };
    try { response.result = await enqueue(payload.request, game.users.get(payload.userId)); }
    catch (error) { response.error = error.message; }
    game.socket.emit(channel, response);
  });
}
