import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { loadBabelePack } from "../scripts/lib/babele-inventory.mjs";
import { auditPack, buildReport, hasBlockingFailures, renderMarkdownReport, translationForField } from "../scripts/lib/coverage.mjs";
import { isAllowed } from "../scripts/lib/allowlist.mjs";
import { detectResiduals } from "../scripts/lib/residuals.mjs";
import { loadSourcePack } from "../scripts/lib/source-inventory.mjs";

const FIXTURES = path.join(import.meta.dirname, "fixtures");

async function mixedAudit() {
  const sourceRecords = await loadSourcePack(path.join(FIXTURES, "source", "mixed"));
  const translationRecords = await loadBabelePack(path.join(FIXTURES, "compendium", "dnd5e.mixed.json"));
  return auditPack({ pack: "mixed", sourceRecords, translationRecords, allowlist: [], permitTestPack: true });
}

test("auditPack reports missing documents, ambiguous duplicate names, and folder coverage", async () => {
  const audit = await mixedAudit();

  assert.equal(audit.summary.documents.total, 6);
  assert.equal(audit.summary.fields.total, 25);
  assert.equal(audit.summary.folders.total, 1);
  assert.equal(audit.summary.folders.translated, 1);
  assert.ok(audit.issues.some(issue => issue.code === "missing-document" && issue.name === "Sample Hero"));
  assert.ok(audit.issues.some(issue => issue.code === "missing-document" && issue.name === "Celestial Ward"));
  assert.equal(audit.issues.filter(issue => issue.code === "ambiguous-name" && issue.name === "Flame Test").length, 2);
});

test("auditPack reports missing Journal page content and RollTable result coverage by range", async () => {
  const audit = await mixedAudit();

  assert.ok(audit.issues.some(issue => issue.code === "missing-field" && issue.fieldPath === "pages[page000000000001].text.content"));
  assert.ok(audit.issues.some(issue => issue.code === "missing-field" && issue.fieldPath === "pages[page000000000002].name"));
  assert.ok(!audit.issues.some(issue => issue.code === "missing-field" && issue.fieldPath === "results[result0000000001].text"));
});

test("detectResiduals flags unchanged English prose and imperial measurements", () => {
  const issues = detectResiduals({
    source: "You can move 30 feet as part of the action.",
    translation: "You can move 30 feet as part of the action.",
    context: { pack: "spells", id: "spell1", fieldPath: "system.description.value" },
    allowlist: []
  });

  assert.ok(issues.some(issue => issue.code === "unchanged-english"));
  assert.ok(issues.some(issue => issue.code === "english-residual"));
  assert.ok(issues.some(issue => issue.code === "imperial-unit"));
});

test("detectResiduals does not treat the Italian preposition in as inches", () => {
  const issues = detectResiduals({
    source: "You live in a temple.",
    translation: "Vivi in un tempio.",
    context: { pack: "backgrounds", id: "italian-in", fieldPath: "description" },
    allowlist: []
  });

  assert.equal(issues.some(item => item.code === "imperial-unit"), false);
});

test("detectResiduals does not treat the Italian noun creature as English", () => {
  const issues = detectResiduals({
    source: "Creatures in the area are affected.",
    translation: "Le creature nell'area sono influenzate.",
    context: { pack: "rules", id: "creature-it", fieldPath: "description" },
    allowlist: []
  });
  assert.equal(issues.some(issue => issue.code === "english-residual"), false);
});

test("translationForField resolves stable IDs in structured advancement arrays", () => {
  const record = {
    data: {
      system: {
        advancement: [{ _id: "grant1", title: "Feature" }]
      }
    }
  };
  const field = { fieldPath: "system.advancement[grant1].title" };
  const translation = { advancement: { grant1: { title: "Privilegio" } } };

  assert.equal(translationForField(record, field, translation), "Privilegio");
});

test("translationForField resolves Active Effect prose by stable ID", () => {
  const record = { data: { effects: [{ _id: "effect1", name: "Lucky", description: "Rule" }] } };
  const translation = { effects: { effect1: { name: "Fortunato", description: "Regola" } } };
  assert.equal(translationForField(record, { fieldPath: "effects[effect1].description" }, translation), "Regola");
});

test("scoped allowlist permits an approved proper name but not the same value elsewhere", () => {
  const allowlist = [{
    kind: "unchanged-english",
    pack: "spells",
    id: "melf",
    fieldPath: "name",
    value: "Melf",
    reason: "Attested proper name",
    status: "verified"
  }];

  assert.equal(isAllowed({ code: "unchanged-english", value: "Melf" }, { pack: "spells", id: "melf", fieldPath: "name" }, allowlist), true);
  assert.equal(isAllowed({ code: "unchanged-english", value: "Melf" }, { pack: "monsters", id: "melf", fieldPath: "name" }, allowlist), false);
});

test("detectResiduals ignores technical Foundry targets, rolls, formulas, and placeholders", () => {
  const issues = detectResiduals({
    source: "<p>@UUID[Compendium.dnd5e.items.Item.abc]{Sword} [[1d20 + @mod]] {{actor.name}}</p>",
    translation: "<p>@UUID[Compendium.dnd5e.items.Item.abc]{Spada} [[1d20 + @mod]] {{actor.name}}</p>",
    context: { pack: "items", id: "abc", fieldPath: "system.description.value" },
    allowlist: []
  });

  assert.deepEqual(issues, []);
});

test("auditPack rejects modern content from the legacy coverage boundary", () => {
  assert.throws(
    () => auditPack({ pack: "spells24", sourceRecords: [], translationRecords: [], allowlist: [] }),
    /excluded modern pack spells24/
  );
});

test("reports are deterministic and blocking failures control exit status", async () => {
  const audit = await mixedAudit();
  const report = buildReport([audit]);
  const markdown = renderMarkdownReport(report);

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.packs[0].pack, "mixed");
  assert.equal(hasBlockingFailures(report), true);
  assert.match(markdown, /\| mixed \| 6 \|/);
  assert.match(markdown, /missing-document/);
  assert.equal(renderMarkdownReport(report), markdown);
});

