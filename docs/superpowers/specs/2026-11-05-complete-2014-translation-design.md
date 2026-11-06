# Complete Italian 2014 Translation Design

## Intent

Complete the external Babele translation for every D&D 5e 2014 compendium in
the local dnd5e 6.0.6 system, plus the shared `effects` pack, while preserving
Foundry's exact technical structure and presenting metric measurements to
Italian users. The source system remains read-only; all deliverables live in
this module repository.

## Goals

- Reach 100% document, folder, Journal page, RollTable result, embedded item,
  activity, and Active Effect coverage for the listed legacy packs and effects.
- Preserve JSON shape, HTML hierarchy, UUIDs, Foundry tokens, formulas,
  placeholders, data attributes, technical enum values, and effect mechanics.
- Provide repeatable audits, JSON and Markdown reports, tests, a canonical
  glossary, contributor documentation, and safe metric converters.
- Prove that all existing 2024 translation files and the local dnd5e checkout
  remain unchanged.

## Non-goals

- Translating, completing, or measuring 2024/modern content.
- Editing or rebuilding the local dnd5e system.
- Deploying to a Foundry world, pushing Git commits, or creating a release.
- Reproducing copyrighted Italian manual prose wholesale; the manuals are
  point references for terminology and style only.

## Anti-goals

- Regex-wide translation or unit replacement.
- Treating a document as translated merely because a Babele key exists.
- Reconstructing HTML through Markdown or a lossy DOM serializer.
- Silently correcting source rules, changing technical targets, or converting
  an already metric value a second time.

## Constraints

- Authoritative source: `C:/Users/lmlor/Desktop/dnd5e`, manifest version 6.0.6.
- Writable module: `C:/Users/lmlor/Desktop/dnd5e-it-translation-foundryVTT`.
- Scope: backgrounds, classes, classfeatures, heroes, items, monsterfeatures,
  monsters, races, rules, spells, subclasses, tables, tradegoods, and effects.
- Branch: `codex/complete-2014-translation-606`.
- Source baseline: Git HEAD `93ba0dc3e837b66864ec385b8419882009b12e4e`;
  pre-existing source modifications are never touched.

## Approaches considered

### 1. Patch only missing Babele keys

Fastest, but rejected. The current translation keys and Foundry references were
produced against an older pack structure, so key presence cannot prove that
current 6.0.6 nested fields, UUIDs, pages, activities, or embedded documents are
safe and complete.

### 2. Rebuild translations from English source manually

Mechanically clean but discards substantial reviewed Italian work and makes
regressions likely across thousands of visible strings.

### 3. Source-first structural synchronization with guarded text reuse

Selected. Inventory current YAML source documents by stable ID and path, map
Babele entries by documented identity rules, preserve source technical tokens
and markup, and reuse existing Italian visible text only when structural
alignment is provably safe. Unalignable content is translated or reviewed
explicitly; it is never silently rewritten.

## Architecture

Node.js ESM tools load the dnd5e YAML source and Babele JSON translations into
a normalized inventory. Field-aware walkers distinguish visible text from
technical data. Invariant extractors compare ordered HTML tags and attributes,
Foundry constructs, UUIDs, formulas, inline rolls, and placeholders. Coverage
and residual-language checks emit deterministic reports and non-zero exit codes
for blocking failures.

A separate synchronization utility creates safe translation skeletons and
per-entry review queues without mutating the source. Pure metric conversion
functions are tested outside Foundry and imported by `main.js`; hooks gate on
units and translation/conversion flags to prevent double conversion.

## Translation workflow

1. Snapshot source HEAD/status and every excluded 2024 file hash.
2. Build and test the inventory and invariant validators.
3. Establish the canonical glossary and editorial/format/metric rules.
4. Pilot representative Item, Actor, Journal, RollTable, and ActiveEffect data.
5. Translate in the requested pack batches, validating and committing each.
6. Run a fresh complete audit, compare protected hashes, and document all
   justified allowlist entries and remaining human-review items.

## Builder calls

- Use the checked-in `packs/_source` YAML files, never LevelDB mutation or an
  unpack operation, for source inventory.
- Treat `_id` as the stable source identity; Babele name keys are presentation
  lookup keys and duplicate source names require explicit handling.
- A technical invariant mismatch is blocking even if the Italian reads well.
- Proper names and approved technical terms are allowlisted with a reason,
  scope, and review status rather than globally ignored.
- The existing 2024 JSON files are protected by exact SHA-256 comparison.

