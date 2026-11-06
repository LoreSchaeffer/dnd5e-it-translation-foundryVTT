import assert from "node:assert/strict";
import test from "node:test";

import { applySynchronization, planSynchronization, rebaseInvariantTokens } from "../scripts/lib/synchronizer.mjs";

function source(id, name, description = "<p>Source text.</p>") {
  return {
    kind: "document",
    pack: "pilot",
    id,
    name,
    sourcePath: `pilot/${id}.yml`,
    documentType: "Item",
    data: { _id: id, name, system: { description: { value: description } } }
  };
}

function translation(lookupKey, data) {
  return {
    kind: "entry",
    pack: "pilot",
    id: null,
    lookupKey,
    name: lookupKey,
    sourcePath: "dnd5e.pilot.json",
    documentType: "BabeleEntry",
    data
  };
}

test("classifies complete visible-text reuse as safe while preserving source tokens", () => {
  const record = source(
    "item1",
    "Flame",
    '<p>See @UUID[Compendium.dnd5e.items.Item.abc]{Flame} within 30 feet.</p>'
  );
  const translated = translation("Flame", {
    name: "Fiamma",
    description: '<p>Vedi @UUID[Compendium.dnd5e.items.Item.abc]{Fiamma} entro 9 metri.</p>'
  });

  const plan = planSynchronization({ sourceRecords: [record], translationRecords: [translated] });
  assert.deepEqual(plan.safe.map(item => item.id), ["item1"]);
  assert.deepEqual(plan.needsTranslation, []);
  assert.deepEqual(plan.manualReview, []);
});

test("routes missing visible fields to needs-translation", () => {
  const plan = planSynchronization({
    sourceRecords: [source("item1", "Flame")],
    translationRecords: [translation("Flame", { name: "Fiamma" })]
  });

  assert.equal(plan.needsTranslation.length, 1);
  assert.equal(plan.needsTranslation[0].reason, "missing-visible-fields");
  assert.deepEqual(plan.needsTranslation[0].fieldPaths, ["system.description.value"]);
});

test("routes duplicate source names to manual review instead of collapsing identities", () => {
  const plan = planSynchronization({
    sourceRecords: [source("item1", "Flame"), source("item2", "Flame")],
    translationRecords: [translation("Flame", { name: "Fiamma", description: "<p>Testo.</p>" })]
  });

  assert.deepEqual(plan.manualReview.map(item => item.id), ["item1", "item2"]);
  assert.ok(plan.manualReview.every(item => item.reason === "ambiguous-source-name"));
});

test("recognizes a renamed entry only when stable source identity is explicit", () => {
  const record = source("item1", "New Source Name");
  const translated = translation("Old Source Name", {
    _id: "item1",
    name: "Nuovo Nome",
    description: "<p>Testo tradotto.</p>"
  });

  const plan = planSynchronization({ sourceRecords: [record], translationRecords: [translated] });
  assert.equal(plan.safe.length, 1);
  assert.equal(plan.safe[0].renameFrom, "Old Source Name");
  assert.equal(plan.safe[0].lookupKey, "New Source Name");
});

test("routes unalignable markup or changed Foundry targets to manual review", () => {
  const record = source(
    "item1",
    "Flame",
    '<section><p>@UUID[Compendium.dnd5e.items.Item.abc]{Flame}</p></section>'
  );
  const translated = translation("Flame", {
    name: "Fiamma",
    description: '<p>@UUID[Compendium.dnd5e.items.Item.xyz]{Fiamma}</p>'
  });

  const plan = planSynchronization({ sourceRecords: [record], translationRecords: [translated] });
  assert.equal(plan.manualReview.length, 1);
  assert.equal(plan.manualReview[0].reason, "invariant-failure");
  assert.ok(plan.manualReview[0].diagnostics.some(item => item.code === "html-tag-sequence"));
  assert.ok(plan.manualReview[0].diagnostics.some(item => item.code === "foundry-references"));
});

test("plans and applies a conservative invariant repair for compatible legacy prose", () => {
  const record = source(
    "item1",
    "Flame",
    '<p class="rule">@UUID[Compendium.dnd5e.items.Item.abc]{Flame}</p>'
  );
  const translated = translation("Flame", {
    name: "Fiamma",
    description: '<p style="color:red">@Compendium[dnd5e.items.old]{Fiamma}</p>'
  });
  const plan = planSynchronization({ sourceRecords: [record], translationRecords: [translated] });

  assert.equal(plan.safe.length, 1);
  assert.deepEqual(plan.safe[0].repairs, [{
    fieldPath: "system.description.value",
    translationPath: ["description"],
    value: '<p class="rule">@UUID[Compendium.dnd5e.items.Item.abc]{Fiamma}</p>'
  }]);
  const applied = applySynchronization({ label: "Pilot", entries: { Flame: translated.data } }, plan);
  assert.equal(applied.entries.Flame.description, plan.safe[0].repairs[0].value);
});

test("applySynchronization performs safe renames without mutating the input document", () => {
  const document = {
    label: "Pilot",
    folders: { Gear: "Equipaggiamento" },
    entries: {
      "Old Source Name": { _id: "item1", name: "Nuovo Nome", description: "<p>Testo tradotto.</p>" }
    }
  };
  const snapshot = structuredClone(document);
  const plan = planSynchronization({
    sourceRecords: [source("item1", "New Source Name")],
    translationRecords: [translation("Old Source Name", document.entries["Old Source Name"])]
  });

  const applied = applySynchronization(document, plan);
  assert.deepEqual(document, snapshot);
  assert.equal(applied.entries["Old Source Name"], undefined);
  assert.deepEqual(applied.entries["New Source Name"], snapshot.entries["Old Source Name"]);
  assert.deepEqual(applied.folders, snapshot.folders);
});

test("rebaseInvariantTokens restores source HTML and mechanics while retaining Italian labels", () => {
  const source = '<p class="rule">Use @UUID[Compendium.dnd5e.items.Item.abc]{Sword} and roll [[1d20 + @mod]].</p>';
  const legacy = '<p style="color:red">Usa @Compendium[dnd5e.items.old]{Spada} e tira [[1d20 + 2]].</p>';

  assert.equal(
    rebaseInvariantTokens(source, legacy),
    '<p class="rule">Usa @UUID[Compendium.dnd5e.items.Item.abc]{Spada} e tira [[1d20 + @mod]].</p>'
  );
});

test("rebaseInvariantTokens refuses incompatible HTML shape", () => {
  assert.equal(rebaseInvariantTokens("<p><strong>Rule</strong></p>", "<p>Regola</p>"), null);
});
