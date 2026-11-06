import assert from "node:assert/strict";
import test from "node:test";

import { activityNameOverrides } from "../scripts/lib/activity-terms.mjs";

function record(activities) {
  return { data: { system: { activities } } };
}

test("translates only exact activity names and addresses them by stable ID", () => {
  const source = record({
    cast1: { _id: "cast1", name: "Cast" },
    drink1: { _id: "drink1", name: "Drink" }
  });

  assert.deepEqual(activityNameOverrides(source, {}, { Cast: "Lancia" }), {
    "system.activities.cast1.name": "Lancia"
  });
});

test("does not replace an existing activity translation", () => {
  const source = record({ cast1: { _id: "cast1", name: "Cast" } });
  const translation = { activities: { cast1: { name: "Lancio" } } };

  assert.deepEqual(activityNameOverrides(source, translation, { Cast: "Lancia" }), {});
});

test("rejects empty source activity names", () => {
  const source = record({ unnamed: { _id: "unnamed", name: "" } });

  assert.deepEqual(activityNameOverrides(source, {}, { "": "Attiva" }), {});
});
