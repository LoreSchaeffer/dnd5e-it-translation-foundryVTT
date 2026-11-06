import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { activityNameOverrides } from "./lib/activity-terms.mjs";
import { loadBabelePack } from "./lib/babele-inventory.mjs";
import { resolvePaths } from "./lib/config.mjs";
import { applyFieldOverrides, entryKeyForRecord } from "./lib/field-overrides.mjs";
import { loadSourcePack } from "./lib/source-inventory.mjs";

function argumentsOf(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--source") options.sourceRoot = argv[++index];
    else if (argv[index] === "--pack") options.packs = argv[++index].split(",").filter(Boolean);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!options.packs?.length) throw new Error("--pack is required");
  return options;
}

async function main() {
  const args = argumentsOf(process.argv.slice(2));
  const moduleRoot = path.join(import.meta.dirname, "..");
  const paths = await resolvePaths({ moduleRoot, sourceRoot: args.sourceRoot });
  const terms = JSON.parse(await readFile(path.join(moduleRoot, "config", "activity-terms.json"), "utf8"));

  for (const pack of args.packs) {
    const records = (await loadSourcePack(path.join(paths.sourcePacksRoot, pack))).filter(record => record.kind === "document");
    const targetPath = path.join(paths.compendiumRoot, `dnd5e.${pack}.json`);
    const translations = await loadBabelePack(targetPath);
    const translatedByKey = new Map(translations.filter(record => record.kind === "entry").map(record => [record.lookupKey, record]));
    const document = JSON.parse(await readFile(targetPath, "utf8"));
    document.entries ??= {};
    document.mapping = {
      ...(document.mapping ?? {}),
      activities: {
        path: "system.activities",
        converter: "structured",
        cardinality: "many",
        container: "keyed",
        key: "_id",
        mapping: { name: "name", chatFlavor: "description.chatFlavor" }
      }
    };
    const nameCounts = new Map();
    for (const record of records) nameCounts.set(record.name, (nameCounts.get(record.name) ?? 0) + 1);
    const duplicateNames = new Set([...nameCounts].filter(([, count]) => count > 1).map(([name]) => name));
    let count = 0;

    for (const record of records) {
      const translated = translatedByKey.get(record.id) ?? translatedByKey.get(record.name);
      const overrides = activityNameOverrides(record, translated?.data, terms);
      if (!Object.keys(overrides).length) continue;
      const key = entryKeyForRecord(document.entries, record, duplicateNames);
      document.entries[key] ??= key === record.id ? { _id: record.id } : {};
      document.entries[key] = applyFieldOverrides(document.entries[key], overrides);
      count += Object.keys(overrides).length;
    }

    await writeFile(targetPath, `${JSON.stringify(document, null, 2)}\n`);
    process.stdout.write(`${pack}: ${count} activity names translated\n`);
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
