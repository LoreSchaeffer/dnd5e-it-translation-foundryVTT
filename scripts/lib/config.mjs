import { access, readFile } from "node:fs/promises";
import path from "node:path";

export const REQUIRED_DND5E_VERSION = "6.0.6";

export const LEGACY_PACKS = Object.freeze([
  "backgrounds",
  "classes",
  "classfeatures",
  "heroes",
  "items",
  "monsterfeatures",
  "monsters",
  "races",
  "rules",
  "spells",
  "subclasses",
  "tables",
  "tradegoods"
]);

export const EFFECTS_PACK = "effects";

export const EXCLUDED_PACKS = Object.freeze([
  "actors24",
  "classes24",
  "content24",
  "equipment24",
  "feats24",
  "monsterfeatures24",
  "origins24",
  "spells24",
  "tables24"
]);

export const IN_SCOPE_PACKS = Object.freeze([...LEGACY_PACKS, EFFECTS_PACK]);

async function requireDirectory(directory, label) {
  try {
    await access(directory);
  } catch {
    throw new Error(`${label} does not exist: ${directory}`);
  }
}

export async function resolvePaths({ moduleRoot, sourceRoot }) {
  if (!moduleRoot || !sourceRoot) {
    throw new Error("Both moduleRoot and sourceRoot are required");
  }

  const resolvedModuleRoot = path.resolve(moduleRoot);
  const resolvedSourceRoot = path.resolve(sourceRoot);
  const manifestPath = path.join(resolvedSourceRoot, "system.json");
  let sourceManifest;

  try {
    sourceManifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read dnd5e manifest at ${manifestPath}: ${error.message}`);
  }

  if (sourceManifest.id !== "dnd5e" || sourceManifest.version !== REQUIRED_DND5E_VERSION) {
    throw new Error(
      `Expected dnd5e ${REQUIRED_DND5E_VERSION}, found ${sourceManifest.id ?? "unknown"} ${sourceManifest.version ?? "unknown"}`
    );
  }

  const sourcePacksRoot = path.join(resolvedSourceRoot, "packs", "_source");
  const compendiumRoot = path.join(resolvedModuleRoot, "compendium");
  await requireDirectory(sourcePacksRoot, "Extracted dnd5e pack source");
  await requireDirectory(compendiumRoot, "Babele compendium directory");

  return {
    moduleRoot: resolvedModuleRoot,
    sourceRoot: resolvedSourceRoot,
    sourcePacksRoot,
    compendiumRoot,
    sourceManifest
  };
}
