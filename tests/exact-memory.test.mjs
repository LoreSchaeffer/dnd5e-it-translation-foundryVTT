import assert from "node:assert/strict";
import test from "node:test";

import { buildExactMemory, exactMissingOverrides } from "../scripts/lib/exact-memory.mjs";

function record(id, name, description) {
  return { kind: "document", id, name, data: { name, system: { description: { value: description } } } };
}

test("reuses only unambiguous exact visible translations", () => {
  const source = record("a", "Claw", "<p>Sharp.</p>");
  const memory = buildExactMemory([{ source, translation: { name: "Artiglio", description: "<p>Affilato.</p>" } }]);
  assert.equal(memory.get("Claw"), "Artiglio");
  assert.deepEqual(exactMissingOverrides(record("b", "Claw", "<p>Sharp.</p>"), {}, memory), {
    name: "Artiglio",
    "system.description.value": "<p>Affilato.</p>"
  });
});

test("rejects conflicting translations for the same source value", () => {
  const source = record("a", "Charge", "<p>Rule.</p>");
  const memory = buildExactMemory([
    { source, translation: { name: "Carica", description: "<p>Regola.</p>" } },
    { source, translation: { name: "Assalto", description: "<p>Regola.</p>" } }
  ]);
  assert.equal(memory.has("Charge"), false);
});
