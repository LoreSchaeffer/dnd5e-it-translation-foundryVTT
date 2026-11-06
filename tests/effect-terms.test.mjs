import assert from "node:assert/strict";
import test from "node:test";

import { effectTermOverrides } from "../scripts/lib/effect-terms.mjs";

function record(effects) {
  return { data: { effects } };
}

test("translates exact effect names and descriptions by stable effect ID", () => {
  const source = record([{ _id: "effect1", name: "Controlled", description: "<p>Rule.</p>" }]);
  const terms = new Map([["Controlled", "Controllato"], ["<p>Rule.</p>", "<p>Regola.</p>"]]);

  assert.deepEqual(effectTermOverrides(source, {}, terms), {
    "effects[effect1].name": "Controllato",
    "effects[effect1].description": "<p>Regola.</p>"
  });
});

test("leaves unknown and already translated effect fields unchanged", () => {
  const source = record([{ _id: "effect1", name: "Controlled", description: "<p>Unknown.</p>" }]);
  const translation = { effects: { effect1: { name: "Controllato" } } };

  assert.deepEqual(effectTermOverrides(source, translation, new Map([["Controlled", "Soggetto al Controllo"]])), {});
});
