import assert from "node:assert/strict";
import test from "node:test";

import { migrateEntryAliases } from "../scripts/lib/entry-aliases.mjs";

test("migrates a legacy prefixed key to a stable source identity", () => {
  const input = { entries: { "Invocation: Test": { name: "Invocazione di Prova" } } };
  const result = migrateEntryAliases(input, {
    "Invocation: Test": { id: "source123", name: "Test" }
  });
  assert.equal(input.entries["Invocation: Test"].name, "Invocazione di Prova");
  assert.deepEqual(result.document.entries.Test, { _id: "source123", name: "Invocazione di Prova" });
  assert.equal(result.document.entries["Invocation: Test"], undefined);
});

test("refuses to overwrite an existing source key", () => {
  assert.throws(() => migrateEntryAliases({ entries: { Old: {}, New: {} } }, {
    Old: { id: "id1", name: "New" }
  }), /Refusing to overwrite/);
});
