import { translationForField } from "./coverage.mjs";
import { walkVisibleFields } from "./visible-fields.mjs";

export function buildExactMemory(pairs) {
  const candidates = new Map();
  for (const { source, translation } of pairs) {
    for (const field of walkVisibleFields(source)) {
      const value = translationForField(source, field, translation);
      if (typeof value !== "string" || !value || value === field.value) continue;
      const values = candidates.get(field.value) ?? new Set();
      values.add(value);
      candidates.set(field.value, values);
    }
  }
  return new Map([...candidates].filter(([, values]) => values.size === 1).map(([source, values]) => [source, [...values][0]]));
}

export function exactMissingOverrides(source, translation, memory) {
  const overrides = {};
  for (const field of walkVisibleFields(source)) {
    const current = translationForField(source, field, translation);
    if (current !== undefined && current !== null && current !== "") continue;
    const value = memory.get(field.value);
    if (value !== undefined) overrides[field.fieldPath] = value;
  }
  return overrides;
}
