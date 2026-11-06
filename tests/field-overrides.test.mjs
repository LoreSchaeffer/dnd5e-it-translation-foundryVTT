import assert from "node:assert/strict";
import test from "node:test";

import { applyFieldOverrides } from "../scripts/lib/field-overrides.mjs";

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
