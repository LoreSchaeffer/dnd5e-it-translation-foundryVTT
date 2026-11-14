import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import yaml from "js-yaml";

const WORKFLOW_PATH = path.resolve(import.meta.dirname, "../.github/workflows/release.yml");

test("release workflow runs only for version tags with release permission", async () => {
  const workflow = yaml.load(await readFile(WORKFLOW_PATH, "utf8"));

  assert.deepEqual(workflow.on.push.tags, ["v*"]);
  assert.ok(!Object.hasOwn(workflow.on.push, "branches"));
  assert.ok(!Object.hasOwn(workflow.on, "workflow_dispatch"));
  assert.deepEqual(workflow.permissions, { contents: "write" });
  assert.deepEqual(Object.keys(workflow.jobs), ["release"]);
  assert.equal(workflow.jobs.release["runs-on"], "ubuntu-latest");
});

test("release workflow tests, stages, archives, and publishes in order", async () => {
  const workflow = yaml.load(await readFile(WORKFLOW_PATH, "utf8"));
  const steps = workflow.jobs.release.steps;
  const checkout = steps.find(step => step.uses?.startsWith("actions/checkout@"));
  const setupNode = steps.find(step => step.uses?.startsWith("actions/setup-node@"));
  const runs = steps.map(step => step.run).filter(Boolean);

  assert.equal(checkout.uses, "actions/checkout@v7");
  assert.equal(setupNode.uses, "actions/setup-node@v7");
  assert.equal(setupNode.with["node-version"], 24);
  assert.equal(setupNode.with.cache, "npm");

  const installIndex = runs.indexOf("npm ci");
  const testIndex = runs.indexOf("npm test");
  const stageIndex = runs.findIndex(command => command.includes("scripts/build-release.mjs"));
  const zipIndex = runs.findIndex(command => command.includes("cd dist/module") && command.includes("zip -r ../module.zip ."));
  const releaseIndex = runs.findIndex(command => command.includes("gh release create"));

  assert.ok(installIndex >= 0 && installIndex < testIndex);
  assert.ok(testIndex < stageIndex && stageIndex < zipIndex && zipIndex < releaseIndex);
  assert.match(runs[stageIndex], /--tag "\$\{\{ github\.ref_name \}\}" --output dist\/module/);
  assert.match(runs[releaseIndex], /gh release create "\$GITHUB_REF_NAME" module\.json dist\/module\.zip/);
  assert.match(runs[releaseIndex], /--verify-tag --generate-notes --title "\$GITHUB_REF_NAME"/);

  const releaseStep = steps.find(step => step.run === runs[releaseIndex]);
  assert.deepEqual(releaseStep.env, { GH_TOKEN: "${{ github.token }}" });
});
