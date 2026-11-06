import { translationForField } from "./coverage.mjs";
import { compareInvariants } from "./invariants.mjs";
import { walkVisibleFields } from "./visible-fields.mjs";

function isPresent(value) {
  return typeof value === "string" ? value.length > 0 : value !== undefined && value !== null;
}

function queueItem(record, details = {}) {
  return {
    pack: record.pack,
    id: record.id,
    name: record.name,
    sourcePath: record.sourcePath,
    ...details
  };
}

function sorted(records) {
  return [...records].sort((left, right) =>
    left.sourcePath.localeCompare(right.sourcePath) || left.id.localeCompare(right.id)
  );
}

export function planSynchronization({ sourceRecords, translationRecords }) {
  const documents = sorted(sourceRecords.filter(record => record.kind === "document"));
  const entries = translationRecords.filter(record => record.kind === "entry");
  const byKey = new Map(entries.map(record => [record.lookupKey, record]));
  const byExplicitId = new Map(
    entries.filter(record => typeof record.data?._id === "string").map(record => [record.data._id, record])
  );
  const nameCounts = new Map();
  for (const record of documents) nameCounts.set(record.name, (nameCounts.get(record.name) ?? 0) + 1);

  const plan = { safe: [], needsTranslation: [], manualReview: [] };

  for (const record of documents) {
    const idMatch = byKey.get(record.id) ?? byExplicitId.get(record.id);
    const nameMatch = byKey.get(record.name);
    const candidate = idMatch ?? nameMatch;
    const fields = walkVisibleFields(record);

    if (!candidate) {
      plan.needsTranslation.push(queueItem(record, {
        reason: "missing-entry",
        fieldPaths: fields.map(field => field.fieldPath)
      }));
      continue;
    }

    if (!idMatch && nameCounts.get(record.name) > 1) {
      plan.manualReview.push(queueItem(record, {
        reason: "ambiguous-source-name",
        lookupKey: candidate.lookupKey
      }));
      continue;
    }

    const missing = [];
    const diagnostics = [];
    for (const field of fields) {
      const translatedValue = translationForField(record, field, candidate.data);
      if (!isPresent(translatedValue)) {
        missing.push(field.fieldPath);
        continue;
      }
      diagnostics.push(...compareInvariants(field, String(translatedValue)).map(item => ({
        ...item,
        fieldPath: field.fieldPath
      })));
    }

    if (diagnostics.length) {
      plan.manualReview.push(queueItem(record, {
        reason: "invariant-failure",
        lookupKey: record.name,
        matchedLookupKey: candidate.lookupKey,
        diagnostics
      }));
      continue;
    }

    if (missing.length) {
      plan.needsTranslation.push(queueItem(record, {
        reason: "missing-visible-fields",
        lookupKey: record.name,
        matchedLookupKey: candidate.lookupKey,
        fieldPaths: missing
      }));
      continue;
    }

    plan.safe.push(queueItem(record, {
      lookupKey: record.name,
      matchedLookupKey: candidate.lookupKey,
      ...(candidate.lookupKey !== record.name ? { renameFrom: candidate.lookupKey } : {})
    }));
  }

  return plan;
}

export function applySynchronization(document, plan) {
  const output = structuredClone(document);
  output.entries ??= {};

  for (const item of plan.safe) {
    if (!item.renameFrom || item.renameFrom === item.lookupKey) continue;
    if (!Object.hasOwn(output.entries, item.renameFrom)) continue;
    output.entries[item.lookupKey] = output.entries[item.renameFrom];
    delete output.entries[item.renameFrom];
  }

  return output;
}
