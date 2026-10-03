import { masterstrokeRequest } from "./masterstroke-authority.js";

export async function applyMasterstrokeImpact(weapon, actor, context, choice, token) {
  const source = context.token ?? context.origin?.token ?? actor.getActiveTokens?.(true, true)?.[0];
  const target = context.target?.token;
  if (!source || !target) throw new Error("Target tokens are required for Overwhelming Impact.");
  return masterstrokeRequest("impact", weapon, actor, token, {
    sourceTokenUuid: source.document?.uuid ?? source.uuid,
    targetTokenUuid: target.document?.uuid ?? target.uuid,
    choice,
  });
}
