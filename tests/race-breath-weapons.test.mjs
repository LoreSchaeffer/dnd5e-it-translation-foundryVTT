import assert from "node:assert/strict";
import test from "node:test";

import { translateBreathWeapon } from "../scripts/lib/race-breath-weapons.mjs";

test("translates a legacy breath weapon while preserving lookup rolls", () => {
  const record = {
    name: "Black Breath Weapon",
    data: {
      system: {
        description: { value: "<p>You exhale acid.</p><p>Targets [[lookup first]] in [[lookup second]] save and take 2d6 damage, increasing to 3d6, 4d6, and 5d6.</p><p>You must rest.</p>" },
        activities: { activity1: { _id: "activity1", name: "Exhale Acid" } }
      }
    }
  };
  const translated = translateBreathWeapon(record);
  assert.equal(translated.name, "Arma a Soffio del Dragonide Nero");
  assert.match(translated.description, /\[\[lookup first\]\].*\[\[lookup second\]\]/);
  assert.deepEqual(translated.activities, { activity1: { name: "Esala Acido" } });
});
