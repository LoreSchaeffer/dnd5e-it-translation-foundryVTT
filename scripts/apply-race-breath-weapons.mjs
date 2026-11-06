import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolvePaths } from "./lib/config.mjs";
import { translateBreathWeapon } from "./lib/race-breath-weapons.mjs";
import { loadSourcePack } from "./lib/source-inventory.mjs";

async function main() {
  const sourceIndex = process.argv.indexOf("--source");
  const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
  const moduleRoot = path.join(import.meta.dirname, "..");
  const paths = await resolvePaths({ moduleRoot, sourceRoot });
  const records = await loadSourcePack(path.join(paths.sourcePacksRoot, "races"));
  const targetPath = path.join(paths.compendiumRoot, "dnd5e.races.json");
  const document = JSON.parse(await readFile(targetPath, "utf8"));
  document.mapping = {
    ...(document.mapping ?? {}),
    activities: { path: "system.activities", converter: "structured", cardinality: "many", container: "keyed", key: "_id", mapping: { name: "name" } }
  };
  let count = 0;
  for (const record of records.filter(item => item.kind === "document")) {
    const translated = translateBreathWeapon(record);
    if (!translated) continue;
    document.entries[record.name] = translated;
    count += 1;
  }
  await writeFile(targetPath, `${JSON.stringify(document, null, 2)}\n`);
  process.stdout.write(`races: ${count} breath weapons applied\n`);
}

main().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
