import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const GLOSSARY_PATH = path.join(ROOT, "glossary", "glossary.json");
const REQUIRED_CATEGORIES = [
  "abilities",
  "skills",
  "saving-throws",
  "conditions",
  "creature-types",
  "sizes",
  "alignments",
  "magic-schools",
  "damage-types",
  "actions-reactions",
  "spell-components",
  "equipment",
  "class-features",
  "combat",
  "effects",
  "units"
];
const REQUIRED_DOCS = [
  "glossary/README.md",
  "docs/translation-guide.md",
  "docs/foundry-format-preservation.md",
  "docs/metric-conversion.md",
  "docs/translation-workflow.md",
  "docs/updating-dnd5e.md",
  "docs/quality-checklist.md"
];

async function glossary() {
  return JSON.parse(await readFile(GLOSSARY_PATH, "utf8"));
}

test("glossary has a version and every entry satisfies the canonical schema", async () => {
  const data = await glossary();
  assert.match(data.version, /^\d+\.\d+\.\d+$/);
  assert.ok(Array.isArray(data.entries));
  assert.ok(data.entries.length >= 50);

  for (const [index, entry] of data.entries.entries()) {
    for (const key of ["english", "italian", "category", "gender", "plural", "usage", "source", "status"]) {
      assert.equal(typeof entry[key], "string", `entry ${index} missing string ${key}`);
      assert.notEqual(entry[key].trim(), "", `entry ${index} has blank ${key}`);
    }
    assert.ok(["verified", "proposed", "review"].includes(entry.status), `entry ${index} has invalid status`);
  }
});

test("glossary covers every required terminology category", async () => {
  const data = await glossary();
  const categories = new Set(data.entries.map(entry => entry.category));
  for (const category of REQUIRED_CATEGORIES) assert.ok(categories.has(category), `missing category ${category}`);
});

test("glossary has no duplicate English term in the same scope", async () => {
  const data = await glossary();
  const seen = new Set();
  for (const entry of data.entries) {
    const key = `${entry.english.toLocaleLowerCase("en")}|${entry.scope ?? "global"}`;
    assert.ok(!seen.has(key), `duplicate glossary key ${key}`);
    seen.add(key);
  }
});

test("different Italian renderings of one English term require explicit scoped rationale", async () => {
  const data = await glossary();
  const groups = Map.groupBy(data.entries, entry => entry.english.toLocaleLowerCase("en"));
  for (const [english, entries] of groups) {
    if (new Set(entries.map(entry => entry.italian)).size <= 1) continue;
    for (const entry of entries) {
      assert.equal(typeof entry.scope, "string", `${english} variant missing scope`);
      assert.equal(typeof entry.rationale, "string", `${english} variant missing rationale`);
      assert.notEqual(entry.rationale.trim(), "", `${english} variant has blank rationale`);
    }
  }
});

test("required contributor documents exist and relative Markdown links resolve", async () => {
  for (const relativePath of REQUIRED_DOCS) {
    const filePath = path.join(ROOT, relativePath);
    await access(filePath);
    const content = await readFile(filePath, "utf8");
    for (const match of content.matchAll(/\[[^\]]+\]\((?!https?:|#)([^)]+)\)/g)) {
      const target = match[1].split("#", 1)[0];
      if (!target) continue;
      await access(path.resolve(path.dirname(filePath), target));
    }
  }
});

