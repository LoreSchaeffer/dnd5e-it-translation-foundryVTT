import assert from "node:assert/strict";
import test from "node:test";
import { translateEffectFolder, translateEffectName } from "../scripts/lib/effects-translation.mjs";

test("translates representative shared effect taxonomies", () => {
  assert.equal(translateEffectName("Strength Check & Save Advantage", "Ability Check & Save Advantage"), "Vantaggio alle Prove e ai Tiri Salvezza di Forza");
  assert.equal(translateEffectName("Fire Resistance", "Damage Resistances"), "Resistenza ai Danni da Fuoco");
  assert.equal(translateEffectName("Stealth Disadvantage", "Skill Disadvantage"), "Svantaggio alle Prove di Furtività");
  assert.equal(translateEffectFolder("Condition Immunities"), "Immunità alle Condizioni");
});
