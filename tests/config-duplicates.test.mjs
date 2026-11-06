import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import yaml from "js-yaml";

test("spell field overrides contain no duplicate document keys", async () => {
  const filePath = path.join(process.cwd(), "config", "spell-nested-overrides.json");
  const source = await readFile(filePath, "utf8");

  assert.doesNotThrow(
    () => yaml.load(source, { json: false }),
    "duplicate document keys silently discard earlier field overrides"
  );
});
