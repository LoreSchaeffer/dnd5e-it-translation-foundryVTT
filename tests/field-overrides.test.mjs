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
