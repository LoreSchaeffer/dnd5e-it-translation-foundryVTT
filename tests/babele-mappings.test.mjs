import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const moduleRoot = path.resolve(import.meta.dirname, "..");

test("structured mappings use containers supported by Babele 2.9", async () => {
  const compendiumRoot = path.join(moduleRoot, "compendium");
  const files = (await readdir(compendiumRoot)).filter(file => file.endsWith(".json"));
  const invalid = [];

  for (const file of files) {
    const document = JSON.parse(await readFile(path.join(compendiumRoot, file), "utf8"));
    for (const [field, mapping] of Object.entries(document.mapping ?? {})) {
      if (mapping?.converter !== "structured") continue;
      if (mapping.cardinality !== "one" && !["array", "keyed"].includes(mapping.container)) {
        invalid.push(`${file}:${field}:${mapping.container ?? "missing"}`);
      }
      if (field === "activities" && mapping.container !== "keyed") {
        invalid.push(`${file}:${field}:activities-require-keyed`);
      }
    }
  }

  assert.deepEqual(invalid, []);
});

test("module requires a Babele version with the structured converter", async () => {
  const manifest = JSON.parse(await readFile(path.join(moduleRoot, "module.json"), "utf8"));
  const babele = manifest.relationships.requires.find(requirement => requirement.id === "babele");
  assert.equal(babele?.compatibility?.minimum, "2.9.1");
});
