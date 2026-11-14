import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPOSITORY_URL = "https://github.com/LoreSchaeffer/dnd5e-it-translation-foundryVTT";
const MANIFEST_URL = `${REPOSITORY_URL}/releases/latest/download/module.json`;
const DOWNLOAD_URL = `${REPOSITORY_URL}/releases/download/v3.0.5/module.zip`;
const OLD_MANIFEST_URL = "https://github.com/LuckyFrico/dnd5e-it-translation-foundryVTT/releases/latest/download/module.json";

test("manifest publishes version 3.0.5 from the LoreSchaeffer fork", async () => {
  const manifest = JSON.parse(await readFile(path.join(ROOT, "module.json"), "utf8"));

  assert.equal(manifest.version, "3.0.5");
  assert.equal(manifest.url, REPOSITORY_URL);
  assert.equal(manifest.manifest, MANIFEST_URL);
  assert.equal(manifest.download, DOWNLOAD_URL);
  assert.equal(manifest.authors[0].name, "LuckyFrico");
  assert.equal(manifest.authors[0].url, "https://github.com/LuckyFrico");
});

test("README installs from the fork and uses its release manifest for badges", async () => {
  const readme = await readFile(path.join(ROOT, "README.md"), "utf8");

  assert.match(readme, new RegExp(`Installa modulo e incolla il seguente indirizzo: ${MANIFEST_URL}`));
  assert.ok(readme.includes(encodeURIComponent(MANIFEST_URL)));
  assert.ok(!readme.includes(OLD_MANIFEST_URL));
  assert.ok(!readme.includes(encodeURIComponent(OLD_MANIFEST_URL)));
});
