import assert from "node:assert/strict";
import test from "node:test";

import { applyStructuredTermsToDocument } from "../scripts/lib/structured-terms.mjs";

test("applies advancement titles and hints by stable ID without mutating inputs", () => {
  const source = {
    name: "Wizard",
    system: {
      advancement: [
        { _id: "feature1", title: "Features", hint: "Choose wisely." },
        { _id: "empty", title: "" }
      ]
    }
  };
  const translation = { name: "Mago" };
  const phrases = { Features: "Privilegi", "Choose wisely.": "Scegli con cura." };
  const sourceSnapshot = structuredClone(source);
  const translationSnapshot = structuredClone(translation);

  const result = applyStructuredTermsToDocument(source, translation, phrases);
  assert.deepEqual(result.translation, {
    name: "Mago",
    advancement: {
      feature1: { title: "Privilegi", hint: "Scegli con cura." }
    }
  });
  assert.deepEqual(result.missing, []);
  assert.deepEqual(source, sourceSnapshot);
  assert.deepEqual(translation, translationSnapshot);
});

test("reports a non-empty phrase absent from the canonical map", () => {
  const result = applyStructuredTermsToDocument({
    name: "Wizard",
    system: { advancement: [{ _id: "feature1", title: "Unknown Feature" }] }
  }, {}, {});

  assert.deepEqual(result.missing, [{ id: "feature1", field: "title", value: "Unknown Feature" }]);
});
