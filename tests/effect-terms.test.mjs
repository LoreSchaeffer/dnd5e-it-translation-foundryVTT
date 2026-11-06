import assert from "node:assert/strict";
import test from "node:test";

import { buildEffectTerms, effectTermOverrides } from "../scripts/lib/effect-terms.mjs";

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

test("expands configured level families to exact English ordinal names", () => {
  const terms = buildEffectTerms([{ sourceFamily: "Aid", translationFamily: "Aiuto", levels: [2, 3, 4] }]);

  assert.equal(terms.get("Aid: 2nd Level"), "Aiuto: 2° Livello");
  assert.equal(terms.get("Aid: 3rd Level"), "Aiuto: 3° Livello");
  assert.equal(terms.get("Aid: 4th Level"), "Aiuto: 4° Livello");
});
