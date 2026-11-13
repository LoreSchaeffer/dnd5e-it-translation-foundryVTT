import assert from "node:assert/strict";
import test from "node:test";

import * as exactMemory from "../scripts/lib/exact-memory.mjs";

const { buildExactMemory, exactMissingOverrides } = exactMemory;

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

test("configured phrases fill only exact missing visible fields", () => {
  assert.equal(typeof exactMemory.configuredMissingOverrides, "function");
  const source = record("a", "Claw", "<p>Sharp claw.</p>");
  const overrides = exactMemory.configuredMissingOverrides(
    source,
    { name: "Artiglio esistente" },
    { Claw: "Artiglio", "<p>Sharp claw.</p>": "<p>Artiglio affilato.</p>", Sharp: "Affilato" }
  );
  assert.deepEqual(overrides, {
    "system.description.value": "<p>Artiglio affilato.</p>"
  });
});

test("configured folder translation preserves an existing value", () => {
  assert.equal(typeof exactMemory.configuredFolderTranslation, "function");
  assert.equal(exactMemory.configuredFolderTranslation("Beast", undefined, { Beast: "Bestia" }), "Bestia");
  assert.equal(exactMemory.configuredFolderTranslation("Beast", "Bestie esistente", { Beast: "Bestia" }), "Bestie esistente");
  assert.equal(exactMemory.configuredFolderTranslation("Unknown", undefined, { Beast: "Bestia" }), undefined);
});
