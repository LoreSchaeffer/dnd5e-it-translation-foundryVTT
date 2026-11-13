import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadBabelePack } from "./lib/babele-inventory.mjs";
import { IN_SCOPE_PACKS, resolvePaths } from "./lib/config.mjs";
import { buildCanonicalEmbeddedOverrides } from "./lib/embedded-canonical.mjs";
import { applyFieldOverrides, entryKeyForRecord } from "./lib/field-overrides.mjs";
import { loadSourcePack } from "./lib/source-inventory.mjs";

function parseArguments(argv) {
  const options = { apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--source") options.sourceRoot = argv[++index];
    else if (argv[index] === "--pack") options.pack = argv[++index];
    else if (argv[index] === "--apply") options.apply = true;
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!options.pack) throw new Error("--pack is required");
  return options;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function buildCanonicalIndex(paths, excludedPack) {
  const canonicalByUuid = new Map();
  const candidatesByName = new Map();
  for (const pack of IN_SCOPE_PACKS) {
    if (pack === excludedPack) continue;
    const sourcePath = path.join(paths.sourcePacksRoot, pack);
    const translationPath = path.join(paths.compendiumRoot, `dnd5e.${pack}.json`);
    if (!await exists(sourcePath) || !await exists(translationPath)) continue;

    const sourceRecords = (await loadSourcePack(sourcePath)).filter(record => record.kind === "document");
    const translationRecords = (await loadBabelePack(translationPath)).filter(record => record.kind === "entry");
    const translationsByKey = new Map(translationRecords.map(record => [record.lookupKey, record]));
    for (const sourceRecord of sourceRecords) {
      const translationRecord = translationsByKey.get(sourceRecord.id) ?? translationsByKey.get(sourceRecord.name);
      if (!translationRecord) continue;
      const candidate = { sourceRecord, translationRecord };
      canonicalByUuid.set(`Compendium.dnd5e.${pack}.Item.${sourceRecord.id}`, candidate);
      const named = candidatesByName.get(sourceRecord.name) ?? [];
      named.push(candidate);
      candidatesByName.set(sourceRecord.name, named);
    }
  }
  const canonicalByName = new Map(
    [...candidatesByName].filter(([, candidates]) => candidates.length === 1).map(([name, candidates]) => [name, candidates[0]])
  );
  return { canonicalByUuid, canonicalByName };
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  if (!IN_SCOPE_PACKS.includes(args.pack)) throw new Error(`Pack is outside configured scope: ${args.pack}`);
  const moduleRoot = path.join(import.meta.dirname, "..");
  const paths = await resolvePaths({ moduleRoot, sourceRoot: args.sourceRoot });
  const targetPath = path.join(paths.compendiumRoot, `dnd5e.${args.pack}.json`);
  const document = JSON.parse(await readFile(targetPath, "utf8"));
  const records = (await loadSourcePack(path.join(paths.sourcePacksRoot, args.pack)))
    .filter(record => record.kind === "document" && record.documentType === "Actor");
  const { canonicalByUuid, canonicalByName } = await buildCanonicalIndex(paths, args.pack);
  const nameCounts = new Map();
  for (const record of records) nameCounts.set(record.name, (nameCounts.get(record.name) ?? 0) + 1);
  const duplicateNames = new Set([...nameCounts].filter(([, count]) => count > 1).map(([name]) => name));
  const report = { schemaVersion: 1, mode: args.apply ? "apply" : "dry-run", pack: args.pack, actors: [] };

  for (const record of records) {
    const key = entryKeyForRecord(document.entries, record, duplicateNames);
    const entry = document.entries[key];
    if (!entry) {
      report.actors.push({ id: record.id, name: record.name, fields: 0, reason: "missing-translation-entry" });
      continue;
    }
    const overrides = buildCanonicalEmbeddedOverrides({ actorRecord: record, canonicalByUuid, canonicalByName });
    const fields = Object.keys(overrides).length;
    if (args.apply && fields) document.entries[key] = applyFieldOverrides(entry, overrides);
    report.actors.push({ id: record.id, name: record.name, fields });
  }

  if (args.apply) await writeFile(targetPath, `${JSON.stringify(document, null, 2)}\n`);
  const reportPath = path.join(moduleRoot, "reports", "embedded-canonical-sync.json");
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  const fields = report.actors.reduce((sum, actor) => sum + actor.fields, 0);
  process.stdout.write(`${report.mode}: ${fields} canonical embedded fields across ${report.actors.length} actors.\n`);
}

main().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
