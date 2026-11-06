import assert from "node:assert/strict";
import test from "node:test";

import { expandEntryCopies } from "../scripts/lib/entry-copies.mjs";

test("expands one legacy translation into stable duplicate source identities", () => {
  const result = expandEntryCopies({ entries: { Spellcasting: { name: "Incantesimi" } } }, {
    Spellcasting: [{ id: "bard", name: "Spellcasting" }, { id: "wizard", name: "Spellcasting" }]
  });
  assert.deepEqual(result.document.entries.bard, { _id: "bard", name: "Incantesimi" });
  assert.deepEqual(result.document.entries.wizard, { _id: "wizard", name: "Incantesimi" });
  assert.equal(result.document.entries.Spellcasting, undefined);
});

test("refuses to overwrite a copy target", () => {
  assert.throws(() => expandEntryCopies({ entries: { Old: {}, target: { description: "Completa" } } }, {
    Old: [{ id: "target", name: "New" }]
  }), /Refusing to overwrite/);
});

test("merges into a partial target while preserving its structured fields", () => {
  const result = expandEntryCopies({ entries: {
    Old: { name: "Tradotto", description: "Testo" },
    target: { name: "Provvisorio", requirements: "Classe 1" }
  } }, { Old: [{ id: "target", name: "New" }] });
  assert.deepEqual(result.document.entries.target, {
    _id: "target", name: "Tradotto", description: "Testo", requirements: "Classe 1"
  });
});
