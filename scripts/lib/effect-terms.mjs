import { walkVisibleFields } from "./visible-fields.mjs";

export function buildEffectTerms(records) {
  const terms = new Map();
  for (const record of records) {
    if (!record.source || !record.translation) throw new Error("Effect terms require non-empty source and translation values");
    if (terms.has(record.source)) throw new Error(`Duplicate effect term: ${record.source}`);
    terms.set(record.source, record.translation);
  }
  return terms;
}

export function effectTermOverrides(sourceRecord, translation = {}, terms = new Map()) {
  const overrides = {};
  for (const field of walkVisibleFields(sourceRecord)) {
    const match = field.fieldPath.match(/^effects\[([^\]]+)\]\.(name|description)$/);
    if (!match || !terms.has(field.value)) continue;
    const sourceEffect = sourceRecord.data.effects?.find(effect => effect?._id === match[1]);
    const translatedEffect = translation.effects?.[match[1]] ?? translation.effects?.[sourceEffect?.name];
    if (translatedEffect?.[match[2]]) continue;
    overrides[field.fieldPath] = terms.get(field.value);
  }
  return overrides;
}
