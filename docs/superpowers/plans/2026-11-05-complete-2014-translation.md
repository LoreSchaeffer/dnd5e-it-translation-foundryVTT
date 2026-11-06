# Complete Italian 2014 Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a complete, structurally safe, metric Italian Babele translation for all local dnd5e 6.0.6 legacy compendia and the full effects pack.

**Architecture:** Source-first Node.js tools inventory the read-only YAML packs, walk user-visible fields, compare immutable Foundry/HTML tokens, and generate deterministic coverage reports. Translation files are updated in audited batches; pure metric functions are unit-tested and integrated into guarded Foundry hooks.

**Tech Stack:** Node.js ESM, `node:test`, `js-yaml`, Babele JSON, Foundry VTT 14, dnd5e 6.0.6.

**Spec:** `docs/superpowers/specs/2026-11-05-complete-2014-translation-design.md`

## Global Constraints

- Never modify `C:/Users/lmlor/Desktop/dnd5e` or its pre-existing working-tree changes.
- Include only backgrounds, classes, classfeatures, heroes, items, monsterfeatures, monsters, races, rules, spells, subclasses, tables, tradegoods, and all effects.
- Keep every 2024/modern translation file byte-for-byte unchanged.
- Preserve JSON keys and shape, ordered HTML tags and technical attributes, UUIDs, compendium targets, formulas, inline rolls, placeholders, flags, IDs, enums, effect modes, priorities, and transfer values.
- Translate only visible user-facing strings; use 5 ft = 1.5 m, 1 ft = 0.3 m, 1 mile = 1.5 km, and 1 lb = 0.5 kg with game-scale precision.
- Do not push, release, install, or deploy without separate authorization.

## Review Focus

- Duplicate source names must remain separately auditable by `_id` instead of collapsing into one Babele entry.
- Multiline `@UUID[...]` labels may translate, but targets and parameters must remain byte-identical after YAML folding.
- Nested Actor items, activities, Journal pages, RollTable results, and ActiveEffect changes must be walked even when a parent entry or `fromPack` exists.
- Metric hooks must leave already-metric data, formulas, zeroes, nulls, and non-dimensional numbers unchanged.
- Pack classification must include shared effects while rejecting every modern/2024 pack from coverage and generated edits.

---

### Task 1: Reproducible project harness and protected baselines

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `scripts/lib/config.mjs`
- Create: `scripts/snapshot-baseline.mjs`
- Create: `tests/config.test.mjs`
- Create: `reports/baseline.json`

**Interfaces:**
- Produces: `LEGACY_PACKS`, `EFFECTS_PACK`, `EXCLUDED_PACKS`, `resolvePaths(options)`, and a baseline containing source Git state plus SHA-256 hashes of protected 2024 files.

- [ ] Write tests asserting the exact in-scope and excluded pack sets and rejecting a source path whose manifest is not dnd5e 6.0.6.
- [ ] Run `npm test -- tests/config.test.mjs`; expect the new module import to fail.
- [ ] Implement configuration and the read-only baseline snapshot CLI.
- [ ] Run the focused test and `node scripts/snapshot-baseline.mjs --source C:/Users/lmlor/Desktop/dnd5e`; expect a valid report without source changes.
- [ ] Commit with `chore: add translation audit harness`.

### Task 2: Source and Babele inventory

**Files:**
- Create: `scripts/lib/source-inventory.mjs`
- Create: `scripts/lib/babele-inventory.mjs`
- Create: `scripts/lib/visible-fields.mjs`
- Create: `tests/inventory.test.mjs`
- Create: `tests/fixtures/source/`
- Create: `tests/fixtures/compendium/`

**Interfaces:**
- Consumes: Task 1 pack configuration.
- Produces: `loadSourcePack(packPath)`, `loadBabelePack(filePath)`, `walkVisibleFields(document)`, each returning records with pack, `_id`, source path, document type, field path, and value.

- [ ] Add failing fixtures/tests for Item activities, Actor embedded items, Journal pages, RollTable results, folders, and ActiveEffect labels/changes.
- [ ] Run `npm test -- tests/inventory.test.mjs`; expect missing exports.
- [ ] Implement recursive YAML/JSON loading and a schema-aware visible-field walker that excludes IDs, flags, formulas, enum values, image paths, and mechanical effect values.
- [ ] Run the focused tests; expect all fixture records and duplicate-name IDs to pass.
- [ ] Commit with `feat: inventory source and babele content`.

