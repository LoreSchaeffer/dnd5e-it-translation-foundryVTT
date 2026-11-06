import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolvePaths } from "./lib/config.mjs";
import { compareInvariants } from "./lib/invariants.mjs";
import { loadSourcePack } from "./lib/source-inventory.mjs";
import { applyStructuredTermsToDocument } from "./lib/structured-terms.mjs";

const ADVANCEMENT_MAPPING = {
  path: "system.advancement",
  converter: "structured",
  cardinality: "many",
  container: "array",
  key: "_id",
  mapping: { title: "title", hint: "hint" }
};

function argumentsOf(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--source") options.sourceRoot = argv[++index];
    else if (argv[index] === "--module") options.moduleRoot = argv[++index];
    else if (argv[index] === "--pack") options.packs = argv[++index].split(",").filter(Boolean);
    else if (argv[index] === "--phrases") options.phrasesPath = argv[++index];
    else if (argv[index] === "--descriptions") options.descriptionsPath = argv[++index];
    else if (argv[index] === "--descriptions-only") options.descriptionsOnly = true;
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!options.packs?.length) throw new Error("--pack is required");
  return options;
}

async function main() {
  const args = argumentsOf(process.argv.slice(2));
  const moduleRoot = path.resolve(args.moduleRoot ?? path.join(import.meta.dirname, ".."));
  const sourceRoot = path.resolve(args.sourceRoot ?? "C:/Users/lmlor/Desktop/dnd5e");
  const paths = await resolvePaths({ moduleRoot, sourceRoot });
  const phrases = JSON.parse(await readFile(path.resolve(args.phrasesPath ?? path.join(moduleRoot, "config", "structured-terms.json")), "utf8"));
  const descriptions = JSON.parse(await readFile(path.resolve(args.descriptionsPath ?? path.join(moduleRoot, "config", "description-overrides.json")), "utf8"));

  for (const pack of args.packs) {
    const sourceRecords = await loadSourcePack(path.join(paths.sourcePacksRoot, pack));
    const targetPath = path.join(paths.compendiumRoot, `dnd5e.${pack}.json`);
    const document = JSON.parse(await readFile(targetPath, "utf8"));
    const missing = [];
    if (!args.descriptionsOnly) document.mapping = { ...(document.mapping ?? {}), advancement: ADVANCEMENT_MAPPING };

    for (const record of sourceRecords.filter(item => item.kind === "document")) {
      const entry = document.entries?.[record.name];
      if (!entry) {
        if (!args.descriptionsOnly || descriptions[pack]?.[record.name]) missing.push({ name: record.name, reason: "missing-entry" });
        continue;
      }
      if (!args.descriptionsOnly) {
        const result = applyStructuredTermsToDocument(record.data, entry, phrases);
        document.entries[record.name] = result.translation;
        missing.push(...result.missing.map(item => ({ name: record.name, ...item })));
      }

      const description = descriptions[pack]?.[record.name];
      if (description) {
        const sourceDescription = record.data.system?.description?.value;
        const diagnostics = compareInvariants(sourceDescription, description);
        if (diagnostics.length) {
          throw new Error(`${pack}:${record.name}: description invariant failure: ${JSON.stringify(diagnostics)}`);
        }
        document.entries[record.name].description = description;
      }
    }
    if (missing.length) throw new Error(`${pack}: ${JSON.stringify(missing, null, 2)}`);
    await writeFile(targetPath, `${JSON.stringify(document, null, 2)}\n`);
    process.stdout.write(`${pack}: structured terms applied\n`);
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
