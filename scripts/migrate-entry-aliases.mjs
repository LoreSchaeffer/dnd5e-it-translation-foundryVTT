import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolvePaths } from "./lib/config.mjs";
import { migrateEntryAliases } from "./lib/entry-aliases.mjs";
import { loadSourcePack } from "./lib/source-inventory.mjs";

async function main() {
  const sourceIndex = process.argv.indexOf("--source");
  const packIndex = process.argv.indexOf("--pack");
  const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
  const packs = packIndex >= 0 ? process.argv[packIndex + 1].split(",") : [];
  if (!packs.length) throw new Error("--pack is required");
  const moduleRoot = path.join(import.meta.dirname, "..");
  const paths = await resolvePaths({ moduleRoot, sourceRoot });
  const aliases = JSON.parse(await readFile(path.join(moduleRoot, "config", "entry-aliases.json"), "utf8"));
  for (const pack of packs) {
    const source = await loadSourcePack(path.join(paths.sourcePacksRoot, pack));
    const sourceById = new Map(source.filter(record => record.kind === "document").map(record => [record.id, record.name]));
    for (const target of Object.values(aliases[pack] ?? {})) {
      if (sourceById.get(target.id) !== target.name) throw new Error(`${pack}: invalid alias target ${target.id}/${target.name}`);
    }
    const targetPath = path.join(paths.compendiumRoot, `dnd5e.${pack}.json`);
    const document = JSON.parse(await readFile(targetPath, "utf8"));
    const result = migrateEntryAliases(document, aliases[pack] ?? {});
    await writeFile(targetPath, `${JSON.stringify(result.document, null, 2)}\n`);
    process.stdout.write(`${pack}: ${result.moved.length} aliases migrated\n`);
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
