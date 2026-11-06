import { walkVisibleFields } from "./visible-fields.mjs";

function getPath(value, pathText) {
  return pathText.replace(/\[([^\]]+)\]/g, ".$1").split(".").reduce((current, key) => current?.[key], value);
}

export function activityNameOverrides(sourceRecord, translation = {}, terms = {}) {
  const overrides = {};
  for (const field of walkVisibleFields(sourceRecord)) {
    const match = field.fieldPath.match(/^system\.activities\.([^.]+)\.(.+\.name|name)$/);
    if (!match || !field.value || !Object.hasOwn(terms, field.value)) continue;
    const activity = sourceRecord.data.system.activities[match[1]];
    const translated = translation.activities?.[match[1]] ?? translation.activities?.[activity?.name];
    if (getPath(translated, match[2])) continue;
    overrides[field.fieldPath] = terms[field.value];
  }
  return overrides;
}
