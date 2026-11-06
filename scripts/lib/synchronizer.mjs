import { translationForField } from "./coverage.mjs";
import { compareInvariants } from "./invariants.mjs";
import { babelePathForField } from "./field-overrides.mjs";
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
  return babelePathForField(fieldPath);
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

function removeMatches(text, matches) {
  let cursor = 0;
  let output = "";
  for (const match of matches) {
    output += text.slice(cursor, match.index);
    cursor = match.index + match[0].length;
  }
  return output + text.slice(cursor);
}

function unwrapSingleLegacyDiv(text) {
  const value = text.trim();
  const tags = [...value.matchAll(/<\/?div\b[^>]*>/gi)];
  if (tags.length < 2 || !/^<div\b/i.test(tags[0][0]) || !/^<\/div/i.test(tags.at(-1)[0])) return null;

  let depth = 0;
  for (let index = 0; index < tags.length; index += 1) {
    depth += /^<\/div/i.test(tags[index][0]) ? -1 : 1;
    if (depth === 0 && index !== tags.length - 1) return null;
    if (depth < 0) return null;
  }
  if (depth !== 0) return null;
  return value.slice(tags[0][0].length, tags.at(-1).index).trim();
}

function stripLegacySpellHeader(text) {
  const value = text.trim();
  const match = value.match(/^(<p\b[^>]*>\s*<em\b[^>]*>[\s\S]*?<\/em>\s*<\/p>)((?:\s*<ul\b[^>]*>[\s\S]*?<\/ul>){1,4})/i);
  if (match) {
    const items = [...match[2].matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/gi)];
    if (items.length === 4 && items.every(item => /<strong\b[^>]*>[\s\S]*?<\/strong>/i.test(item[0]))) {
      return value.slice(match[0].length).trim();
    }
  }

  const plain = value.match(/^(<p\b[^>]*>([^<]*)<\/p>)\s*(<ul\b[^>]*>[\s\S]*?<\/ul>)/i);
  if (!plain || !/livello/i.test(plain[2])) return text;
  const items = [...plain[3].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
  const labels = items.map(item => item[1].replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim());
  if (labels.length !== 4 || ![
    /^Tempo di lancio:/i,
    /^Gittata:/i,
    /^Componenti:/i,
    /^Durata:/i
  ].every((pattern, index) => pattern.test(labels[index]))) return text;
  return value.slice(plain[0].length).trim();
}

