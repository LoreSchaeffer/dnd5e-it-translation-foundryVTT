import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolvePaths } from "./lib/config.mjs";
import { buildPhbMemory, translateHtmlFromMemory, translateNameFromMemory } from "./lib/phb-memory.mjs";
import { loadSourcePack } from "./lib/source-inventory.mjs";
import { walkVisibleFields } from "./lib/visible-fields.mjs";

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--source") options.sourceRoot = argv[++index];
    else if (argv[index] === "--memory") options.memoryPath = argv[++index];
    else if (argv[index] === "--pack") options.packs = argv[++index].split(",").filter(Boolean);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!options.memoryPath || !options.packs?.length) throw new Error("--memory and --pack are required");
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const paths = await resolvePaths({ sourceRoot: options.sourceRoot, moduleRoot: path.join(import.meta.dirname, "..") });
  const memory = buildPhbMemory(JSON.parse(await readFile(path.resolve(options.memoryPath), "utf8")));
  for (const fileName of await readdir(paths.compendiumRoot)) {
    if (!/^dnd5e\..+\.json$/.test(fileName)) continue;
    const document = JSON.parse(await readFile(path.join(paths.compendiumRoot, fileName), "utf8"));
    for (const [sourceName, entry] of Object.entries(document.entries ?? {})) {
      if (entry?.name && entry.name !== sourceName) memory.names.set(sourceName, entry.name);
    }
  }

  for (const pack of options.packs) {
    const records = (await loadSourcePack(path.join(paths.sourcePacksRoot, pack))).filter(record => record.kind === "document");
    const counts = new Map(records.map(record => [record.name, records.filter(other => other.name === record.name).length]));
    const targetPath = path.join(paths.compendiumRoot, `dnd5e.${pack}.json`);
    const target = JSON.parse(await readFile(targetPath, "utf8"));
    let names = 0;
    let descriptions = 0;

    for (const record of records) {
      const key = counts.get(record.name) === 1 ? record.name : record.id;
      const translatedName = translateNameFromMemory(record.name, memory);
      const description = walkVisibleFields(record).find(field => field.fieldPath === "system.description.value");
      const translatedDescription = description ? translateHtmlFromMemory(description.value, memory) : null;
      if (!translatedName && !translatedDescription) continue;
      const entry = target.entries[key] ??= counts.get(record.name) === 1 ? {} : { _id: record.id };
      if (translatedName) { entry.name = translatedName; names += 1; }
      if (translatedDescription) { entry.description = translatedDescription; descriptions += 1; }
    }
    await writeFile(targetPath, `${JSON.stringify(target, null, 2)}\n`);
    process.stdout.write(`${pack}: ${names} names, ${descriptions} descriptions applied\n`);
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
