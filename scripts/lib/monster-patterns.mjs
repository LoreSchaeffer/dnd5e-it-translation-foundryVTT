import { translationForField } from "./coverage.mjs";
import { compareInvariants } from "./invariants.mjs";
import { walkVisibleFields } from "./visible-fields.mjs";

const ITEM_LABELS = new Map([
  ["bite", "Morso"],
  ["chains", "Catene"],
  ["claw", "Artigli"],
  ["Claw", "Artigli"],
  ["fist", "Pugno"],
  ["greataxe", "Ascia Bipenne"],
  ["greatclub", "Randello Pesante"],
  ["greatsword", "Spadone"],
  ["melee", "Mischia"],
  ["morningstar", "Stella del Mattino"],
  ["rotting touch", "Tocco Putrescente"],
  ["scimitar", "Scimitarra"],
  ["slam", "Schianto"],
  ["Slam", "Schianto"],
  ["tail", "Coda"],
  ["unarmed strike", "Colpo Senz'Armi"]
]);

const COUNT_LABELS = new Map([
  ["one", "un"],
  ["two", "due"],
  ["three", "tre"],
  ["1d4", "1d4"]
]);

export function translateMonsterPattern(value) {
  const match = value.match(/^<p>The (\[\[lookup @name lowercase\]\]\{monster\}) makes (one|two|three|1d4) (\[\[\/item \.[A-Za-z0-9]+\]\])\{([^{}]+)\}(?: attacks?)?\.<\/p>$/u);
  if (!match) return undefined;
  const [, monster, count, item, sourceLabel] = match;
  const label = ITEM_LABELS.get(sourceLabel);
  if (!label) return undefined;
  let translated;
  if (count === "one" && sourceLabel === "unarmed strike") {
    translated = `<p>Il ${monster.replace("{monster}", "{mostro}")} effettua un ${item}{${label}}.</p>`;
  } else if (count === "one") {
    translated = `<p>Il ${monster.replace("{monster}", "{mostro}")} effettua un attacco con ${item}{${label}}.</p>`;
  } else {
    translated = `<p>Il ${monster.replace("{monster}", "{mostro}")} effettua ${COUNT_LABELS.get(count)} attacchi con ${item}{${label}}.</p>`;
  }
  return compareInvariants(value, translated).length ? undefined : translated;
}

export function monsterPatternMissingOverrides(source, translation) {
  const overrides = {};
  for (const field of walkVisibleFields(source)) {
    const current = translationForField(source, field, translation);
    if (current !== undefined && current !== null && current !== "") continue;
    const value = translateMonsterPattern(field.value);
    if (value !== undefined) overrides[field.fieldPath] = value;
  }
  return overrides;
}
