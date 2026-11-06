import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadBabelePack } from "./lib/babele-inventory.mjs";
import { IN_SCOPE_PACKS, resolvePaths } from "./lib/config.mjs";
import { localizeHtmlSkeleton } from "./lib/html-skeleton-localizer.mjs";
import { loadSourcePack } from "./lib/source-inventory.mjs";

async function exists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

async function translatedLabels(paths) {
  const labels = new Map();
  for (const pack of IN_SCOPE_PACKS) {
    const targetPath = path.join(paths.compendiumRoot, `dnd5e.${pack}.json`);
    if (!await exists(targetPath)) continue;
    const source = (await loadSourcePack(path.join(paths.sourcePacksRoot, pack))).filter(record => record.kind === "document");
    const translations = (await loadBabelePack(targetPath)).filter(record => record.kind === "entry");
    const byKey = new Map(translations.map(record => [record.lookupKey, record]));
    for (const record of source) {
      const translated = byKey.get(record.id) ?? byKey.get(record.name);
      if (translated?.data?.name) labels.set(record.id, translated.data.name);
    }
  }
  return labels;
}

async function main() {
  const sourceIndex = process.argv.indexOf("--source");
  const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
  const moduleRoot = path.join(import.meta.dirname, "..");
  const paths = await resolvePaths({ moduleRoot, sourceRoot });
  const config = JSON.parse(await readFile(path.join(moduleRoot, "config", "classfeature-composites.json"), "utf8"));
  const source = await loadSourcePack(path.join(paths.sourcePacksRoot, "classfeatures"));
  const sourceById = new Map(source.filter(record => record.kind === "document").map(record => [record.id, record]));
  const labelsById = await translatedLabels(paths);
  const targetPath = path.join(paths.compendiumRoot, "dnd5e.classfeatures.json");
  const document = JSON.parse(await readFile(targetPath, "utf8"));
  for (const [id, text] of Object.entries(config)) {
    const record = sourceById.get(id);
    if (!record) throw new Error(`Unknown classfeature source id: ${id}`);
    const key = document.entries[record.name]?._id && document.entries[record.name]._id !== id ? id : record.name;
    document.entries[key] ??= { _id: id };
    document.entries[key].description = localizeHtmlSkeleton(record.data.system.description.value, { text, labelsById });
  }
  await writeFile(targetPath, `${JSON.stringify(document, null, 2)}\n`);
  process.stdout.write(`${Object.keys(config).length} classfeature composites localized\n`);
}

main().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
