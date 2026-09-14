/** View locally; never activate a scene or move party tokens. */
export async function viewStolenLandsMap(scenes = globalThis.game?.scenes) {
  const matches = Array.from(scenes ?? []).filter(scene => /^(?:the\s+)?stolen lands(?:\s+map)?$/i.test(String(scene.name ?? "").trim()));
  if (!matches.length) throw new Error("The Stolen Lands scene is not available in this world. Ask the GM to import the map.");
  if (matches.length > 1) throw new Error("More than one Stolen Lands scene was found. Ask the GM to give the gathering map a unique name.");
  await matches[0].view();
}

export function bindGatheringMap(application, root) {
  const button = root?.querySelector("[data-cmt-gather-map]");
  button?.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;
    try {
      await viewStolenLandsMap();
      await application.render({ force: true });
    } catch (error) { globalThis.ui?.notifications?.error(error.message); }
    finally { button.disabled = false; }
  });
}
