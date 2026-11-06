export function buildItemUnidentifiedTerms(records) {
  const terms = new Map();
  for (const record of records) {
    if (!record.source || !record.translation) throw new Error("Unidentified item terms require non-empty source and translation values");
    if (terms.has(record.source)) throw new Error(`Duplicate unidentified item term: ${record.source}`);
    terms.set(record.source, record.translation);
  }
  return terms;
}

export function itemUnidentifiedOverrides(sourceRecord, translation = {}, terms = new Map()) {
  const overrides = {};
  for (const field of ["name", "description"]) {
    const source = sourceRecord.data.system?.unidentified?.[field];
    if (!source || !terms.has(source) || translation.unidentified?.[field]) continue;
    overrides[`system.unidentified.${field}`] = terms.get(source);
  }
  return overrides;
}
