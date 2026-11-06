import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EXCLUDED_PACKS, resolvePaths } from "./lib/config.mjs";

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--source") options.sourceRoot = argv[++index];
    else if (argv[index] === "--module") options.moduleRoot = argv[++index];
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return options;
}

function gitRaw(root, ...args) {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
}

function git(root, ...args) {
  return gitRaw(root, ...args).trim();
}

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

export async function createBaseline(options) {
  const paths = await resolvePaths(options);
  const protectedTranslations = {};

  for (const pack of EXCLUDED_PACKS) {
    const relativePath = `compendium/dnd5e.${pack}.json`;
    protectedTranslations[relativePath] = await sha256(path.join(paths.moduleRoot, relativePath));
  }

  return {
    schemaVersion: 1,
    source: {
      id: paths.sourceManifest.id,
      version: paths.sourceManifest.version,
      head: git(paths.sourceRoot, "rev-parse", "HEAD"),
      branch: git(paths.sourceRoot, "branch", "--show-current"),
      status: gitRaw(paths.sourceRoot, "status", "--short").trimEnd().split(/\r?\n/).filter(Boolean)
    },
    protectedTranslations
  };
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const moduleRoot = path.resolve(args.moduleRoot ?? path.join(import.meta.dirname, ".."));
  const sourceRoot = path.resolve(args.sourceRoot ?? "C:/Users/lmlor/Desktop/dnd5e");
  const baseline = await createBaseline({ moduleRoot, sourceRoot });
  const outputPath = path.join(moduleRoot, "reports", "baseline.json");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(baseline, null, 2)}\n`);
  process.stdout.write(`${outputPath}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
