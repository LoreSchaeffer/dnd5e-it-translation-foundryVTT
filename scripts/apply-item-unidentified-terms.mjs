import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadBabelePack } from "./lib/babele-inventory.mjs";
import { resolvePaths } from "./lib/config.mjs";
import { applyFieldOverrides, entryKeyForRecord } from "./lib/field-overrides.mjs";
import { buildItemUnidentifiedTerms, itemUnidentifiedOverrides } from "./lib/item-unidentified-terms.mjs";
import { loadSourcePack } from "./lib/source-inventory.mjs";

async function main() {
  const sourceIndex = process.argv.indexOf("--source");
  const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
  const moduleRoot = path.join(import.meta.dirname, "..");
  const paths = await resolvePaths({ moduleRoot, sourceRoot });
  const terms = buildItemUnidentifiedTerms(JSON.parse(await readFile(path.join(moduleRoot, "config", "item-unidentified-terms.json"), "utf8")));
  const pack = "items";
  const records = (await loadSourcePack(path.join(paths.sourcePacksRoot, pack))).filter(record => record.kind === "document");
  const targetPath = path.join(paths.compendiumRoot, `dnd5e.${pack}.json`);
  const translations = await loadBabelePack(targetPath);
  const translatedByKey = new Map(translations.filter(record => record.kind === "entry").map(record => [record.lookupKey, record]));
  const document = JSON.parse(await readFile(targetPath, "utf8"));
  document.mapping = {
    ...(document.mapping ?? {}),
    unidentified: {
      path: "system.unidentified",
      converter: "structured",
      cardinality: "one",
      container: "object",
      mapping: { name: "name", description: "description" }
    }
  };
  const nameCounts = new Map();
  for (const record of records) nameCounts.set(record.name, (nameCounts.get(record.name) ?? 0) + 1);
  const duplicates = new Set([...nameCounts].filter(([, count]) => count > 1).map(([name]) => name));
  let count = 0;
  for (const record of records) {
    const translated = translatedByKey.get(record.id) ?? translatedByKey.get(record.name);
    const overrides = itemUnidentifiedOverrides(record, translated?.data, terms);
    if (!Object.keys(overrides).length) continue;
    const key = entryKeyForRecord(document.entries, record, duplicates);
    document.entries[key] ??= key === record.id ? { _id: record.id } : {};
    document.entries[key] = applyFieldOverrides(document.entries[key], overrides);
    count += Object.keys(overrides).length;
  }
  await writeFile(targetPath, `${JSON.stringify(document, null, 2)}\n`);
  process.stdout.write(`items: ${count} unidentified fields translated\n`);
}

main().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
