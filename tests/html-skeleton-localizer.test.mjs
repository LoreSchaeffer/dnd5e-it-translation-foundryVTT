import assert from "node:assert/strict";
import test from "node:test";

import { localizeHtmlSkeleton } from "../scripts/lib/html-skeleton-localizer.mjs";

test("localizes source-shaped text and reference labels without changing markup", () => {
  const source = '<table border="1"><caption>Choices</caption><tr><td>@UUID[Compendium.test.Item.a]{Alpha}</td><td>3rd</td></tr></table>';
  const output = localizeHtmlSkeleton(source, {
    text: { Choices: "Scelte", "3rd": "3°" },
    labelsById: new Map([["a", "Alfa"]])
  });
  assert.equal(output, '<table border="1"><caption>Scelte</caption><tr><td>@UUID[Compendium.test.Item.a]{Alfa}</td><td>3°</td></tr></table>');
});

test("rejects untranslated visible text", () => {
  assert.throws(
    () => localizeHtmlSkeleton("<p>Unknown prose.</p>", { text: {}, labelsById: new Map() }),
    /Missing skeleton text translation/
  );
});
