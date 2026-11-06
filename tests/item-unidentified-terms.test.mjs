import assert from "node:assert/strict";
import test from "node:test";

import { itemUnidentifiedOverrides } from "../scripts/lib/item-unidentified-terms.mjs";

function record(name, description) {
  return { data: { system: { unidentified: { name, description } } } };
}

test("translates exact unidentified item fields", () => {
  const source = record("Unidentified Potion", "<p>Cloudy.</p>");
  const terms = new Map([
    ["Unidentified Potion", "Pozione Non Identificata"],
    ["<p>Cloudy.</p>", "<p>Torbida.</p>"]
  ]);

  assert.deepEqual(itemUnidentifiedOverrides(source, {}, terms), {
    "system.unidentified.name": "Pozione Non Identificata",
    "system.unidentified.description": "<p>Torbida.</p>"
  });
});

test("does not translate unknown or already populated unidentified fields", () => {
  const source = record("Unidentified Potion", "<p>Unknown.</p>");
  const translation = { unidentified: { name: "Pozione Misteriosa" } };

  assert.deepEqual(itemUnidentifiedOverrides(source, translation, new Map([["Unidentified Potion", "Pozione Non Identificata"]])), {});
});