### Task 3: Foundry and HTML invariant validator

**Files:**
- Create: `scripts/lib/invariants.mjs`
- Create: `scripts/lib/html-tokens.mjs`
- Create: `scripts/lib/foundry-tokens.mjs`
- Create: `tests/invariants.test.mjs`

**Interfaces:**
- Consumes: Task 2 visible field records.
- Produces: `compareInvariants(source, translation)` returning blocking diagnostics for ordered tags, attributes, UUID targets, compendium references, rolls, formulas, placeholders, and balance.

- [ ] Add failing tests covering nested HTML, tables/lists, translated UUID labels, inline rolls, formulas, multiple references, truncated markup, changed attributes, and changed token counts.
- [ ] Run the focused test; expect missing validator modules.
- [ ] Implement non-serializing token scanners and invariant comparison.
- [ ] Run the focused tests; expect deliberate tag/UUID/formula mutations to fail and label-only translation to pass.
- [ ] Commit with `feat: validate foundry translation invariants`.

### Task 4: Coverage, residual-language, and metric audit reports

**Files:**
- Create: `scripts/lib/coverage.mjs`
- Create: `scripts/lib/residuals.mjs`
- Create: `scripts/lib/allowlist.mjs`
- Create: `scripts/audit-translations.mjs`
- Create: `config/translation-allowlist.json`
- Create: `tests/audit.test.mjs`
- Create: `reports/translation-audit.json`
- Create: `reports/translation-audit.md`

**Interfaces:**
- Consumes: Tasks 1-3 inventories and diagnostics.
- Produces: deterministic per-pack totals/missing/partial/review counts and CLI exit code 1 for blocking failures.

- [ ] Add failing tests for missing documents/folders/pages/table results, unchanged English descriptions, imperial units, allowed proper names, technical tokens, and accidental modern content.
- [ ] Run the focused test; expect missing audit modules.
- [ ] Implement scoped allowlists, residual heuristics, report serializers, and blocking exit status.
- [ ] Run unit tests and the full CLI to capture the honest initial baseline.
- [ ] Commit with `feat: report translation coverage`.

### Task 5: Canonical glossary and contributor documentation

**Files:**
- Create: `glossary/glossary.json`
- Create: `glossary/README.md`
- Create: `docs/translation-guide.md`
- Create: `docs/foundry-format-preservation.md`
- Create: `docs/metric-conversion.md`
- Create: `docs/translation-workflow.md`
- Create: `docs/updating-dnd5e.md`
- Create: `docs/quality-checklist.md`
- Create: `tests/glossary.test.mjs`

**Interfaces:**
- Produces: versioned glossary entries with English, Italian, category, gender, plural, usage notes, source/rationale, and verified/proposed/review status.

- [ ] Add failing schema and uniqueness tests for the required glossary categories.
- [ ] Populate canonical core terms, consulting the Italian PHB only for targeted verification.
- [ ] Write the required documentation with exact safe/unsafe examples and reviewer/release workflows.
- [ ] Run glossary tests and link checks; expect no duplicate English terms without scoped rationale.
- [ ] Commit with `docs: define italian translation standards`.

### Task 6: Safe metric conversion core and Foundry integration

**Files:**
- Create: `scripts/metric-conversion.mjs`
- Create: `tests/metric-conversion.test.mjs`
- Modify: `main.js`

**Interfaces:**
- Produces: pure `poundsToKilograms`, `feetToMetres`, `milesToKilometres`, `convertRange`, `convertMovement`, `convertSenses`, and `convertTemplate` functions used by `main.js`.

- [ ] Add failing tests for feet, miles, pounds, ranges, movement, senses, geometric areas, zero/null values, non-measures, and already-metric documents.
- [ ] Run the focused test; expect missing functions.
- [ ] Implement pure non-mutating converters and replace the incorrect mile/range logic and unit typo in `main.js`.
- [ ] Test guarded create hooks and double-conversion prevention with Foundry-shaped mocks.
- [ ] Run all metric tests; expect miles labelled `km`, feet labelled `m`, and source objects unchanged.
- [ ] Commit with `fix: make metric conversion safe and idempotent`.

