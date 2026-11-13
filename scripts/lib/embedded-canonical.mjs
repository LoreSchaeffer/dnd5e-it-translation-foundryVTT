import { translationForField } from "./coverage.mjs";
import { compareInvariants } from "./invariants.mjs";
import { walkVisibleFields } from "./visible-fields.mjs";

function embeddedRecord(actorRecord, embedded) {
  return {
    kind: "document",
    pack: actorRecord.pack,
    id: embedded._id,
    name: embedded.name ?? "",
    sourcePath: actorRecord.sourcePath,
    documentType: "Item",
    data: embedded
  };
}

function referencesFor(embedded) {
  return [
    embedded?._stats?.compendiumSource,
    embedded?.flags?.dnd5e?.sourceId
  ].filter((value, index, values) => typeof value === "string" && value && values.indexOf(value) === index);
}

function fieldShape(fieldPath) {
  return fieldPath
    .replace(/^system\.activities\.[^.]+/, "system.activities.[]")
    .replace(/\[[^\]]+\]/g, "[]");
}

function normalizeKnownLegacyProse(value) {
  return typeof value === "string"
    ? value
      .replace(/\u00a0/g, " ")
      .replace(/(<strong>)At Higher Levels\.(<\/strong>)/gi, "$1Higher Levels.$2")
      .replace(/\s+/g, " ")
      .replace(/>\s+/g, ">")
      .replace(/\s+</g, "<")
      .trim()
      .toLowerCase()
    : value;
}

function equivalentSourceValue(canonicalValue, embeddedValue) {
  return canonicalValue === embeddedValue
    || normalizeKnownLegacyProse(canonicalValue) === normalizeKnownLegacyProse(embeddedValue);
}

function matchingFields(sourceFields, embeddedFields) {
  const sourceByPath = new Map(sourceFields.map(field => [field.fieldPath, field]));
  return embeddedFields.flatMap(embeddedField => {
    const direct = sourceByPath.get(embeddedField.fieldPath);
    if (direct && equivalentSourceValue(direct.value, embeddedField.value)) {
      return [{ embeddedField, sourceFields: [direct] }];
    }
    const shape = fieldShape(embeddedField.fieldPath);
    const candidates = sourceFields.filter(sourceField =>
      equivalentSourceValue(sourceField.value, embeddedField.value)
      && fieldShape(sourceField.fieldPath) === shape
    );
    return candidates.length ? [{ embeddedField, sourceFields: candidates }] : [];
  });
}

function matchingCandidate({ actorRecord, embedded, canonicalByUuid, canonicalByName }) {
  const embeddedFields = walkVisibleFields(embeddedRecord(actorRecord, embedded));
  const candidates = referencesFor(embedded)
    .map(reference => canonicalByUuid.get(reference))
    .filter(Boolean);
  if (!candidates.length && canonicalByName?.has(embedded.name)) {
    candidates.push(canonicalByName.get(embedded.name));
  }
  let best = null;
  for (const candidate of candidates) {
    const sourceFields = walkVisibleFields(candidate.sourceRecord);
    const matching = matchingFields(sourceFields, embeddedFields);
    if (!best || matching.length > best.matching.length) best = { ...candidate, matching };
  }
  return best;
}

export function buildCanonicalEmbeddedOverrides({ actorRecord, canonicalByUuid, canonicalByName = new Map() }) {
  const overrides = {};
  for (const embedded of actorRecord.data.items ?? []) {
    if (!embedded?._id) continue;
    const candidate = matchingCandidate({ actorRecord, embedded, canonicalByUuid, canonicalByName });
    if (!candidate) continue;

    for (const { embeddedField, sourceFields } of candidate.matching) {
      const translatedValues = sourceFields.flatMap(sourceField => {
        const translatedValue = translationForField(
          candidate.sourceRecord,
          sourceField,
          candidate.translationRecord.data
        );
        if (typeof translatedValue !== "string" || !translatedValue) return [];
        if (compareInvariants(sourceField, translatedValue).length) return [];
        if (compareInvariants(embeddedField, translatedValue).length) return [];
        return [translatedValue];
      });
      const uniqueValues = [...new Set(translatedValues)];
      if (uniqueValues.length !== 1) continue;
      overrides[`items[${embedded._id}].${embeddedField.fieldPath}`] = uniqueValues[0];
    }
  }
  return overrides;
}
