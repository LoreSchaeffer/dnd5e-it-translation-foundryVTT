import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolvePaths } from "./lib/config.mjs";
import { applyFieldOverrides } from "./lib/field-overrides.mjs";
import { loadSourcePack } from "./lib/source-inventory.mjs";

function argumentsOf(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--source") options.sourceRoot = argv[++index];
    else if (argv[index] === "--pack") options.packs = argv[++index].split(",").filter(Boolean);
    else if (argv[index] === "--overrides") options.overridesPath = argv[++index];
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!options.packs?.length) throw new Error("--pack is required");
  return options;
}

async function main() {
  const args = argumentsOf(process.argv.slice(2));
  const moduleRoot = path.join(import.meta.dirname, "..");
  const paths = await resolvePaths({ moduleRoot, sourceRoot: args.sourceRoot });
  const overrides = JSON.parse(await readFile(path.resolve(args.overridesPath ?? path.join(moduleRoot, "config", "field-overrides.json")), "utf8"));

  for (const pack of args.packs) {
    const records = (await loadSourcePack(path.join(paths.sourcePacksRoot, pack))).filter(record => record.kind === "document");
    const byId = new Map(records.map(record => [record.id, record]));
    const targetPath = path.join(paths.compendiumRoot, `dnd5e.${pack}.json`);
    const document = JSON.parse(await readFile(targetPath, "utf8"));
    document.mapping = {
      ...(document.mapping ?? {}),
      activities: { path: "system.activities", converter: "structured", cardinality: "many", container: "object", key: "_id", mapping: { name: "name", chatFlavor: "description.chatFlavor" } }
    };

    for (const [id, fields] of Object.entries(overrides[pack] ?? {})) {
      const record = byId.get(id);
      if (!record) throw new Error(`${pack}: unknown source id ${id}`);
      const key = document.entries[record.name] ? record.name : id;
      document.entries[key] ??= key === id ? { _id: id } : {};
      document.entries[key] = applyFieldOverrides(document.entries[key], fields);
    }
    await writeFile(targetPath, `${JSON.stringify(document, null, 2)}\n`);
    process.stdout.write(`${pack}: field overrides applied\n`);
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
