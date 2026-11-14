import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
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

async function createSourceFixture(t, { version = "6.0.6", initializeGit = false } = {}) {
  const fixtureParent = initializeGit ? path.join(MODULE_ROOT, "tmp") : tmpdir();
  await mkdir(fixtureParent, { recursive: true });
  const root = await mkdtemp(path.join(fixtureParent, "dnd5e-source-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "packs", "_source"), { recursive: true });
  await writeFile(path.join(root, "system.json"), JSON.stringify({ id: "dnd5e", version }));

  if (!initializeGit) return { root };

  await mkdir(path.join(root, "less", "v2"), { recursive: true });
  await mkdir(path.join(root, "less", "v3"), { recursive: true });
  await writeFile(path.join(root, "less", "v2", "typography.less"), "original\n");
  await writeFile(path.join(root, "less", "v3", "chat.less"), "original\n");
  execFileSync("git", ["-C", root, "init", "-b", "6.1.x"]);
  execFileSync("git", ["-C", root, "config", "core.autocrlf", "false"]);
  execFileSync("git", ["-C", root, "config", "user.name", "Test Fixture"]);
  execFileSync("git", ["-C", root, "config", "user.email", "fixture@example.invalid"]);
  execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", ["-C", root, "commit", "-m", "fixture"], { stdio: "ignore" });
  const head = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  await writeFile(path.join(root, "less", "v2", "typography.less"), "modified\n");
  await writeFile(path.join(root, "less", "v3", "chat.less"), "modified\n");
  return { root, head };
}

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

test("resolvePaths accepts a portable dnd5e 6.0.6 source fixture", async t => {
  const source = await createSourceFixture(t);
  const resolved = await resolvePaths({
    moduleRoot: MODULE_ROOT,
    sourceRoot: source.root
  });

  assert.equal(resolved.sourceManifest.id, "dnd5e");
  assert.equal(resolved.sourceManifest.version, "6.0.6");
  assert.equal(resolved.sourcePacksRoot, path.join(source.root, "packs", "_source"));
  assert.equal(resolved.compendiumRoot, path.join(MODULE_ROOT, "compendium"));
});

test("resolvePaths rejects a dnd5e source with the wrong version", async t => {
  const source = await createSourceFixture(t, { version: "6.1.0" });

  await assert.rejects(
    resolvePaths({ moduleRoot: MODULE_ROOT, sourceRoot: source.root }),
    /Expected dnd5e 6\.0\.6, found dnd5e 6\.1\.0/
  );
});

test("createBaseline records fixture Git state and exact hashes for every protected translation", async t => {
  const source = await createSourceFixture(t, { initializeGit: true });
  const baseline = await createBaseline({ moduleRoot: MODULE_ROOT, sourceRoot: source.root });

  assert.equal(baseline.schemaVersion, 1);
  assert.equal(baseline.source.branch, "6.1.x");
  assert.equal(baseline.source.head, source.head);
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
