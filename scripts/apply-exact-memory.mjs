import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadBabelePack } from "./lib/babele-inventory.mjs";
import { IN_SCOPE_PACKS, resolvePaths } from "./lib/config.mjs";
import {
  buildExactMemory,
  buildExactSegmentMemory,
  configuredFolderTranslation,
  configuredMissingOverrides,
  exactMissingOverrides,
  segmentMissingOverrides
} from "./lib/exact-memory.mjs";
import { applyFieldOverrides, entryKeyForRecord } from "./lib/field-overrides.mjs";
import { monsterPatternMissingOverrides } from "./lib/monster-patterns.mjs";
import { loadSourcePack } from "./lib/source-inventory.mjs";

async function exists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

function argumentsOf(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--source") options.sourceRoot = argv[++index];
    else if (argv[index] === "--pack") options.packs = argv[++index].split(",").filter(Boolean);
    else if (argv[index] === "--phrases") options.phrasesPath = argv[++index];
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!options.packs?.length) throw new Error("--pack is required");
  return options;
}

async function main() {
  const args = argumentsOf(process.argv.slice(2));
  const moduleRoot = path.join(import.meta.dirname, "..");
  const paths = await resolvePaths({ moduleRoot, sourceRoot: args.sourceRoot });
  const packs = new Map();
  const pairs = [];
  const folderCandidates = new Map();
  for (const pack of IN_SCOPE_PACKS) {
    const source = await loadSourcePack(path.join(paths.sourcePacksRoot, pack));
    const targetPath = path.join(paths.compendiumRoot, `dnd5e.${pack}.json`);
    const translations = await exists(targetPath) ? await loadBabelePack(targetPath) : [];
    packs.set(pack, { source, targetPath, translations });
    const byKey = new Map(translations.filter(record => record.kind === "entry").map(record => [record.lookupKey, record]));
    for (const record of source.filter(item => item.kind === "document")) {
      const translated = byKey.get(record.id) ?? byKey.get(record.name);
      if (translated) pairs.push({ source: record, translation: translated.data });
    }
    const translatedFolders = new Map(translations.filter(record => record.kind === "folder").map(record => [record.lookupKey, record.data.name]));
    for (const folder of source.filter(item => item.kind === "folder")) {
      const translated = translatedFolders.get(folder.id) ?? translatedFolders.get(folder.name);
      if (!translated || translated === folder.name) continue;
      const values = folderCandidates.get(folder.name) ?? new Set();
      values.add(translated);
      folderCandidates.set(folder.name, values);
    }
  }
  const memory = buildExactMemory(pairs);
  const segmentMemory = buildExactSegmentMemory(pairs);
  const phrases = args.phrasesPath
    ? JSON.parse(await readFile(path.resolve(args.phrasesPath), "utf8"))
    : {};
  const folderMemory = new Map([...folderCandidates].filter(([, values]) => values.size === 1).map(([key, values]) => [key, [...values][0]]));

  for (const pack of args.packs) {
    const { source, targetPath, translations } = packs.get(pack);
    const document = JSON.parse(await readFile(targetPath, "utf8"));
    document.entries ??= {};
    document.folders ??= {};
    const byKey = new Map(translations.filter(record => record.kind === "entry").map(record => [record.lookupKey, record]));
    const nameCounts = new Map();
    for (const record of source.filter(item => item.kind === "document")) nameCounts.set(record.name, (nameCounts.get(record.name) ?? 0) + 1);
    const duplicates = new Set([...nameCounts].filter(([, count]) => count > 1).map(([name]) => name));
    let fields = 0;
    for (const record of source.filter(item => item.kind === "document")) {
      const translated = byKey.get(record.id) ?? byKey.get(record.name);
      const overrides = {
        ...(pack === "monsters" ? monsterPatternMissingOverrides(record, translated?.data ?? {}) : {}),
        ...segmentMissingOverrides(record, translated?.data ?? {}, segmentMemory),
        ...exactMissingOverrides(record, translated?.data ?? {}, memory),
        ...configuredMissingOverrides(record, translated?.data ?? {}, phrases)
      };
      if (!Object.keys(overrides).length) continue;
      const key = entryKeyForRecord(document.entries, record, duplicates);
      document.entries[key] ??= key === record.id ? { _id: record.id } : {};
      document.entries[key] = applyFieldOverrides(document.entries[key], overrides);
      fields += Object.keys(overrides).length;
    }
    for (const folder of source.filter(item => item.kind === "folder")) {
      if (document.folders[folder.name] || document.folders[folder.id]) continue;
      const translated = configuredFolderTranslation(folder.name, folderMemory.get(folder.name), phrases);
      if (translated) document.folders[folder.name] = translated;
    }
    await writeFile(targetPath, `${JSON.stringify(document, null, 2)}\n`);
    process.stdout.write(`${pack}: ${fields} exact visible fields reused\n`);
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
