import assert from "node:assert/strict";
import test from "node:test";

import { buildCanonicalEmbeddedOverrides } from "../scripts/lib/embedded-canonical.mjs";

function canonicalRecord() {
  return {
    kind: "document",
    pack: "items",
    id: "canonical1",
    name: "Torch",
    sourcePath: "items/torch.yml",
    documentType: "Item",
    data: {
      _id: "canonical1",
      name: "Torch",
      system: { description: { value: '<p class="rule">Burns brightly.</p>' } }
    }
  };
}

function actorRecord(description = '<p class="rule">Burns brightly.</p>', referenceKey = "compendiumSource") {
  const embedded = {
    _id: "embedded1",
    name: "Torch",
    system: { description: { value: description } },
    _stats: {},
    flags: { dnd5e: {} }
  };
  if (referenceKey === "compendiumSource") {
    embedded._stats.compendiumSource = "Compendium.dnd5e.items.Item.canonical1";
  } else {
    embedded.flags.dnd5e.sourceId = "Compendium.dnd5e.items.Item.canonical1";
  }
  return {
    kind: "document",
    pack: "heroes",
    id: "actor1",
    name: "Hero",
    sourcePath: "heroes/hero.yml",
    documentType: "Actor",
    data: { _id: "actor1", name: "Hero", items: [embedded] }
  };
}

const canonicalTranslation = {
  kind: "entry",
  pack: "items",
  lookupKey: "Torch",
  data: {
    name: "Torcia",
    description: '<p class="rule">Brucia intensamente.</p>'
  }
};

test("copies validated canonical visible fields into an exactly matching embedded item", () => {
  const canonicalByUuid = new Map([
    ["Compendium.dnd5e.items.Item.canonical1", {
      sourceRecord: canonicalRecord(),
      translationRecord: canonicalTranslation
    }]
  ]);

  assert.deepEqual(buildCanonicalEmbeddedOverrides({
    actorRecord: actorRecord(),
    canonicalByUuid
  }), {
    "items[embedded1].name": "Torcia",
    "items[embedded1].system.description.value": '<p class="rule">Brucia intensamente.</p>'
  });
});

test("does not overwrite a modified embedded field with unrelated canonical prose", () => {
  const canonicalByUuid = new Map([
    ["Compendium.dnd5e.items.Item.canonical1", {
      sourceRecord: canonicalRecord(),
      translationRecord: canonicalTranslation
    }]
  ]);

  assert.deepEqual(buildCanonicalEmbeddedOverrides({
    actorRecord: actorRecord("<p>Actor-specific rule.</p>"),
    canonicalByUuid
  }), {
    "items[embedded1].name": "Torcia"
  });
});

test("reuses a canonical translation across the legacy Higher Levels heading variant", () => {
  const sourceRecord = canonicalRecord();
  sourceRecord.data.system.description.value =
    "<p>Core rule.</p><p><strong>At Higher Levels.</strong> Extended rule.</p>";
  const translationRecord = structuredClone(canonicalTranslation);
  translationRecord.data.description =
    "<p>Regola base.</p><p><strong>Ai Livelli Superiori.</strong> Regola estesa.</p>";
  const actor = actorRecord(
    "<p>Core rule.</p><p><strong>Higher Levels.</strong> Extended rule.</p>"
  );
  const canonicalByUuid = new Map([
    ["Compendium.dnd5e.items.Item.canonical1", { sourceRecord, translationRecord }]
  ]);

  const overrides = buildCanonicalEmbeddedOverrides({ actorRecord: actor, canonicalByUuid });

  assert.equal(
    overrides["items[embedded1].system.description.value"],
    "<p>Regola base.</p><p><strong>Ai Livelli Superiori.</strong> Regola estesa.</p>"
  );
});

test("reuses a canonical translation across case and nonbreaking-space-only legacy differences", () => {
  const sourceRecord = canonicalRecord();
  sourceRecord.data.system.description.value =
    "<p>the torch remains lit for the duration.</p>";
  const translationRecord = structuredClone(canonicalTranslation);
  translationRecord.data.description =
    "<p>la torcia rimane accesa per la durata.</p>";
  const actor = actorRecord("<p>The torch remains lit for the Duration.\u00a0</p>");
  const canonicalByUuid = new Map([
    ["Compendium.dnd5e.items.Item.canonical1", { sourceRecord, translationRecord }]
  ]);

  const overrides = buildCanonicalEmbeddedOverrides({ actorRecord: actor, canonicalByUuid });

  assert.equal(
    overrides["items[embedded1].system.description.value"],
    "<p>la torcia rimane accesa per la durata.</p>"
  );
});

