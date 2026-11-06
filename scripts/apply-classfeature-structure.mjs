import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolvePaths } from "./lib/config.mjs";
import { translateFeatureFolder, translateRequirement } from "./lib/legacy-structure.mjs";
import { loadSourcePack } from "./lib/source-inventory.mjs";

async function main() {
  const sourceIndex = process.argv.indexOf("--source");
  const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
  const moduleRoot = path.join(import.meta.dirname, "..");
  const paths = await resolvePaths({ moduleRoot, sourceRoot });
  const source = await loadSourcePack(path.join(paths.sourcePacksRoot, "classfeatures"));
  const targetPath = path.join(paths.compendiumRoot, "dnd5e.classfeatures.json");
  const document = JSON.parse(await readFile(targetPath, "utf8"));
  const entriesById = new Map(Object.values(document.entries ?? {}).filter(entry => entry?._id).map(entry => [entry._id, entry]));
  let fields = 0;

  for (const folder of source.filter(record => record.kind === "folder")) {
    const translated = translateFeatureFolder(folder.name);
    if (translated) document.folders[folder.name] = translated;
  }
  for (const record of source.filter(item => item.kind === "document")) {
    const entry = entriesById.get(record.id) ?? document.entries[record.name];
    if (!entry) continue;
    const requirements = record.data.system?.requirements;
    if (requirements) { entry.requirements = translateRequirement(requirements); fields += 1; }
    for (const effect of record.data.effects ?? []) {
      entry.effects ??= {};
      const translatedName = effect.name === record.name ? entry.name : document.entries[effect.name]?.name ?? effect.name;
      entry.effects[effect._id] ??= {};
      entry.effects[effect._id].name = translatedName;
      fields += 1;
    }
  }
  await writeFile(targetPath, `${JSON.stringify(document, null, 2)}\n`);
  process.stdout.write(`classfeatures: 27 folders and ${fields} structured fields applied\n`);
}

main().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
