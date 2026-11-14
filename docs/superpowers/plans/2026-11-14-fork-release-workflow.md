# Fork Release Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the LoreSchaeffer fork the permanent Foundry update source and automatically create valid `module.json` and `module.zip` release assets from version tags.

**Architecture:** A small Node release builder validates the `v<version>` tag and copies an explicit runtime allowlist into a staging directory. A tag-triggered GitHub Actions workflow tests the repository, invokes that builder, zips the staged module root, and creates the GitHub release with the repository token.

**Tech Stack:** Node.js 24 ESM, `node:test`, GitHub Actions, GitHub CLI, ZIP

**Spec:** `docs/superpowers/specs/2026-11-14-fork-release-workflow-design.md`

## Global Constraints

- Set the module version to exactly `3.0.5`.
- Use `LoreSchaeffer/dnd5e-it-translation-foundryVTT` for project, manifest, download, README installation, and badge release URLs.
- Keep module id `dnd5e-it-translation` and the existing author credits unchanged.
- Ordinary branch pushes must not create releases; only pushed tags matching `v*` may do so.
- A release tag must equal `v` plus the exact `module.json` version.
- Do not create or push the first release tag while implementing this plan.
- Package only Foundry runtime files, with `module.json` at the archive root.

## Review Focus

- A malformed tag such as `release-3.0.5` must fail before staging; Task 1 pins this.
- A validly shaped tag whose version differs from `module.json` must fail before staging; Task 1 pins this.
- The release archive must include all four JavaScript modules imported by `main.js`; Task 1 pins this.
- Development files and release tooling must not enter the staged module; Task 1 pins this.
- The workflow must have only the minimum release permission and must never run on a normal branch push; Task 3 pins this.

---

### Task 1: Deterministic runtime staging

**Files:**
- Create: `scripts/build-release.mjs`
- Create: `tests/release-build.test.mjs`

**Interfaces:**
- Consumes: repository root, output directory, and a tag string such as `v3.0.5`.
- Produces: `RUNTIME_ENTRIES: readonly string[]` and `buildRelease({ root, outputRoot, tag }): Promise<{ version: string, outputRoot: string }>`.

- [ ] **Step 1: Write failing release-builder tests**

Add tests named `rejects a malformed release tag`, `rejects a tag that differs from the manifest version`, and `stages only the Foundry runtime allowlist`. The successful case must assert that the staging root contains `module.json`, `main.js`, `assets`, `compendium`, `fonts`, `lang`, `packs`, `styles`, and `templates`; that `scripts` contains exactly `section-parser.js`, `statblock-parser.js`, `dnd-journal-styles.js`, and `metric-conversion.mjs`; and that `README.md`, `package.json`, `tests`, `docs`, and `scripts/build-release.mjs` are absent.

- [ ] **Step 2: Run the focused tests and confirm the red state**

Run: `node --test tests/release-build.test.mjs`

Expected: FAIL because `scripts/build-release.mjs` does not exist.

- [ ] **Step 3: Implement the release builder**

Implement the exported interface using `node:fs/promises`. Validate `^v\d+\.\d+\.\d+$`, compare the tag without `v` to `module.json.version`, recreate only the explicitly supplied output directory, copy the runtime directories recursively, and copy only the four runtime files under `scripts`. Add a CLI accepting `--tag <tag>` and `--output <path>` while defaulting the root to the repository root.

- [ ] **Step 4: Run the focused tests and confirm green**

Run: `node --test tests/release-build.test.mjs`

Expected: all release-builder tests PASS.

- [ ] **Step 5: Commit the release builder**

```bash
git add scripts/build-release.mjs tests/release-build.test.mjs
git commit -m "build: add deterministic release staging"
```

### Task 2: Fork-owned manifest metadata

**Files:**
- Modify: `module.json`
- Modify: `README.md`
- Create: `tests/release-metadata.test.mjs`

**Interfaces:**
- Consumes: fixed fork owner `LoreSchaeffer` and release version `3.0.5`.
- Produces: Foundry install URL `https://github.com/LoreSchaeffer/dnd5e-it-translation-foundryVTT/releases/latest/download/module.json` and versioned ZIP URL `https://github.com/LoreSchaeffer/dnd5e-it-translation-foundryVTT/releases/download/v3.0.5/module.zip`.

- [ ] **Step 1: Write failing metadata tests**

