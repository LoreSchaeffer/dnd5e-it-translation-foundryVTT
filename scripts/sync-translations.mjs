import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadBabelePack } from "./lib/babele-inventory.mjs";
import { IN_SCOPE_PACKS, resolvePaths } from "./lib/config.mjs";
import { loadSourcePack } from "./lib/source-inventory.mjs";
import { applySynchronization, planSynchronization } from "./lib/synchronizer.mjs";

function parseArguments(argv) {
  const options = { apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--source") options.sourceRoot = argv[++index];
    else if (argv[index] === "--module") options.moduleRoot = argv[++index];
    else if (argv[index] === "--pack") options.packs = argv[++index].split(",").filter(Boolean);
    else if (argv[index] === "--apply") options.apply = true;
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
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

export async function runSynchronization(options) {
  const paths = await resolvePaths(options);
  const packs = options.packs ?? IN_SCOPE_PACKS;
  for (const pack of packs) {
    if (!IN_SCOPE_PACKS.includes(pack)) throw new Error(`Pack is outside configured scope: ${pack}`);
  }

  const report = { schemaVersion: 1, mode: options.apply ? "apply" : "dry-run", packs: [] };
  for (const pack of packs) {
    const translationPath = path.join(paths.compendiumRoot, `dnd5e.${pack}.json`);
    const sourceRecords = await loadSourcePack(path.join(paths.sourcePacksRoot, pack));
    const hasTranslation = await exists(translationPath);
    const translationDocument = hasTranslation
      ? JSON.parse(await readFile(translationPath, "utf8"))
      : { label: pack, folders: {}, entries: {} };
    const translationRecords = hasTranslation ? await loadBabelePack(translationPath) : [];
    const plan = planSynchronization({ sourceRecords, translationRecords });

    const hasSafeChanges = plan.safe.some(item => item.renameFrom && item.renameFrom !== item.lookupKey);
    if (options.apply && hasSafeChanges) {
      const applied = applySynchronization(translationDocument, plan);
      await writeFile(translationPath, `${JSON.stringify(applied, null, 2)}\n`);
    }

    report.packs.push({ pack, ...plan });
  }
  return report;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const moduleRoot = path.resolve(args.moduleRoot ?? path.join(import.meta.dirname, ".."));
  const sourceRoot = path.resolve(args.sourceRoot ?? "C:/Users/lmlor/Desktop/dnd5e");
  const report = await runSynchronization({ ...args, moduleRoot, sourceRoot });
  const reportPath = path.join(moduleRoot, "reports", "translation-sync.json");
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  const totals = report.packs.reduce((sum, pack) => ({
    safe: sum.safe + pack.safe.length,
    needsTranslation: sum.needsTranslation + pack.needsTranslation.length,
    manualReview: sum.manualReview + pack.manualReview.length
  }), { safe: 0, needsTranslation: 0, manualReview: 0 });
  process.stdout.write(`${report.mode}: ${totals.safe} safe, ${totals.needsTranslation} needs translation, ${totals.manualReview} manual review.\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
