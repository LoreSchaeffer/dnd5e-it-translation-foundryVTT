export function activityNameOverrides(sourceRecord, translation = {}, terms = {}) {
  const overrides = {};
  for (const [activityId, activity] of Object.entries(sourceRecord.data.system?.activities ?? {})) {
    const sourceName = activity?.name;
    if (!sourceName || !Object.hasOwn(terms, sourceName)) continue;
    const translated = translation.activities?.[activityId] ?? translation.activities?.[sourceName];
    if (translated?.name) continue;
    overrides[`system.activities.${activityId}.name`] = terms[sourceName];
  }
  return overrides;
}