function dropEmptySpacerParagraphs(source, translation) {
  const emptyParagraph = /<p\b[^>]*>\s*(?:(?:&nbsp;|&#160;|<br\s*\/?\s*>))?\s*<\/p>/gi;
  if (emptyParagraph.test(source)) return translation;
  emptyParagraph.lastIndex = 0;
  return translation.replace(emptyParagraph, "");
}

function dropDuplicatedFormattingPunctuation(translation) {
  const withoutDuplicates = translation.replace(
    /([.!?])(<\/(?:strong|em)>)\s*<(strong|em)\b[^>]*>\s*\1\s*<\/\3>/gi,
    "$1$2"
  );
  return withoutDuplicates.replace(
    /<(strong|em)\b([^>]*)>([\s\S]*?)<\/\1>\s*<\1\b[^>]*>\s*([.!?])\s*<\/\1>/gi,
    (_match, tag, attributes, inner, punctuation) => `<${tag}${attributes}>${inner}${punctuation}</${tag}>`
  );
}

function dropLegacyBreaks(source, translation) {
  if (/<br\b/i.test(source)) return translation;
  return translation.replace(/\s*<br\b[^>]*>\s*/gi, " ");
}

function reshapeLegacyParagraphs(source, translation) {
  const paragraph = /<p\b[^>]*>[\s\S]*?<\/p>/gi;
  const sourceParagraphs = [...source.matchAll(paragraph)];
  if (!sourceParagraphs.length || removeMatches(source, sourceParagraphs).trim()) return null;

  let unwrapped = translation.trim();
  while (true) {
    const inner = unwrapSingleLegacyDiv(unwrapped);
    if (inner === null) break;
    unwrapped = inner;
  }

  const translatedParagraphs = [...unwrapped.matchAll(paragraph)];
  if (!translatedParagraphs.length || removeMatches(unwrapped, translatedParagraphs).trim()) return null;
  let inners = translatedParagraphs.map(match => match[0].replace(/^<p\b[^>]*>/i, "").replace(/<\/p>$/i, ""));
  if (sourceParagraphs.length === 1 && inners.length > 1) inners = [inners.join(" ")];
  if (inners.length === 1 && sourceParagraphs.length > 1) {
    const split = inners[0].split(/<br\s*\/?\s*>/gi);
    if (split.length === sourceParagraphs.length) inners = split;
    else {
      const sentences = inners[0].split(/(?<=[.!?])\s+/u);
      if (sentences.length === sourceParagraphs.length) inners = sentences;
    }
  }
  if (inners.length < sourceParagraphs.length) {
    inners = inners.flatMap(inner => inner.split(/(?<=[.!?])\s+/u));
  }
  if (inners.length > sourceParagraphs.length && sourceParagraphs.length > 1) {
    const sourceLengths = sourceParagraphs.map(match => match[0].replace(/<[^>]+>/g, "").length || 1);
    const totalSource = sourceLengths.reduce((sum, length) => sum + length, 0);
    const translatedLengths = inners.map(inner => inner.replace(/<[^>]+>/g, "").length || 1);
    const totalTranslated = translatedLengths.reduce((sum, length) => sum + length, 0);
    const groups = [];
    let start = 0;
    let sourceConsumed = 0;
    let translatedConsumed = 0;
    for (let groupIndex = 0; groupIndex < sourceParagraphs.length - 1; groupIndex += 1) {
      sourceConsumed += sourceLengths[groupIndex];
      const target = totalTranslated * sourceConsumed / totalSource;
      let end = start + 1;
      let cumulative = translatedConsumed + translatedLengths[start];
      const maximumEnd = inners.length - (sourceParagraphs.length - groupIndex - 1);
      while (end < maximumEnd) {
        const next = cumulative + translatedLengths[end];
        if (Math.abs(next - target) > Math.abs(cumulative - target)) break;
        cumulative = next;
        end += 1;
      }
      groups.push(inners.slice(start, end).join(" "));
      translatedConsumed = cumulative;
      start = end;
    }
    groups.push(inners.slice(start).join(" "));
    inners = groups;
  }
  if (inners.length !== sourceParagraphs.length) return null;
  return inners.map(inner => `<p>${inner}</p>`).join("");
}

function reshapeEquivalentTextNodes(source, translation) {
  const textNodes = value => {
    const nodes = [];
    let cursor = 0;
    for (const match of value.matchAll(/<[^>]+>/g)) {
      if (match.index > cursor && value.slice(cursor, match.index).trim()) {
        nodes.push({ start: cursor, end: match.index, value: value.slice(cursor, match.index) });
      }
      cursor = match.index + match[0].length;
    }
    if (cursor < value.length && value.slice(cursor).trim()) nodes.push({ start: cursor, end: value.length, value: value.slice(cursor) });
    return nodes;
  };
  const sourceNodes = textNodes(source);
  const translatedNodes = textNodes(translation);
  if (!sourceNodes.length || sourceNodes.length !== translatedNodes.length) return null;
  return replaceSequential(source, sourceNodes.map(node => node.value), translatedNodes.map(node => node.value.trim()));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function accentTolerantPattern(value) {
  return escapeRegExp(value)
    .replace(/a/gi, "[aàá]")
    .replace(/e/gi, "[eèé]")
    .replace(/i/gi, "[iìí]")
    .replace(/o/gi, "[oòó]")
    .replace(/u/gi, "[uùú]");
}

function injectMissingReferences(source, translation, referenceLabels) {
  if (!referenceLabels?.size) return translation;
  const expression = /@(UUID|Compendium|Embed|Check|Save|Damage|Template|Condition)\[([^\]]*)\](?:\{([^{}]*)\})?/gi;
  const sourceReferences = [...source.matchAll(expression)];
  const translatedTargets = new Set([...translation.matchAll(expression)].map(match => match[2]));
  let output = translation;
  for (const reference of sourceReferences) {
    if (translatedTargets.has(reference[2])) continue;
    const label = referenceLabels.get(reference[2]) ?? referenceLabels.get(reference[2].split(".").at(-1));
    if (!label) return translation;
    const occurrences = [...output.matchAll(new RegExp(accentTolerantPattern(label), "giu"))];
    if (!occurrences.length) return translation;
    output = output.slice(0, occurrences[0].index)
      + `@${reference[1]}[${reference[2]}]{${occurrences[0][0]}}`
      + output.slice(occurrences[0].index + occurrences[0][0].length);
    translatedTargets.add(reference[2]);
  }
  return output;
}

function translatedReference(sourceReference, referenceLabels) {
  const match = sourceReference.match(/^@(UUID|Compendium|Embed|Check|Save|Damage|Template|Condition)\[([^\]]*)\](?:\{([^{}]*)\})?$/i);
  if (!match) return null;
  const label = referenceLabels?.get(match[2]) ?? referenceLabels?.get(match[2].split(".").at(-1));
  if (!label) return null;
  return `@${match[1]}[${match[2]}]{${label}}`;
}

function reshapeReferenceChoiceList(source, translation, referenceLabels) {
  const paragraph = /<p\b[^>]*>[\s\S]*?<\/p>/gi;
  const sourceParagraphs = [...source.matchAll(paragraph)];
  if (sourceParagraphs.length < 2 || removeMatches(source, sourceParagraphs).trim()) return null;
  const sourceInners = sourceParagraphs.map(match => match[0].replace(/^<p\b[^>]*>/i, "").replace(/<\/p>$/i, "").trim());
  if (/@(?:UUID|Compendium|Embed|Check|Save|Damage|Template|Condition)\[/i.test(sourceInners[0])) return null;
  if (!sourceInners.slice(1).every(inner => /^@(UUID|Compendium|Embed|Check|Save|Damage|Template|Condition)\[[^\]]*\](?:\{[^{}]*\})?$/i.test(inner))) return null;
  const translatedChoices = sourceInners.slice(1).map(inner => translatedReference(inner, referenceLabels));
  if (translatedChoices.some(value => value === null)) return null;

  const leading = [];
  const trimmed = translation.trim();
  let cursor = 0;
  for (const match of trimmed.matchAll(paragraph)) {
    if (match.index !== cursor && trimmed.slice(cursor, match.index).trim()) break;
    const inner = match[0].replace(/^<p\b[^>]*>/i, "").replace(/<\/p>$/i, "").trim();
    if (/@(?:UUID|Compendium|Embed|Check|Save|Damage|Template|Condition)\[/i.test(inner) || /^Prerequisito:/i.test(inner)) break;
    leading.push(inner);
    cursor = match.index + match[0].length;
  }
  if (!leading.length) return null;
  return `<p>${leading.join(" ")}</p>${translatedChoices.map(choice => `<p>${choice}</p>`).join("")}`;
}

export function rebaseInvariantTokens(source, translation, { referenceLabels } = {}) {
  translation = translation.replace(/^\s*<p\b[^>]*>\s*Prerequisito:[\s\S]*?<\/p>\s*/i, "");
  translation = dropDuplicatedFormattingPunctuation(translation);
  translation = dropLegacyBreaks(source, translation);
  translation = dropEmptySpacerParagraphs(source, translation);
  translation = stripLegacySpellHeader(translation);
  const choiceList = reshapeReferenceChoiceList(source, translation, referenceLabels);
  if (choiceList !== null) translation = choiceList;
  if (!/<table\b/i.test(source) && /<table\b/i.test(translation)) {
    translation = translation.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, "");
  }
  const sourceHtml = scanHtml(source);
  let translatedHtml = scanHtml(translation);
  const sourceShape = sourceHtml.tokens.map(({ kind, name, selfClosing }) => ({ kind, name, selfClosing }));
  let translatedShape = translatedHtml.tokens.map(({ kind, name, selfClosing }) => ({ kind, name, selfClosing }));
  if (!sourceHtml.errors.length && !translatedHtml.errors.length && JSON.stringify(sourceShape) !== JSON.stringify(translatedShape)) {
    const reshaped = reshapeLegacyParagraphs(source, translation);
    if (reshaped !== null) {
      translation = reshaped;
      translatedHtml = scanHtml(translation);
      translatedShape = translatedHtml.tokens.map(({ kind, name, selfClosing }) => ({ kind, name, selfClosing }));
    }
    if (JSON.stringify(sourceShape) !== JSON.stringify(translatedShape)) {
      const projected = reshapeEquivalentTextNodes(source, translation);
      if (projected !== null) {
        translation = projected;
        translatedHtml = scanHtml(translation);
        translatedShape = translatedHtml.tokens.map(({ kind, name, selfClosing }) => ({ kind, name, selfClosing }));
      }
    }
  }
  if (sourceHtml.errors.length || translatedHtml.errors.length || JSON.stringify(sourceShape) !== JSON.stringify(translatedShape)) {
    return null;
  }

  let rebased = replaceSequential(translation, translatedHtml.rawTokens, sourceHtml.rawTokens);
  if (rebased === null) return null;

  rebased = injectMissingReferences(source, rebased, referenceLabels);

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

export function planSynchronization({ sourceRecords, translationRecords, referenceLabels }) {
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
    const storageKey = candidate.name;

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
        const rebased = translationPath ? rebaseInvariantTokens(field.value, String(translatedValue), { referenceLabels }) : null;
        if (rebased !== null) repairs.push({ fieldPath: field.fieldPath, translationPath, value: rebased });
        else diagnostics.push(...fieldDiagnostics.map(item => ({ ...item, fieldPath: field.fieldPath })));
      }
    }

    if (diagnostics.length) {
      plan.manualReview.push(queueItem(record, {
        reason: "invariant-failure",
        lookupKey: storageKey,
        matchedLookupKey: candidate.lookupKey,
        diagnostics,
        ...(repairs.length ? { repairs } : {})
      }));
      continue;
    }

    if (missing.length) {
      plan.needsTranslation.push(queueItem(record, {
        reason: "missing-visible-fields",
        lookupKey: storageKey,
        matchedLookupKey: candidate.lookupKey,
        fieldPaths: missing,
        ...(repairs.length ? { repairs } : {})
      }));
      continue;
    }

    plan.safe.push(queueItem(record, {
      lookupKey: storageKey,
      matchedLookupKey: candidate.lookupKey,
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
