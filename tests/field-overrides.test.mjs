import assert from "node:assert/strict";
import test from "node:test";

import { applyFieldOverrides, entryKeyForRecord } from "../scripts/lib/field-overrides.mjs";

test("applies requirements and activity names by stable source ID without mutation", () => {
  const entry = { name: "Fonte di Magia" };
  const output = applyFieldOverrides(entry, {
    "system.requirements": "Stregone 2",
    "system.activities.activity123.name": "Recupera Slot Incantesimo",
    "effects[effect123].description": "Descrizione dell'effetto"
  });
  assert.deepEqual(entry, { name: "Fonte di Magia" });
  assert.deepEqual(output, {
    name: "Fonte di Magia",
    requirements: "Stregone 2",
    activities: { activity123: { name: "Recupera Slot Incantesimo" } },
    effects: { effect123: { description: "Descrizione dell'effetto" } }
  });
});

test("rejects unsupported mechanical paths", () => {
  assert.throws(() => applyFieldOverrides({}, { "system.uses.max": "2" }), /Unsupported visible field/);
});

test("maps activity profile fields to nested Babele profile IDs", () => {
  const output = applyFieldOverrides({}, {
    "system.activities.activity123.profiles[profile456].name": "Forma Bestiale"
  });
  assert.deepEqual(output, {
    activities: {
      activity123: {
        profiles: { profile456: { name: "Forma Bestiale" } }
      }
    }
  });
});

test("uses stable IDs when a visible source name is duplicated", () => {
  const entries = { "Extra Attack": { _id: "ranger", name: "Attacco Extra" } };
  assert.equal(entryKeyForRecord(entries, { id: "fighter", name: "Extra Attack" }, new Set(["Extra Attack"])), "fighter");
  assert.equal(entryKeyForRecord(entries, { id: "ranger", name: "Extra Attack" }, new Set(["Extra Attack"])), "Extra Attack");
});

test("maps embedded items, journal pages, table results, and actor details", () => {
  const output = applyFieldOverrides({}, {
    "items[item1].system.description.value": "Descrizione",
    "pages[page1].text.content": "Contenuto",
    "results[result1].text": "Esito",
    "system.details.biography.value": "Biografia"
  });
  assert.equal(output.items.item1.description, "Descrizione");
  assert.equal(output.pages.page1.text.content, "Contenuto");
  assert.equal(output.results.result1.text, "Esito");
  assert.equal(output.details.biography.value, "Biografia");
});
