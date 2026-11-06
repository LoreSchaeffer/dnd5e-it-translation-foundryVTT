import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolvePaths } from "./lib/config.mjs";
import { pruneObsoleteEntries } from "./lib/prune-entries.mjs";
import { loadSourcePack } from "./lib/source-inventory.mjs";

function argumentsOf(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--source") options.sourceRoot = argv[++index];
    else if (argv[index] === "--pack") options.packs = argv[++index].split(",").filter(Boolean);
    else if (argv[index] === "--config") options.configPath = argv[++index];
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!options.packs?.length) throw new Error("--pack is required");
  return options;
}

async function main() {
  const args = argumentsOf(process.argv.slice(2));
  const moduleRoot = path.join(import.meta.dirname, "..");
  const paths = await resolvePaths({ moduleRoot, sourceRoot: args.sourceRoot });
  const config = JSON.parse(await readFile(path.resolve(args.configPath ?? path.join(moduleRoot, "config", "obsolete-entries.json")), "utf8"));
  for (const pack of args.packs) {
    const records = await loadSourcePack(path.join(paths.sourcePacksRoot, pack));
    const sourceNames = new Set(records.filter(record => record.kind === "document").map(record => record.name));
    const targetPath = path.join(paths.compendiumRoot, `dnd5e.${pack}.json`);
    const target = JSON.parse(await readFile(targetPath, "utf8"));
    const result = pruneObsoleteEntries(target, config[pack] ?? [], sourceNames);
    await writeFile(targetPath, `${JSON.stringify(result.document, null, 2)}\n`);
    process.stdout.write(`${pack}: ${result.removed.length} obsolete entries pruned\n`);
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
