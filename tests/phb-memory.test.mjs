import assert from "node:assert/strict";
import test from "node:test";

import { buildPhbMemory, translateHtmlFromMemory, translateNameFromMemory } from "../scripts/lib/phb-memory.mjs";

const memory = buildPhbMemory({
  segments: {
    prose: {
      source: "A creature gains the {@condition poisoned} condition.",
      text: "Una creatura ottiene la condizione {@condition poisoned}.",
      reviewed: true
    }
  },
  names: { Poisoned: "Avvelenato" }
});

test("translates exact PHB paragraphs while preserving Foundry reference targets", () => {
  const source = '<p class="rule">A creature gains the @UUID[Compendium.dnd5e.rules.JournalEntry.abc]{Poisoned} condition.</p>';
  assert.equal(
    translateHtmlFromMemory(source, memory),
    '<p class="rule">Una creatura ottiene la condizione @UUID[Compendium.dnd5e.rules.JournalEntry.abc]{Avvelenato}.</p>'
  );
});

test("refuses partial descriptions and unreviewed memory", () => {
  const incomplete = buildPhbMemory({
    segments: { draft: { source: "Second paragraph.", text: "Secondo paragrafo.", reviewed: false } },
    names: {}
  });
  assert.equal(translateHtmlFromMemory("<p>First paragraph.</p><p>Second paragraph.</p>", incomplete), null);
});

test("preserves source HTML by declining paragraphs with inline markup", () => {
  const simple = buildPhbMemory({
    segments: { prose: { source: "A bold rule.", text: "Una regola in grassetto.", reviewed: true } },
    names: {}
  });
  assert.equal(translateHtmlFromMemory("<p>A <strong>bold</strong> rule.</p>", simple), null);
});

test("loads reviewed name records in both compact and expanded form", () => {
  const names = buildPhbMemory({ segments: {}, names: {
    Wizard: "Mago",
    Rogue: { source: "Rogue", text: "Ladro", reviewed: true },
    Draft: { source: "Draft", text: "Bozza", reviewed: false },
    Ki: { source: "Ki", text: "Ki", reviewed: true, preserveIdentity: true }
  } });
  assert.equal(translateNameFromMemory("Wizard", names), "Mago");
  assert.equal(translateNameFromMemory("Rogue", names), "Ladro");
  assert.equal(translateNameFromMemory("Draft", names), null);
  assert.equal(translateNameFromMemory("Ki", names), null);
});
