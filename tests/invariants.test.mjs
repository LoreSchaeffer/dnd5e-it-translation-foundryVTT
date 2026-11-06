import assert from "node:assert/strict";
import test from "node:test";

import { compareInvariants } from "../scripts/lib/invariants.mjs";

function codes(source, translation) {
  return compareInvariants(source, translation).map(diagnostic => diagnostic.code);
}

test("allows translated visible text while preserving nested HTML, lists, and tables", () => {
  const source = '<section class="rules"><h2>Travel</h2><ul><li>Walk</li></ul><table><tr><td data-col="speed">30 feet</td></tr></table></section>';
  const translation = '<section class="rules"><h2>Viaggio</h2><ul><li>Camminare</li></ul><table><tr><td data-col="speed">9 metri</td></tr></table></section>';

  assert.deepEqual(compareInvariants(source, translation), []);
});

test("reports a removed tag and truncated markup", () => {
  const source = "<blockquote><p><strong>Warning.</strong></p></blockquote>";
  const translation = "<blockquote><p><strong>Attenzione.</p></blockquote>";
  const result = codes(source, translation);

  assert.ok(result.includes("html-tag-sequence"));
  assert.ok(result.includes("html-balance"));
});

test("reports changed HTML attributes without comparing visible text", () => {
  const source = '<p class="note" id="rule" style="color:red" data-rule="travel">Text</p>';
  const translation = '<p class="nota" id="rule" style="color:red" data-rule="travel">Testo</p>';

  assert.ok(codes(source, translation).includes("html-attributes"));
});

test("allows translating UUID labels while preserving targets", () => {
  const source = "See @UUID[Compendium.dnd5e.rules.JournalEntry.abc.JournalEntryPage.def]{Movement Rules}.";
  const translation = "Vedi @UUID[Compendium.dnd5e.rules.JournalEntry.abc.JournalEntryPage.def]{Regole di Movimento}.";

  assert.deepEqual(compareInvariants(source, translation), []);
});

test("reports a changed UUID target", () => {
  const source = "@UUID[Compendium.dnd5e.items.Item.abc]{Sword}";
  const translation = "@UUID[Compendium.dnd5e.items.Item.xyz]{Spada}";

  assert.ok(codes(source, translation).includes("foundry-references"));
});

test("reports removed or reordered Foundry references", () => {
  const source = "@Compendium[dnd5e.items.abc]{Sword} and @Check[athletics dc=15]{Athletics}";
  const removed = "@Compendium[dnd5e.items.abc]{Spada}";
  const reordered = "@Check[athletics dc=15]{Atletica} e @Compendium[dnd5e.items.abc]{Spada}";

  assert.ok(codes(source, removed).includes("foundry-reference-count"));
  assert.ok(codes(source, reordered).includes("foundry-references"));
});

test("reports changed inline rolls and slash commands", () => {
  assert.ok(codes("Roll [[1d20 + @mod]].", "Tira [[1d20 + 2]].").includes("foundry-inline-rolls"));
  assert.ok(codes("/damage 2d6 fire", "/damage 2d8 fire").includes("foundry-commands"));
});

test("reports changed standalone formulas and data references", () => {
  const source = "The formula is 1d20 + @mod and the bonus is @abilities.str.mod.";
  const translation = "La formula è 1d20 + 2 e il bonus è @abilities.dex.mod.";
  const result = codes(source, translation);

  assert.ok(result.includes("foundry-formulas"));
  assert.ok(result.includes("foundry-data-references"));
});

test("reports changed handlebars and template placeholders", () => {
  const source = "Hello {{actor.name}}; total ${total}.";
  const translation = "Ciao {{actor.nome}}; totale ${totale}.";

  assert.ok(codes(source, translation).includes("foundry-placeholders"));
});

test("accepts visible-field records as validator inputs", () => {
  const source = { pack: "rules", id: "abc", fieldPath: "pages[x].text.content", value: "<p>Speed</p>" };
  const translation = { pack: "rules", id: "abc", fieldPath: "pages[x].text.content", value: "<p>Velocità</p>" };

  assert.deepEqual(compareInvariants(source, translation), []);
});