### Task 7: Source-first synchronization pilot

**Files:**
- Create: `scripts/lib/synchronizer.mjs`
- Create: `scripts/sync-translations.mjs`
- Create: `tests/synchronizer.test.mjs`
- Modify: representative entries in `compendium/dnd5e.backgrounds.json`, `dnd5e.monsters.json`, `dnd5e.rules.json`, `dnd5e.tables.json`
- Create: `compendium/dnd5e.effects.json`

**Interfaces:**
- Consumes: Tasks 2-5.
- Produces: dry-run/apply synchronization with explicit `safe`, `needs-translation`, and `manual-review` queues; no source mutation.

- [ ] Add failing tests for safe visible-text reuse, source-token preservation, duplicate names, renamed entries, and unalignable markup.
- [ ] Implement dry-run-first synchronization and review queue output.
- [ ] Pilot one Item-like entry, Actor, Journal page, RollTable, and ActiveEffect, translating visible prose and metric measures.
- [ ] Run invariant and audit tests on the pilot; expect zero structural/token failures.
- [ ] Commit with `feat: pilot source-first translation sync`.

### Task 8: Legacy character-content batches

**Files:**
- Modify: `compendium/dnd5e.backgrounds.json`
- Modify: `compendium/dnd5e.classes.json`
- Modify: `compendium/dnd5e.subclasses.json`
- Modify: `compendium/dnd5e.races.json`
- Modify: `compendium/dnd5e.classfeatures.json`
- Modify: `docs/compendium-coverage.md`

**Interfaces:**
- Consumes: synchronizer, glossary, and audit CLI.
- Produces: complete audited Babele mappings for character content.

- [ ] Synchronize and translate backgrounds/classes/subclasses/races; audit and resolve every blocking diagnostic.
- [ ] Run JSON, invariant, residual-English, metric, and coverage checks; commit the batch.
- [ ] Synchronize and translate classfeatures, including duplicate-name identity review.
- [ ] Run the same checks and update coverage; expect 100% for these packs.
- [ ] Commit with `feat: complete legacy character translations`.

### Task 9: Spells, equipment, actors, tables, rules, and effects batches

**Files:**
- Modify: `compendium/dnd5e.spells.json`
- Modify: `compendium/dnd5e.items.json`
- Modify: `compendium/dnd5e.tradegoods.json`
- Modify: `compendium/dnd5e.monsters.json`
- Modify: `compendium/dnd5e.monsterfeatures.json`
- Modify: `compendium/dnd5e.heroes.json`
- Modify: `compendium/dnd5e.tables.json`
- Modify: `compendium/dnd5e.rules.json`
- Modify: `compendium/dnd5e.effects.json`
- Modify: `docs/compendium-coverage.md`

**Interfaces:**
- Consumes: all prior audit and translation standards.
- Produces: complete audited translations for every remaining in-scope pack.

- [ ] Complete spells, then items/tradegoods, validating and committing each independent batch.
- [ ] Complete monsters/monsterfeatures/heroes, materially verifying embedded items and `fromPack` results; validate and commit.
- [ ] Complete every RollTable text result and Journal page/title; validate and commit.
- [ ] Complete all effect folders, names, descriptions, and genuinely visible change labels without changing mechanical values; validate and commit.
- [ ] Run per-pack reports; expect 100% coverage and no unjustified English or imperial units.

### Task 10: Final fresh audit and protected-state verification

**Files:**
- Modify: `reports/translation-audit.json`
- Modify: `reports/translation-audit.md`
- Modify: `docs/compendium-coverage.md`
- Modify: `docs/quality-checklist.md`

**Interfaces:**
- Consumes: all completed translation batches.
- Produces: release-ready evidence and an explicit human-review register.

- [ ] Delete no data; regenerate all reports from source and translations in a fresh process.
- [ ] Run `npm test` and every documented audit command; expect zero blocking failures.
- [ ] Compare protected 2024 hashes and source HEAD/status against Task 1; expect byte-identical translations and unchanged source state/modifications.
- [ ] Record branch status, atomic commits, per-pack totals, translated entry totals, allowlists, commands, and human-review items.
- [ ] Commit with `chore: finalize 2014 translation audit`.

