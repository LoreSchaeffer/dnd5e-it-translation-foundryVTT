import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildRelease } from "../scripts/build-release.mjs";

const RUNTIME_DIRECTORIES = [
  "assets",
  "compendium",
  "fonts",
  "lang",
  "packs",
  "styles",
  "templates"
];

const RUNTIME_SCRIPTS = [
  "dnd-journal-styles.js",
  "metric-conversion.mjs",
  "section-parser.js",
  "statblock-parser.js"
];

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "dnd5e-release-source-"));
  const outputRoot = path.join(root, "dist", "module");

  await writeFile(path.join(root, "module.json"), `${JSON.stringify({ version: "3.0.5" })}\n`);
  await writeFile(path.join(root, "main.js"), "// runtime entry\n");

  for (const directory of RUNTIME_DIRECTORIES) {
    await mkdir(path.join(root, directory), { recursive: true });
    await writeFile(path.join(root, directory, "fixture.txt"), directory);
  }

  await mkdir(path.join(root, "scripts"), { recursive: true });
  for (const script of RUNTIME_SCRIPTS) {
    await writeFile(path.join(root, "scripts", script), `// ${script}\n`);
  }

  for (const extra of ["README.md", "package.json"]) {
    await writeFile(path.join(root, extra), "development only\n");
  }
  for (const extraDirectory of ["tests", "docs"]) {
    await mkdir(path.join(root, extraDirectory), { recursive: true });
    await writeFile(path.join(root, extraDirectory, "fixture.txt"), "development only\n");
  }
  await writeFile(path.join(root, "scripts", "build-release.mjs"), "// development only\n");

  return { root, outputRoot };
}

test("rejects a malformed release tag", async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));

  await assert.rejects(
    buildRelease({ ...fixture, tag: "release-3.0.5" }),
    /release tag must match v<major>\.<minor>\.<patch>/
  );
});

test("rejects a tag that differs from the manifest version", async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));

  await assert.rejects(
    buildRelease({ ...fixture, tag: "v3.0.6" }),
    /tag v3\.0\.6 does not match module version 3\.0\.5/
  );
});

test("refuses to stage over the source root", async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));

  await assert.rejects(
    buildRelease({ root: fixture.root, outputRoot: fixture.root, tag: "v3.0.5" }),
    /output directory must not be the repository root/
  );
});

test("stages only the Foundry runtime allowlist", async t => {
  const fixture = await createFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));

  const result = await buildRelease({ ...fixture, tag: "v3.0.5" });

  assert.deepEqual(result, { version: "3.0.5", outputRoot: fixture.outputRoot });
  assert.deepEqual(
    (await readdir(fixture.outputRoot)).sort(),
    ["assets", "compendium", "fonts", "lang", "main.js", "module.json", "packs", "scripts", "styles", "templates"]
  );
  assert.deepEqual((await readdir(path.join(fixture.outputRoot, "scripts"))).sort(), RUNTIME_SCRIPTS);
});
