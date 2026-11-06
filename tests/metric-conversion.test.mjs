import assert from "node:assert/strict";
import test from "node:test";

import {
  applyActorMetricConversion,
  applyItemMetricConversion,
  applySceneMetricConversion,
  buildActorMetricUpdate,
  buildItemMetricUpdate,
  buildSceneMetricUpdate,
  convertMovement,
  convertRange,
  convertSenses,
  convertTemplate,
  feetToMetres,
  milesToKilometres,
  poundsToKilograms
} from "../scripts/metric-conversion.mjs";

test("scalar converters use project precision and preserve non-measures", () => {
  assert.equal(feetToMetres(5), 1.5);
  assert.equal(feetToMetres("10"), 3);
  assert.equal(milesToKilometres(2), 3);
  assert.equal(poundsToKilograms(7), 3.5);

  for (const value of [0, null, undefined, "", "2d6", "special"]) {
    assert.equal(feetToMetres(value), value);
    assert.equal(milesToKilometres(value), value);
    assert.equal(poundsToKilograms(value), value);
  }
});

test("convertRange converts feet and miles with their correct unit", () => {
  const feet = { value: 30, long: 120, units: "ft", special: "unchanged" };
  const miles = { value: 2, long: null, units: "mi" };

  assert.deepEqual(convertRange(feet), { value: 9, long: 36, units: "m", special: "unchanged" });
  assert.deepEqual(convertRange(miles), { value: 3, long: null, units: "km" });
  assert.deepEqual(feet, { value: 30, long: 120, units: "ft", special: "unchanged" });
  assert.deepEqual(miles, { value: 2, long: null, units: "mi" });
});

test("structured converters are non-mutating and idempotent for metric data", () => {
  const movement = { walk: 30, fly: 60, swim: 0, climb: null, burrow: "", hover: true, units: "ft" };
  const senses = { darkvision: 60, blindsight: 0, tremorsense: null, truesight: "", special: "odore", units: "ft" };

  assert.deepEqual(convertMovement(movement), {
    walk: 9, fly: 18, swim: 0, climb: null, burrow: "", hover: true, units: "m"
  });
  assert.deepEqual(convertSenses(senses), {
    darkvision: 18, blindsight: 0, tremorsense: null, truesight: "", special: "odore", units: "m"
  });
  assert.deepEqual(movement, { walk: 30, fly: 60, swim: 0, climb: null, burrow: "", hover: true, units: "ft" });
  assert.deepEqual(senses, { darkvision: 60, blindsight: 0, tremorsense: null, truesight: "", special: "odore", units: "ft" });

  const metricMovement = { walk: 9, units: "m" };
  const metricSenses = { darkvision: 18, units: "m" };
  assert.strictEqual(convertMovement(metricMovement), metricMovement);
  assert.strictEqual(convertSenses(metricSenses), metricSenses);
  assert.strictEqual(convertRange({ value: 9, units: "m" }).units, "m");
});

test("convertSenses can use an explicit imperial fallback without inventing an output field", () => {
  const senses = { darkvision: 60, special: "telepatia" };
  assert.deepEqual(convertSenses(senses, "ft"), { darkvision: 18, special: "telepatia" });
  assert.deepEqual(senses, { darkvision: 60, special: "telepatia" });
});

test("convertTemplate scales geometric lengths only when units are explicit", () => {
  const cone = { type: "cone", size: 30, width: 5, units: "ft" };
  assert.deepEqual(convertTemplate(cone), { type: "cone", size: 9, width: 1.5, units: "m" });
  assert.deepEqual(cone, { type: "cone", size: 30, width: 5, units: "ft" });

  const mileRadius = { type: "radius", size: 1, units: "mi" };
  assert.deepEqual(convertTemplate(mileRadius), { type: "radius", size: 1.5, units: "km" });

  const missingUnits = { type: "cube", size: 20 };
  const metric = { type: "line", size: 9, width: 1.5, units: "m" };
  assert.strictEqual(convertTemplate(missingUnits), missingUnits);
  assert.strictEqual(convertTemplate(metric), metric);
});

function mockDocument(data, flags = {}) {
  return {
    ...data,
    getFlag(scope, key) {
      return flags[`${scope}.${key}`];
    }
  };
}

