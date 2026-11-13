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

test("recognizes a renamed entry by stable source identity without changing its storage key", () => {
  const record = source("item1", "New Source Name");
  const translated = translation("Old Source Name", {
    _id: "item1",
    name: "Nuovo Nome",
    description: "<p>Testo tradotto.</p>"
  });

  const plan = planSynchronization({ sourceRecords: [record], translationRecords: [translated] });
  assert.equal(plan.safe.length, 1);
  assert.equal(plan.safe[0].renameFrom, undefined);
  assert.equal(plan.safe[0].lookupKey, "Old Source Name");
});

test("repairs changed Foundry targets when translated text aligns with the source skeleton", () => {
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
  assert.equal(plan.manualReview.length, 0);
  assert.equal(plan.safe.length, 1);
  assert.equal(
    plan.safe[0].repairs[0].value,
    '<section><p>@UUID[Compendium.dnd5e.items.Item.abc]{Fiamma}</p></section>'
  );
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

test("applySynchronization preserves explicit-ID storage keys without mutating the input document", () => {
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
  assert.deepEqual(applied.entries["Old Source Name"], snapshot.entries["Old Source Name"]);
  assert.equal(applied.entries["New Source Name"], undefined);
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

test("rebaseInvariantTokens does not duplicate an equivalent legacy compendium reference", () => {
  const source = "<p>Cast @UUID[Compendium.dnd5e.spells.Item.abc]{Magic Spell}.</p>";
  const legacy = "<p>Lancia @Compendium[dnd5e.spells.abc]{Incantesimo Magico}.</p>";
  const referenceLabels = new Map([["Compendium.dnd5e.spells.Item.abc", "Incantesimo Magico"]]);

  assert.equal(
    rebaseInvariantTokens(source, legacy, { referenceLabels }),
    "<p>Lancia @UUID[Compendium.dnd5e.spells.Item.abc]{Incantesimo Magico}.</p>"
  );
});

test("rebaseInvariantTokens refuses incompatible HTML shape", () => {
  assert.equal(rebaseInvariantTokens("<p><strong>Rule</strong> Tail</p>", "<p>Regola</p>"), null);
});

test("rebaseInvariantTokens unwraps legacy divs and restores split source paragraphs", () => {
  const source = '<p class="first">First rule.</p><p>Second @UUID[Compendium.dnd5e.items.Item.abc]{rule}.</p>';
  const legacy = '<div title="Page 1"><div><div><p>Prima regola.<br>Seconda @Compendium[dnd5e.items.old]{regola}.</p></div></div></div>';

  assert.equal(
    rebaseInvariantTokens(source, legacy),
    '<p class="first">Prima regola.</p><p>Seconda @UUID[Compendium.dnd5e.items.Item.abc]{regola}.</p>'
  );
});

test("rebaseInvariantTokens merges legacy paragraphs when the source now uses one paragraph", () => {
  assert.equal(
    rebaseInvariantTokens("<p>First rule. Second rule.</p>", "<p>Prima regola.</p><p>Seconda regola.</p>"),
    "<p>Prima regola. Seconda regola.</p>"
  );
});

test("rebaseInvariantTokens splits a legacy paragraph at sentence boundaries", () => {
  assert.equal(
    rebaseInvariantTokens("<p>First rule.</p><p>Second rule.</p>", "<p>Prima regola. Seconda regola.</p>"),
    "<p>Prima regola.</p><p>Seconda regola.</p>"
  );
});

test("rebaseInvariantTokens drops a legacy spell header and empty spacer paragraph", () => {
  const source = "<p>First rule.</p><p><strong>At Higher Levels.</strong> Second rule.</p>";
  const legacy = "<p><em>Abiurazione di 1° livello</em></p><ul><li><strong>Tempo di lancio:</strong> 1 azione</li><li><strong>Gittata:</strong> 9 metri</li><li><strong>Componenti:</strong> V, S</li><li><strong>Durata:</strong> Istantanea</li></ul><p>Prima regola.</p><p>&nbsp;</p><p><strong>Ai Livelli Superiori.</strong> Seconda regola.</p>";

  assert.equal(
    rebaseInvariantTokens(source, legacy),
    "<p>Prima regola.</p><p><strong>Ai Livelli Superiori.</strong> Seconda regola.</p>"
  );
});

test("rebaseInvariantTokens drops a legacy spell header split across four lists", () => {
  const source = "<p>First rule.</p>";
  const legacy = "<p><em>Evocazione di 2° livello</em></p><p>&nbsp;</p><ul><li><strong>Tempo di lancio:</strong> 1 azione</li></ul><ul><li><strong>Gittata:</strong> 18 metri</li></ul><ul><li><strong>Componenti:</strong> V, S</li></ul><ul><li><strong>Durata:</strong> Istantanea</li></ul><p>Prima regola.</p>";

  assert.equal(rebaseInvariantTokens(source, legacy), "<p>Prima regola.</p>");
});

test("rebaseInvariantTokens removes duplicated punctuation formatting after a heading", () => {
  const source = "<p><strong>At Higher Levels.</strong> Rule.</p>";
  const legacy = "<p><strong>Ai Livelli Superiori.</strong><strong>.</strong> Regola.</p>";

  assert.equal(
    rebaseInvariantTokens(source, legacy),
    "<p><strong>Ai Livelli Superiori.</strong> Regola.</p>"
  );
});

test("rebaseInvariantTokens removes a legacy line break absent from the source", () => {
  const source = "<p>First sentence. Second sentence.</p>";
  const legacy = '<p>Prima frase.<br data-parsoid="legacy">Seconda frase.</p>';

  assert.equal(
    rebaseInvariantTokens(source, legacy),
    "<p>Prima frase. Seconda frase.</p>"
  );
});

test("rebaseInvariantTokens merges punctuation isolated in adjacent formatting", () => {
  const source = "<p><strong>At Higher Levels.</strong> Rule.</p>";
  const legacy = "<p><strong>Ai Livelli Superiori</strong><strong>.</strong> Regola.</p>";

  assert.equal(
    rebaseInvariantTokens(source, legacy),
    "<p><strong>Ai Livelli Superiori.</strong> Regola.</p>"
  );
});

test("rebaseInvariantTokens drops an unformatted legacy spell header", () => {
  const source = "<p>First rule.</p><p>Second rule.</p>";
  const legacy = "<p>Necromanzia di 2° livello</p><ul><li>Tempo di lancio: 1 azione</li><li>Gittata: 18 metri</li><li>Componenti: V, S</li><li>Durata: 1 minuto</li></ul><p>Prima regola.</p><p>&nbsp;</p><p>Seconda regola.</p>";

  assert.equal(
    rebaseInvariantTokens(source, legacy),
    "<p>Prima regola.</p><p>Seconda regola.</p>"
  );
});

test("rebaseInvariantTokens projects translated text onto an equivalent source HTML skeleton", () => {
  const source = "<table><tr><td><strong>Level</strong></td><td>Feature</td></tr></table>";
  const legacy = "<table><thead><tr><th><p><strong>Livello</strong></p></th><th><p>Privilegio</p></th></tr></thead></table>";
  assert.equal(
    rebaseInvariantTokens(source, legacy),
    "<table><tr><td><strong>Livello</strong></td><td>Privilegio</td></tr></table>"
  );
});

test("rebaseInvariantTokens removes legacy presentation spans absent from the source skeleton", () => {
  const source = "<p><em>Source introduction.</em></p><p>Source rule.</p>";
  const legacy = '<p style="color:red"><em style="font-size:13px">Introduzione italiana.</em></p><p style="color:red"><span style="color:black"><span style="font-size:13px">Regola </span></span><span style="color:black"><span style="font-size:13px">italiana.</span></span></p>';

  assert.equal(
    rebaseInvariantTokens(source, legacy),
    "<p><em>Introduzione italiana.</em></p><p>Regola italiana.</p>"
  );
});

test("rebaseInvariantTokens drops an obsolete Italian magic-item header absent from the source", () => {
  const source = "<p>First rule.</p><p>Second rule.</p>";
  const legacy = "<p><em>Arma (qualsiasi ascia o spada), rara</em></p><p>Prima regola.</p><p>Seconda regola.</p>";

  assert.equal(
    rebaseInvariantTokens(source, legacy),
    "<p>Prima regola.</p><p>Seconda regola.</p>"
  );
});

test("rebaseInvariantTokens restores a missing source reference around its translated label", () => {
  const source = "<p>You can cast @UUID[Compendium.dnd5e.spells.Item.abc]{Mage Armor}.</p>";
  const legacy = "<p>Puoi lanciare armatura magica.</p>";
  const referenceLabels = new Map([["Compendium.dnd5e.spells.Item.abc", "armatura magica"]]);
  assert.equal(
    rebaseInvariantTokens(source, legacy, { referenceLabels }),
    "<p>Puoi lanciare @UUID[Compendium.dnd5e.spells.Item.abc]{armatura magica}.</p>"
  );
});

test("rebaseInvariantTokens links the first matching translated label when prose repeats it", () => {
  const source = "<p>Spend @UUID[Compendium.test.Item.abc]{Inspiration}, then roll the Inspiration die.</p>";
  const legacy = "<p>Spendi Ispirazione, poi tira il dado di Ispirazione.</p>";
  const referenceLabels = new Map([["Compendium.test.Item.abc", "Ispirazione"]]);
  assert.equal(
    rebaseInvariantTokens(source, legacy, { referenceLabels }),
    "<p>Spendi @UUID[Compendium.test.Item.abc]{Ispirazione}, poi tira il dado di Ispirazione.</p>"
  );
});

test("rebaseInvariantTokens redistributes legacy paragraphs without dropping translated prose", () => {
  const source = "<p>Short.</p><p>A much longer middle rule.</p><p>End.</p>";
  const legacy = "<p>Breve.</p><p>Una regola</p><p>centrale molto più lunga.</p><p>Fine.</p>";
  assert.equal(
    rebaseInvariantTokens(source, legacy),
    "<p>Breve.</p><p>Una regola centrale molto più lunga.</p><p>Fine.</p>"
  );
});

test("rebaseInvariantTokens discards an obsolete legacy table absent from the source", () => {
  const source = "<p>Rule.</p><h5>Details</h5><p>More.</p>";
  const legacy = "<p>Regola.</p><h3>Dettagli</h3><table><tr><td>Dati obsoleti</td></tr></table><p>Altro.</p>";
  assert.equal(
    rebaseInvariantTokens(source, legacy),
    "<p>Regola.</p><h5>Dettagli</h5><p>Altro.</p>"
  );
});

test("rebaseInvariantTokens drops a legacy prerequisite now stored in structured data", () => {
  const source = "<p>You can cast @UUID[Compendium.test.Item.spell]{Spell} at will.</p>";
  const legacy = "<p>Prerequisito: 9° livello</p><p>Puoi lanciare incantesimo a volontà.</p>";
  const referenceLabels = new Map([["Compendium.test.Item.spell", "incantesimo"]]);
  assert.equal(
    rebaseInvariantTokens(source, legacy, { referenceLabels }),
    "<p>Puoi lanciare @UUID[Compendium.test.Item.spell]{incantesimo} a volontà.</p>"
  );
});

test("rebaseInvariantTokens rebuilds a source choice list with translated stable labels", () => {
  const source = "<p>Choose one option.</p><p>@UUID[Compendium.test.Item.a]{Alpha}</p><p>@UUID[Compendium.test.Item.b]{Beta}</p>";
  const legacy = "<p>Scegli un'opzione.</p><h3>Vecchie opzioni</h3><p>Testo obsoleto.</p>";
  const referenceLabels = new Map([
    ["Compendium.test.Item.a", "Alfa"],
    ["Compendium.test.Item.b", "Beta"]
  ]);
  assert.equal(
    rebaseInvariantTokens(source, legacy, { referenceLabels }),
    "<p>Scegli un'opzione.</p><p>@UUID[Compendium.test.Item.a]{Alfa}</p><p>@UUID[Compendium.test.Item.b]{Beta}</p>"
  );
});

test("rebaseInvariantTokens restores source lookup tokens from one legacy creature placeholder", () => {
  const source = "<p>the [[lookup @name lowercase]]{monster} can breathe air and water.</p>";
  const legacy = "<p>La &lt;creature&gt; può respirare in aria e acqua.</p>";

  assert.equal(
    rebaseInvariantTokens(source, legacy),
    "<p>La [[lookup @name lowercase]]{monster} può respirare in aria e acqua.</p>"
  );
});

test("rebaseInvariantTokens recognizes inflected legacy creature placeholders", () => {
  const source = "<p>the [[lookup @name lowercase]]{monster} follows the [[lookup @name lowercase]]{monster}.</p>";
  const legacy = "<p>La &lt;creatura&gt; segue &lt;la creature&gt;.</p>";

  assert.equal(
    rebaseInvariantTokens(source, legacy),
    "<p>La [[lookup @name lowercase]]{monster} segue [[lookup @name lowercase]]{monster}.</p>"
  );
});

test("planSynchronization repairs embedded item descriptions by stable ID", () => {
  const actor = {
    kind: "document", pack: "pilot", id: "actor1", name: "Hero", sourcePath: "hero.yml",
    data: { name: "Hero", items: [{ _id: "item1", name: "Claw", system: { description: { value: '<p class="rule">Sharp.</p>' } } }] }
  };
  const translated = translation("Hero", {
    name: "Eroe", items: { item1: { name: "Artiglio", description: '<p style="color:red">Affilato.</p>' } }
  });
  const plan = planSynchronization({ sourceRecords: [actor], translationRecords: [translated] });
  assert.equal(plan.safe[0].repairs[0].fieldPath, "items[item1].system.description.value");
  assert.deepEqual(plan.safe[0].repairs[0].translationPath, ["items", "item1", "description"]);
});
