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

test("stitches only fully known translated HTML segments", () => {
  assert.equal(typeof exactMemory.buildExactSegmentMemory, "function");
  assert.equal(typeof exactMemory.segmentMissingOverrides, "function");
  const first = record("a", "First", "<p>First rule.</p><p>Shared rule.</p>");
  const second = record("b", "Second", "<p>Second rule.</p>");
  const memory = exactMemory.buildExactSegmentMemory([
    { source: first, translation: { name: "Primo", description: "<p>Prima regola.</p><p>Regola condivisa.</p>" } },
    { source: second, translation: { name: "Secondo", description: "<p>Seconda regola.</p>" } }
  ]);

  assert.deepEqual(
    exactMemory.segmentMissingOverrides(
      record("c", "Combined", "<p>First rule.</p><p>Second rule.</p>"),
      {},
      memory
    ),
    { "system.description.value": "<p>Prima regola.</p><p>Seconda regola.</p>" }
  );
  assert.deepEqual(
    exactMemory.segmentMissingOverrides(
      record("d", "Partial", "<p>First rule.</p><p>Unknown rule.</p>"),
      {},
      memory
    ),
    {}
  );
  assert.deepEqual(
    exactMemory.segmentMissingOverrides(
      record("e", "Technical", "<p>[[/attack extended]]. [[/damage extended]].</p><p>First rule.</p>"),
      {},
      memory
    ),
    {
      "system.description.value": "<p>[[/attack extended]]. [[/damage extended]].</p><p>Prima regola.</p>"
    }
  );
});

test("segment memory rejects ambiguity and changed Foundry mechanics", () => {
  const source = record("a", "Breath", "<p>Take [[/damage 2d6 fire]] damage.</p>");
  const conflicting = record("b", "Breath 2", "<p>Take [[/damage 2d6 fire]] damage.</p>");
  const memory = exactMemory.buildExactSegmentMemory([
    { source, translation: { name: "Soffio", description: "<p>Subisci [[/damage 2d6 fire]] danni.</p>" } },
    { source: conflicting, translation: { name: "Soffio 2", description: "<p>Ricevi [[/damage 2d6 fire]] danni.</p>" } },
    {
      source: record("c", "Broken", "<p>Roll [[/save ability=dex]].</p>"),
      translation: { name: "Rotto", description: "<p>Tira [[/save ability=con]].</p>" }
    }
  ]);

  assert.equal(memory.has("Take [[/damage 2d6 fire]] damage."), false);
  assert.equal(memory.has("Roll [[/save ability=dex]]."), false);
});
