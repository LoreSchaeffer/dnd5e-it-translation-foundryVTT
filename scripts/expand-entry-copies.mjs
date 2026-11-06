import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolvePaths } from "./lib/config.mjs";
import { expandEntryCopies } from "./lib/entry-copies.mjs";
import { loadSourcePack } from "./lib/source-inventory.mjs";

async function main() {
  const sourceIndex = process.argv.indexOf("--source");
  const packIndex = process.argv.indexOf("--pack");
  const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
  const packs = packIndex >= 0 ? process.argv[packIndex + 1].split(",") : [];
  if (!packs.length) throw new Error("--pack is required");
  const moduleRoot = path.join(import.meta.dirname, "..");
  const paths = await resolvePaths({ moduleRoot, sourceRoot });
  const config = JSON.parse(await readFile(path.join(moduleRoot, "config", "entry-copies.json"), "utf8"));
  for (const pack of packs) {
    const source = await loadSourcePack(path.join(paths.sourcePacksRoot, pack));
    const sourceById = new Map(source.filter(record => record.kind === "document").map(record => [record.id, record.name]));
    for (const targets of Object.values(config[pack] ?? {})) {
      for (const target of targets) if (sourceById.get(target.id) !== target.name) throw new Error(`${pack}: invalid copy target ${target.id}`);
    }
    const targetPath = path.join(paths.compendiumRoot, `dnd5e.${pack}.json`);
    const document = JSON.parse(await readFile(targetPath, "utf8"));
    const result = expandEntryCopies(document, config[pack] ?? {});
    await writeFile(targetPath, `${JSON.stringify(result.document, null, 2)}\n`);
    process.stdout.write(`${pack}: ${result.created.length} stable copies created\n`);
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
