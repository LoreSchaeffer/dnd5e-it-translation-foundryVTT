import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { loadBabelePack } from "../scripts/lib/babele-inventory.mjs";
import { loadSourcePack } from "../scripts/lib/source-inventory.mjs";
import { walkVisibleFields } from "../scripts/lib/visible-fields.mjs";

const FIXTURES = path.join(import.meta.dirname, "fixtures");

test("loadSourcePack keeps duplicate names separately by stable ID", async () => {
  const records = await loadSourcePack(path.join(FIXTURES, "source", "mixed"));
  const duplicates = records.filter(record => record.name === "Flame Test");

  assert.equal(duplicates.length, 2);
  assert.deepEqual(duplicates.map(record => record.id).sort(), [
    "item000000000001",
    "item000000000002"
  ]);
  assert.equal(records.find(record => record.id === "folder0000000001").documentType, "Folder");
  assert.ok(records.every(record => record.pack === "mixed"));
  assert.ok(records.every(record => record.sourcePath.endsWith(".yml")));
});

test("loadSourcePack detects representative Foundry document types", async () => {
  const records = await loadSourcePack(path.join(FIXTURES, "source", "mixed"));
  const typesById = Object.fromEntries(records.map(record => [record.id, record.documentType]));

  assert.equal(typesById.item000000000001, "Item");
  assert.equal(typesById.actor00000000001, "Actor");
  assert.equal(typesById.journal000000001, "JournalEntry");
  assert.equal(typesById.table00000000001, "RollTable");
  assert.equal(typesById.effect0000000001, "ActiveEffect");
});

test("loadBabelePack normalizes entry and folder records", async () => {
  const records = await loadBabelePack(path.join(FIXTURES, "compendium", "dnd5e.mixed.json"));

  assert.deepEqual(
    records.map(record => [record.kind, record.lookupKey, record.pack, record.documentType]),
    [
      ["folder", "Adventuring Gear", "mixed", "Folder"],
      ["entry", "Flame Test", "mixed", "BabeleEntry"],
      ["entry", "Sample Outcomes", "mixed", "BabeleEntry"]
    ]
  );
  assert.equal(records[1].data.name, "Prova di Fiamma");
});

test("walkVisibleFields includes Item activities and excludes formulas, flags, IDs, and images", async () => {
  const records = await loadSourcePack(path.join(FIXTURES, "source", "mixed"));
  const item = records.find(record => record.id === "item000000000001");
  const fields = walkVisibleFields(item);
  const values = fields.map(field => field.value);

  assert.ok(values.includes("Flame Test"));
  assert.ok(values.includes("<p>A flame appears within 30 feet.</p>"));
  assert.ok(values.includes("A brief flame."));
  assert.ok(values.includes("a pinch of ash"));
  assert.ok(values.includes("Cast Flame"));
  assert.ok(values.includes("<p>The target makes a save.</p>"));
  assert.ok(!values.includes("1d6 + @mod"));
  assert.ok(!values.includes("icons/svg/fire.svg"));
  assert.ok(!values.includes("item000000000001"));
  assert.ok(!fields.some(field => field.fieldPath.startsWith("flags.")));
});

test("walkVisibleFields descends into Actor embedded items", async () => {
  const records = await loadSourcePack(path.join(FIXTURES, "source", "mixed"));
  const actor = records.find(record => record.id === "actor00000000001");
  const fields = walkVisibleFields(actor);

  assert.ok(fields.some(field => field.fieldPath === "items[embedded00000001].name" && field.value === "Embedded Sword"));
  assert.ok(fields.some(field => field.fieldPath === "items[embedded00000001].system.description.value" && field.value.includes("well-balanced")));
  assert.ok(fields.some(field => field.fieldPath === "system.details.biography.value"));
  assert.ok(fields.some(field => field.fieldPath === "system.details.alignment" && field.value === "Neutral Good"));
  assert.ok(!fields.some(field => field.value === "1" || field.value === "8"));
});

test("walkVisibleFields includes Journal pages and RollTable text results", async () => {
  const records = await loadSourcePack(path.join(FIXTURES, "source", "mixed"));
  const journalFields = walkVisibleFields(records.find(record => record.id === "journal000000001"));
  const tableFields = walkVisibleFields(records.find(record => record.id === "table00000000001"));

  assert.ok(journalFields.some(field => field.fieldPath === "pages[page000000000001].name" && field.value === "Movement"));
  assert.ok(journalFields.some(field => field.fieldPath === "pages[page000000000001].text.content" && field.value.includes("Travel pace")));
  assert.ok(journalFields.some(field => field.fieldPath === "pages[page000000000002].system.tooltip" && field.value === "Movement reference"));
  assert.ok(!journalFields.some(field => field.value === "movement"));
  assert.ok(tableFields.some(field => field.fieldPath === "results[result0000000001].text" && field.value === "A silver key"));
  assert.ok(!tableFields.some(field => field.value === "Compendium.dnd5e.items.Item.item000000000001"));
  assert.ok(!tableFields.some(field => field.value === "1d2"));
});

test("walkVisibleFields includes effect prose but excludes mechanical change values", async () => {
  const records = await loadSourcePack(path.join(FIXTURES, "source", "mixed"));
  const effect = records.find(record => record.id === "effect0000000001");
  const fields = walkVisibleFields(effect);
  const values = fields.map(field => field.value);

  assert.ok(values.includes("Celestial Ward"));
  assert.ok(values.includes("<p>A visible effect description.</p>"));
  assert.ok(fields.some(field => field.fieldPath === "changes[0].value" && field.value === "Celestial guardian"));
  assert.ok(!values.includes("+2"));
  assert.ok(!values.includes("fire"));
  assert.ok(!values.includes("system.details.type.custom"));
});

