import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadAllowlist } from "./lib/allowlist.mjs";
import { loadBabelePack } from "./lib/babele-inventory.mjs";
import { buildReport, auditPack, hasBlockingFailures, renderMarkdownReport } from "./lib/coverage.mjs";
import { IN_SCOPE_PACKS, resolvePaths } from "./lib/config.mjs";
import { loadSourcePack } from "./lib/source-inventory.mjs";

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--source") options.sourceRoot = argv[++index];
    else if (argv[index] === "--module") options.moduleRoot = argv[++index];
    else if (argv[index] === "--allowlist") options.allowlistPath = argv[++index];
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

export async function runAudit(options) {
  const paths = await resolvePaths(options);
  const allowlist = await loadAllowlist(options.allowlistPath ?? path.join(paths.moduleRoot, "config", "translation-allowlist.json"));
  const audits = [];

  for (const pack of IN_SCOPE_PACKS) {
    const sourceRecords = await loadSourcePack(path.join(paths.sourcePacksRoot, pack));
    const translationPath = path.join(paths.compendiumRoot, `dnd5e.${pack}.json`);
    const translationRecords = await exists(translationPath) ? await loadBabelePack(translationPath) : [];
    audits.push(auditPack({ pack, sourceRecords, translationRecords, allowlist }));
  }
  return buildReport(audits);
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const moduleRoot = path.resolve(args.moduleRoot ?? path.join(import.meta.dirname, ".."));
  const sourceRoot = path.resolve(args.sourceRoot ?? "C:/Users/lmlor/Desktop/dnd5e");
  const report = await runAudit({ ...args, moduleRoot, sourceRoot });
  const reportRoot = path.join(moduleRoot, "reports");
  await mkdir(reportRoot, { recursive: true });
  await writeFile(path.join(reportRoot, "translation-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(reportRoot, "translation-audit.md"), renderMarkdownReport(report));
  process.stdout.write(`Audited ${report.packs.length} packs; ${report.totals.blockingIssues} blocking issues.\n`);
  if (hasBlockingFailures(report)) process.exitCode = 1;
}

main().catch(error => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