test("actor update converts only imperial dimensions and leaves its source untouched", () => {
  const actor = mockDocument({
    system: {
      attributes: {
        movement: { walk: 30, fly: 0, units: "ft" },
        senses: { darkvision: 60, special: "odore" }
      },
      traits: { weight: 175 }
    },
    prototypeToken: { dimSight: 30, brightSight: 60 }
  });
  const snapshot = structuredClone({ system: actor.system, prototypeToken: actor.prototypeToken });

  assert.deepEqual(buildActorMetricUpdate(actor), {
    "prototypeToken.dimSight": 9,
    "prototypeToken.brightSight": 18,
    "system.attributes.movement": { walk: 9, fly: 0, units: "m" },
    "system.attributes.senses": { darkvision: 18, special: "odore" },
    "system.traits.weight": 87.5
  });
  assert.deepEqual({ system: actor.system, prototypeToken: actor.prototypeToken }, snapshot);
});

test("Foundry-shaped builders guard metric, Babele, and already-converted documents", () => {
  const metricActor = mockDocument({
    system: { attributes: { movement: { walk: 9, units: "m" }, senses: { darkvision: 18, units: "m" } } },
    prototypeToken: { dimSight: 9 }
  });
  const babeleActor = mockDocument({ system: { attributes: { movement: { walk: 30, units: "ft" } } } }, {
    "babele.translated": true
  });
  const convertedActor = mockDocument({ system: { attributes: { movement: { walk: 30, units: "ft" } } } }, {
    "dnd5e-it-translation.converted": true
  });
  assert.equal(buildActorMetricUpdate(metricActor), null);
  assert.equal(buildActorMetricUpdate(babeleActor), null);
  assert.equal(buildActorMetricUpdate(convertedActor), null);

  const metricItem = mockDocument({ system: { range: { value: 9, units: "m" }, target: { template: { size: 3, units: "m" } } } });
  assert.equal(buildItemMetricUpdate(metricItem), null);
  assert.equal(buildItemMetricUpdate(mockDocument({ system: { range: { value: 30, units: "ft" } } }, {
    "dnd5e-it-translation.converted": true
  })), null);

  const metricScene = mockDocument({ grid: { distance: 1.5, units: "m" } });
  assert.equal(buildSceneMetricUpdate(metricScene), null);
});

test("item and scene builders produce guarded Foundry update paths", () => {
  const item = mockDocument({
    system: {
      range: { value: 1, long: 2, units: "mi" },
      target: { template: { type: "sphere", size: 30, units: "ft" } }
    }
  });
  assert.deepEqual(buildItemMetricUpdate(item), {
    "system.range": { value: 1.5, long: 3, units: "km" },
    "system.target.template": { type: "sphere", size: 9, units: "m" }
  });

  const scene = mockDocument({ grid: { distance: 5, units: "ft", type: 1 } });
  assert.deepEqual(buildSceneMetricUpdate(scene), {
    "grid.distance": 1.5,
    "grid.units": "m"
  });
});

test("create-hook adapters update and flag once, then prevent double conversion", async () => {
  function actionableDocument(data) {
    const flags = {};
    const calls = { update: [], setFlag: [] };
    return {
      ...data,
      calls,
      getFlag(scope, key) {
        return flags[`${scope}.${key}`];
      },
      async update(value) {
        calls.update.push(value);
      },
      async setFlag(scope, key, value) {
        calls.setFlag.push([scope, key, value]);
        flags[`${scope}.${key}`] = value;
      }
    };
  }

  const actor = actionableDocument({
    system: { attributes: { movement: { walk: 30, units: "ft" }, senses: {} }, traits: { weight: 100 } },
    prototypeToken: { dimSight: 30 }
  });
  const item = actionableDocument({ system: { range: { value: 30, units: "ft" } } });
  const scene = actionableDocument({ grid: { distance: 5, units: "ft" } });

  assert.equal(await applyActorMetricConversion(actor), true);
  assert.equal(await applyItemMetricConversion(item), true);
  assert.equal(await applySceneMetricConversion(scene), true);
  assert.equal(await applyActorMetricConversion(actor), false);
  assert.equal(await applyItemMetricConversion(item), false);
  assert.equal(await applySceneMetricConversion(scene), false);

  for (const document of [actor, item, scene]) {
    assert.equal(document.calls.update.length, 1);
    assert.deepEqual(document.calls.setFlag, [["dnd5e-it-translation", "converted", true]]);
  }
});
