import assert from "node:assert/strict";
import test from "node:test";

import { translateFeatureFolder, translateRequirement } from "../scripts/lib/legacy-structure.mjs";

test("translates compound legacy requirements without changing levels", () => {
  assert.equal(
    translateRequirement("Fighter 1, Champion 10, Paladin 2"),
    "Guerriero 1, Campione 10, Paladino 2"
  );
  assert.equal(translateRequirement("Warlock 12, Pact of the Blade"), "Warlock 12°, Patto della Lama");
  assert.equal(translateRequirement("Ranger 2"), "Ranger 2°");
  assert.equal(translateRequirement("STR 13 or higher"), "FOR 13 o superiore");
});

test("translates every configured legacy feature folder", () => {
  assert.equal(translateFeatureFolder("Circle of the Land Features"), "Privilegi del Circolo della Terra");
  assert.equal(translateFeatureFolder("Eldritch Invocations"), "Suppliche Occulte");
  assert.equal(translateFeatureFolder("Unknown"), null);
});
