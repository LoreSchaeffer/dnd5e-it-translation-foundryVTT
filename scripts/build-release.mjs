import { cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RUNTIME_DIRECTORIES = Object.freeze([
  "assets",
  "compendium",
  "fonts",
  "lang",
  "packs",
  "styles",
  "templates"
]);

const RUNTIME_SCRIPTS = Object.freeze([
  "dnd-journal-styles.js",
  "metric-conversion.mjs",
  "section-parser.js",
  "statblock-parser.js"
]);

export const RUNTIME_ENTRIES = Object.freeze([
  "module.json",
  "main.js",
  ...RUNTIME_DIRECTORIES,
  ...RUNTIME_SCRIPTS.map(file => `scripts/${file}`)
]);

export async function buildRelease({ root, outputRoot, tag }) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag ?? "")) {
    throw new Error("release tag must match v<major>.<minor>.<patch>");
  }

  const resolvedRoot = path.resolve(root);
  const resolvedOutput = path.resolve(outputRoot);
  const rootRelativeToOutput = path.relative(resolvedOutput, resolvedRoot);
  if (rootRelativeToOutput === "" || (!rootRelativeToOutput.startsWith("..") && !path.isAbsolute(rootRelativeToOutput))) {
    throw new Error("output directory must not be the repository root or one of its ancestors");
  }
  const manifest = JSON.parse(await readFile(path.join(resolvedRoot, "module.json"), "utf8"));
  const tagVersion = tag.slice(1);

  if (tagVersion !== manifest.version) {
    throw new Error(`tag ${tag} does not match module version ${manifest.version}`);
  }

  await rm(resolvedOutput, { recursive: true, force: true });
  await mkdir(resolvedOutput, { recursive: true });

  for (const file of ["module.json", "main.js"]) {
    await cp(path.join(resolvedRoot, file), path.join(resolvedOutput, file));
  }

  for (const directory of RUNTIME_DIRECTORIES) {
    await cp(path.join(resolvedRoot, directory), path.join(resolvedOutput, directory), { recursive: true });
  }

  const outputScripts = path.join(resolvedOutput, "scripts");
  await mkdir(outputScripts, { recursive: true });
  for (const file of RUNTIME_SCRIPTS) {
    await cp(path.join(resolvedRoot, "scripts", file), path.join(outputScripts, file));
  }

  return { version: manifest.version, outputRoot: resolvedOutput };
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--tag") options.tag = argv[++index];
    else if (argv[index] === "--output") options.outputRoot = argv[++index];
    else throw new Error(`unknown argument: ${argv[index]}`);
  }

  if (!options.tag) throw new Error("missing required --tag argument");
  if (!options.outputRoot) throw new Error("missing required --output argument");
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const root = path.resolve(import.meta.dirname, "..");
  const result = await buildRelease({ root, ...options });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
