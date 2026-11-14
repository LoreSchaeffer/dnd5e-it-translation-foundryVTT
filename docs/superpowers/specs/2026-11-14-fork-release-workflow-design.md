# Fork release workflow design

## Intent

Make `LoreSchaeffer/dnd5e-it-translation-foundryVTT` the permanent source for
Foundry VTT installation and updates, and produce the required release assets
automatically and reproducibly.

## Goals

- Bump the module from `3.0.4` to `3.0.5`.
- Point the project, manifest, and download URLs at the `LoreSchaeffer` fork.
- Keep the README installation URL and badges aligned with the manifest.
- On a pushed `v*` tag, validate the release, build `module.zip`, create the
  GitHub release, and upload both `module.json` and `module.zip`.
- Ensure `module.json` is at the root of the ZIP and exclude development-only
  files from the installed module.

## Non-goals

- Do not publish the first release as part of this change.
- Do not change translation content, module identity, or the existing author
  credits.
- Do not publish development builds on ordinary branch pushes.

## Constraints

- The tag name and manifest version must match exactly (`v3.0.5` and `3.0.5`).
- The workflow must run the existing test suite before packaging.
- The full translation audit is not run in GitHub Actions because it requires
  the separate authoritative dnd5e source checkout; the already committed
  audit report remains release evidence.
- The release archive contains only Foundry runtime content: `module.json`,
  `main.js`, `assets`, `compendium`, `fonts`, `lang`, `packs`, the runtime
  JavaScript modules under `scripts`, `styles`, and `templates`.

## Approaches considered

- **Tag-driven release (selected):** deterministic, maps naturally to Foundry
  versions, and prevents normal development pushes from becoming releases.
- **Manual workflow dispatch:** flexible, but can drift from Git tags and the
  manifest version.
- **Release on every main-branch push:** fast, but makes `releases/latest`
  unstable and publishes unfinished work.

## Release behavior

The workflow triggers for tags matching `v*`. It checks out the tag, installs
locked Node dependencies, runs `npm test`, verifies that the tag equals `v`
plus the version in `module.json`, stages the runtime allowlist, and creates a
ZIP whose root is the module root. It then creates a GitHub release for the tag
and uploads `module.json` and `module.zip` using GitHub's maintained release
CLI and the repository `GITHUB_TOKEN`.

Release creation remains an explicit human action: pushing the version tag is
the authorization to publish.
