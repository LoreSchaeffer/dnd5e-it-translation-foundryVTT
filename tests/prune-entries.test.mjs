import assert from "node:assert/strict";
import test from "node:test";

import { pruneObsoleteEntries } from "../scripts/lib/prune-entries.mjs";

test("prunes only configured entries absent from the authoritative source", () => {
  const input = { entries: { Current: { name: "Corrente" }, Legacy: { name: "Vecchio" } } };
  const result = pruneObsoleteEntries(input, ["Legacy"], new Set(["Current"]));
  assert.deepEqual(input.entries.Legacy, { name: "Vecchio" });
  assert.deepEqual(result.removed, ["Legacy"]);
  assert.deepEqual(Object.keys(result.document.entries), ["Current"]);
});

test("refuses to prune a live source entry", () => {
  assert.throws(
    () => pruneObsoleteEntries({ entries: { Current: {} } }, ["Current"], new Set(["Current"])),
    /Refusing to prune live source entry/
  );
});
