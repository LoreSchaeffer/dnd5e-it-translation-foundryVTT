import { translationForField } from "./coverage.mjs";
import { compareInvariants } from "./invariants.mjs";
import { scanHtml } from "./html-tokens.mjs";
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

function translationPathForField(record, fieldPath) {
  if (fieldPath === "name") return ["name"];
  if (fieldPath === "system.description.value" || fieldPath === "description") return ["description"];
  if (fieldPath === "system.description.chat") return ["chat"];
  if (fieldPath === "system.materials.value") return ["materials"];
  if (fieldPath === "system.requirements") return ["requirements"];

  const advancement = fieldPath.match(/^system\.advancement\[([^\]]+)\]\.(.+)$/);
  if (advancement) return ["advancement", advancement[1], ...advancement[2].split(".")];
  return null;
}

function setPath(object, path, value) {
  let target = object;
  for (const key of path.slice(0, -1)) target = target[key] ??= {};
  target[path.at(-1)] = value;
}

function sorted(records) {
  return [...records].sort((left, right) =>
    left.sourcePath.localeCompare(right.sourcePath) || left.id.localeCompare(right.id)
  );
}

function replaceSequential(text, matches, replacements) {
  let cursor = 0;
  let output = "";
  for (let index = 0; index < matches.length; index += 1) {
    const position = text.indexOf(matches[index], cursor);
    if (position < 0) return null;
    output += text.slice(cursor, position) + replacements[index];
    cursor = position + matches[index].length;
  }
  return output + text.slice(cursor);
}

function replacePattern(source, translation, expression, replacement) {
  const sourceMatches = [...source.matchAll(expression)];
  const translatedMatches = [...translation.matchAll(expression)];
  if (sourceMatches.length !== translatedMatches.length) return null;
  return replaceSequential(
    translation,
    translatedMatches.map(match => match[0]),
    sourceMatches.map((match, index) => replacement(match, translatedMatches[index]))
  );
}

export function rebaseInvariantTokens(source, translation) {
  const sourceHtml = scanHtml(source);
  const translatedHtml = scanHtml(translation);
  const sourceShape = sourceHtml.tokens.map(({ kind, name, selfClosing }) => ({ kind, name, selfClosing }));
  const translatedShape = translatedHtml.tokens.map(({ kind, name, selfClosing }) => ({ kind, name, selfClosing }));
  if (sourceHtml.errors.length || translatedHtml.errors.length || JSON.stringify(sourceShape) !== JSON.stringify(translatedShape)) {
    return null;
  }

  let rebased = replaceSequential(translation, translatedHtml.rawTokens, sourceHtml.rawTokens);
  if (rebased === null) return null;

  const reference = /@(UUID|Compendium|Embed|Check|Save|Damage|Template|Condition)\[([^\]]*)\](?:\{([^{}]*)\})?/gi;
  rebased = replacePattern(source, rebased, reference, (sourceMatch, translatedMatch) => {
    const label = translatedMatch[3] ?? sourceMatch[3];
    return `@${sourceMatch[1]}[${sourceMatch[2]}]${label === undefined ? "" : `{${label}}`}`;
  });
  if (rebased === null) return null;

  for (const expression of [
    /\[\[[\s\S]*?\]\]/g,
    /\{\{\{?[\s\S]*?\}\}\}?/g,
    /\$\{[^{}]*\}/g,
    /\b\d+d\d+(?:\s*[+\-*/]\s*(?:@[A-Za-z_][\w.]*|\d+(?:\.\d+)?))*/gi
  ]) {
    rebased = replacePattern(source, rebased, expression, sourceMatch => sourceMatch[0]);
    if (rebased === null) return null;
  }

  return compareInvariants(source, rebased).length ? null : rebased;
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
    const repairs = [];
    for (const field of fields) {
      const translatedValue = translationForField(record, field, candidate.data);
      if (!isPresent(translatedValue)) {
        missing.push(field.fieldPath);
        continue;
      }
      const fieldDiagnostics = compareInvariants(field, String(translatedValue));
      if (fieldDiagnostics.length) {
        const translationPath = translationPathForField(record, field.fieldPath);
        const rebased = translationPath ? rebaseInvariantTokens(field.value, String(translatedValue)) : null;
        if (rebased !== null) repairs.push({ fieldPath: field.fieldPath, translationPath, value: rebased });
        else diagnostics.push(...fieldDiagnostics.map(item => ({ ...item, fieldPath: field.fieldPath })));
      }
    }

    if (diagnostics.length) {
      plan.manualReview.push(queueItem(record, {
        reason: "invariant-failure",
        lookupKey: record.name,
        matchedLookupKey: candidate.lookupKey,
        diagnostics,
        ...(repairs.length ? { repairs } : {})
      }));
      continue;
    }

    if (missing.length) {
      plan.needsTranslation.push(queueItem(record, {
        reason: "missing-visible-fields",
        lookupKey: record.name,
        matchedLookupKey: candidate.lookupKey,
        fieldPaths: missing,
        ...(repairs.length ? { repairs } : {})
      }));
      continue;
    }

    plan.safe.push(queueItem(record, {
      lookupKey: record.name,
      matchedLookupKey: candidate.lookupKey,
      ...(candidate.lookupKey !== record.name ? { renameFrom: candidate.lookupKey } : {}),
      ...(repairs.length ? { repairs } : {})
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


  for (const item of [...plan.safe, ...plan.needsTranslation, ...plan.manualReview]) {
    const entry = output.entries[item.lookupKey] ?? output.entries[item.renameFrom];
    if (!entry) continue;
    for (const repair of item.repairs ?? []) setPath(entry, repair.translationPath, repair.value);
  }

  return output;
}
