import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  EFFECTS_PACK,
  EXCLUDED_PACKS,
  LEGACY_PACKS,
  resolvePaths
} from "../scripts/lib/config.mjs";
import { createBaseline } from "../scripts/snapshot-baseline.mjs";

const MODULE_ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_ROOT = "C:/Users/lmlor/Desktop/dnd5e";

test("scope excludes modern packs while retaining every legacy pack and shared effects", () => {
  assert.deepEqual(LEGACY_PACKS, [
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
  assert.equal(EFFECTS_PACK, "effects");
  assert.deepEqual(EXCLUDED_PACKS, [
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
});

test("resolvePaths accepts the authoritative local dnd5e 6.0.6 source", async () => {
  const resolved = await resolvePaths({
    moduleRoot: MODULE_ROOT,
    sourceRoot: SOURCE_ROOT
  });

  assert.equal(resolved.sourceManifest.id, "dnd5e");
  assert.equal(resolved.sourceManifest.version, "6.0.6");
  assert.equal(resolved.sourcePacksRoot, path.join(path.resolve(SOURCE_ROOT), "packs", "_source"));
  assert.equal(resolved.compendiumRoot, path.join(MODULE_ROOT, "compendium"));
});

test("resolvePaths rejects a dnd5e source with the wrong version", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "dnd5e-wrong-version-"));
  await mkdir(path.join(root, "packs", "_source"), { recursive: true });
  await writeFile(path.join(root, "system.json"), JSON.stringify({ id: "dnd5e", version: "6.1.0" }));

  await assert.rejects(
    resolvePaths({ moduleRoot: MODULE_ROOT, sourceRoot: root }),
    /Expected dnd5e 6\.0\.6, found dnd5e 6\.1\.0/
  );
});

test("createBaseline records source Git state and exact hashes for every protected translation", async () => {
  const baseline = await createBaseline({ moduleRoot: MODULE_ROOT, sourceRoot: SOURCE_ROOT });

  assert.equal(baseline.schemaVersion, 1);
  assert.equal(baseline.source.branch, "6.1.x");
  assert.equal(baseline.source.head, "93ba0dc3e837b66864ec385b8419882009b12e4e");
  assert.deepEqual(baseline.source.status, [
    " M less/v2/typography.less",
    " M less/v3/chat.less"
  ]);
  assert.equal(Object.keys(baseline.protectedTranslations).length, EXCLUDED_PACKS.length);
  assert.equal(
    baseline.protectedTranslations["compendium/dnd5e.actors24.json"],
    "13875102c77fa71481908c7039cc4c7dbc9c329b2d030e7b94228ab7ec48c6ae"
  );
});
