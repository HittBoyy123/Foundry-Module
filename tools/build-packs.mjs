import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { APEX_ITEM_SOURCES } from "../content/apex-items.js";
import { CRAFTING_ITEM_SOURCES } from "../content/crafting-items.js";
import { CRAFTING_RESOURCE_SOURCES } from "../content/crafting-resources.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(projectRoot, "packs");
const packs = Object.freeze({
  "apex-items.db": APEX_ITEM_SOURCES,
  "crafting-items.db": CRAFTING_ITEM_SOURCES,
  "crafting-resources.db": CRAFTING_RESOURCE_SOURCES,
});

await mkdir(outputDirectory, { recursive: true });
for (const [fileName, items] of Object.entries(packs)) {
  const outputPath = path.join(outputDirectory, fileName);
  const serialized = `${items.map((item) => JSON.stringify(item)).join("\n")}\n`;
  await writeFile(outputPath, serialized, "utf8");
  console.log(`Built ${items.length} Wrathmaker items at ${outputPath}.`);
}