Assert that `module.json` has version `3.0.5`, all three repository/release URLs point to the LoreSchaeffer fork, the author remains `LuckyFrico`, and the README installation URL and release badges use the fork. Assert that the README installation section no longer contains the LuckyFrico release manifest URL.

- [ ] **Step 2: Run the focused tests and confirm the red state**

Run: `node --test tests/release-metadata.test.mjs`

Expected: FAIL because the manifest still reports `3.0.4` and points to LuckyFrico release assets.

- [ ] **Step 3: Update manifest and README metadata**

Set `version`, `manifest`, `download`, and `url` to the exact values above. Replace only release/install/badge repository URLs in the README; retain original author, donation, Discord, and credit links.

- [ ] **Step 4: Run the focused tests and confirm green**

Run: `node --test tests/release-metadata.test.mjs`

Expected: all release-metadata tests PASS.

- [ ] **Step 5: Commit fork metadata**

```bash
git add module.json README.md tests/release-metadata.test.mjs
git commit -m "chore: point releases to LoreSchaeffer fork"
```

### Task 3: Tag-triggered GitHub release

**Files:**
- Create: `.github/workflows/release.yml`
- Create: `tests/release-workflow.test.mjs`

**Interfaces:**
- Consumes: a pushed `v*` Git tag, `scripts/build-release.mjs`, and the repository `GITHUB_TOKEN`.
- Produces: a GitHub release containing root `module.json` and generated `module.zip` assets.

- [ ] **Step 1: Write failing workflow-contract tests**

Parse the workflow with `js-yaml` and assert: trigger `push.tags` equals `["v*"]`; top-level `permissions.contents` equals `write`; `actions/checkout@v7` and `actions/setup-node@v7` are used; Node 24 is selected; `npm ci` and `npm test` run before staging; the builder receives `${{ github.ref_name }}`; ZIP creation runs from inside `dist/module`; and `gh release create` uploads both `module.json` and `dist/module.zip` with `GH_TOKEN` sourced from `${{ github.token }}`. Also assert there is no branch trigger and no `workflow_dispatch` trigger.

- [ ] **Step 2: Run the focused tests and confirm the red state**

Run: `node --test tests/release-workflow.test.mjs`

Expected: FAIL because `.github/workflows/release.yml` does not exist.

- [ ] **Step 3: Implement the GitHub Actions workflow**

Create one `release` job on `ubuntu-latest`. Use `actions/checkout@v7`, `actions/setup-node@v7` with Node 24 and npm cache, then run `npm ci`, `npm test`, the release builder, `(cd dist/module && zip -r ../module.zip .)`, and `gh release create "$GITHUB_REF_NAME" module.json dist/module.zip --verify-tag --generate-notes --title "$GITHUB_REF_NAME"`. Grant only `contents: write` and expose `GH_TOKEN: ${{ github.token }}` only to the release step.

- [ ] **Step 4: Run the focused tests and confirm green**

Run: `node --test tests/release-workflow.test.mjs`

Expected: all workflow-contract tests PASS.

- [ ] **Step 5: Commit the workflow**

```bash
git add .github/workflows/release.yml tests/release-workflow.test.mjs
git commit -m "ci: publish Foundry release assets from tags"
```

### Task 4: Release-readiness verification and branch publication

**Files:**
- Verify only: all files changed in Tasks 1-3

**Interfaces:**
- Consumes: completed release builder, metadata, workflow, and tests.
- Produces: a clean, pushed feature branch ready for a separately authorized `v3.0.5` tag.

- [ ] **Step 1: Run the complete test suite**

Run: `npm test`

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Exercise staging with the intended tag without publishing**

Run: `node scripts/build-release.mjs --tag v3.0.5 --output tmp/release-check/module`

Expected: exits 0 and reports version `3.0.5`; `tmp/release-check/module/module.json` exists.

- [ ] **Step 3: Inspect staged contents and clean only the temporary check directory**

Verify the staging tree matches `RUNTIME_ENTRIES`, then remove the explicit path `tmp/release-check` without touching any other temporary or workspace content.

- [ ] **Step 4: Run repository integrity checks**

Run: `git diff --check` and `git status --short`

Expected: no whitespace errors and no uncommitted files.

- [ ] **Step 5: Push the implementation branch without creating a tag**

Run: `git push origin codex/complete-2014-translation-606`

Expected: the remote branch advances; no `v3.0.5` tag or GitHub release is created.