test("projects an explicitly labelled canonical reference onto equivalent legacy plain text", () => {
  const sourceRecord = canonicalRecord();
  sourceRecord.data.system.description.value =
    "<p>Use a @UUID[Compendium.dnd5e.spells.Item.circle]{teleportation circle}.</p>";
  const translationRecord = structuredClone(canonicalTranslation);
  translationRecord.data.description =
    "<p>Usa un @UUID[Compendium.dnd5e.spells.Item.circle]{cerchio di teletrasporto}.</p>";
  const actor = actorRecord("<p>Use a teleportation circle.</p>");
  const canonicalByUuid = new Map([
    ["Compendium.dnd5e.items.Item.canonical1", { sourceRecord, translationRecord }]
  ]);

  const overrides = buildCanonicalEmbeddedOverrides({ actorRecord: actor, canonicalByUuid });

  assert.equal(
    overrides["items[embedded1].system.description.value"],
    "<p>Usa un cerchio di teletrasporto.</p>"
  );
});

test("does not project a near match whose mechanical number differs", () => {
  const sourceRecord = canonicalRecord();
  sourceRecord.data.system.description.value = "<p>Add 2 to AC.</p>";
  const translationRecord = structuredClone(canonicalTranslation);
  translationRecord.data.description = "<p>Aggiunge 2 alla CA.</p>";
  const actor = actorRecord("<p>Add 4 to AC.</p>");
  const canonicalByUuid = new Map([
    ["Compendium.dnd5e.items.Item.canonical1", { sourceRecord, translationRecord }]
  ]);

  const overrides = buildCanonicalEmbeddedOverrides({ actorRecord: actor, canonicalByUuid });

  assert.equal(overrides["items[embedded1].system.description.value"], undefined);
});

test("uses the dnd5e sourceId when compendiumSource is absent", () => {
  const canonicalByUuid = new Map([
    ["Compendium.dnd5e.items.Item.canonical1", {
      sourceRecord: canonicalRecord(),
      translationRecord: canonicalTranslation
    }]
  ]);

  const overrides = buildCanonicalEmbeddedOverrides({
    actorRecord: actorRecord('<p class="rule">Burns brightly.</p>', "sourceId"),
    canonicalByUuid
  });
  assert.equal(overrides["items[embedded1].name"], "Torcia");
});

test("maps a canonical advancement translation when the embedded advancement ID was regenerated", () => {
  const sourceRecord = canonicalRecord();
  sourceRecord.data.system.advancement = [{
    _id: "canonicalAdvancement",
    title: "Hit Points"
  }];
  const translationRecord = structuredClone(canonicalTranslation);
  translationRecord.data.advancement = {
    canonicalAdvancement: { title: "Punti Ferita" }
  };
  const actor = actorRecord();
  actor.data.items[0].system.advancement = [{
    _id: "embeddedAdvancement",
    title: "Hit Points"
  }];
  const canonicalByUuid = new Map([
    ["Compendium.dnd5e.items.Item.canonical1", { sourceRecord, translationRecord }]
  ]);

  const overrides = buildCanonicalEmbeddedOverrides({ actorRecord: actor, canonicalByUuid });
  assert.equal(
    overrides["items[embedded1].system.advancement[embeddedAdvancement].title"],
    "Punti Ferita"
  );
});

test("uses an exact unique canonical name when an embedded item has no source reference", () => {
  const actor = actorRecord();
  actor.data.items[0]._stats = {};
  actor.data.items[0].flags = {};
  const canonicalByName = new Map([
    ["Torch", { sourceRecord: canonicalRecord(), translationRecord: canonicalTranslation }]
  ]);

  const overrides = buildCanonicalEmbeddedOverrides({
    actorRecord: actor,
    canonicalByUuid: new Map(),
    canonicalByName
  });
  assert.equal(overrides["items[embedded1].name"], "Torcia");
  assert.equal(
    overrides["items[embedded1].system.description.value"],
    '<p class="rule">Brucia intensamente.</p>'
  );
});
