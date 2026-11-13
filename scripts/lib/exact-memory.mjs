import { translationForField } from "./coverage.mjs";
import { scanHtml } from "./html-tokens.mjs";
import { compareInvariants } from "./invariants.mjs";
import { walkVisibleFields } from "./visible-fields.mjs";

function splitHtml(text) {
  const { rawTokens, errors } = scanHtml(text);
  if (errors.length) return null;
  const segments = [];
  let cursor = 0;
  for (const token of rawTokens) {
    const index = text.indexOf(token, cursor);
    if (index < 0) return null;
    segments.push({ kind: "text", value: text.slice(cursor, index) });
    segments.push({ kind: "tag", value: token });
    cursor = index + token.length;
  }
  segments.push({ kind: "text", value: text.slice(cursor) });
  return segments;
}

function trimParts(text) {
  return {
    leading: text.match(/^\s*/u)?.[0] ?? "",
    value: text.trim(),
    trailing: text.match(/\s*$/u)?.[0] ?? ""
  };
}

function isTechnicalOnlySegment(value) {
  const visible = value
    .replace(/\[\[[\s\S]*?\]\]/gu, "")
    .replace(/@(UUID|Compendium|Embed|Check|Save|Damage|Template|Condition)\[[^\]]*\]/giu, "")
    .replace(/@[A-Za-z_][\w.]*/gu, "")
    .replace(/\b\d+d\d+(?:\s*[+\-*/×]\s*\d+(?:\.\d+)?)*/giu, "");
  return !/[\p{L}\p{N}]/u.test(visible);
}

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

export function buildExactSegmentMemory(pairs) {
  const candidates = new Map();
  for (const { source, translation } of pairs) {
    for (const field of walkVisibleFields(source)) {
      const translated = translationForField(source, field, translation);
      if (typeof translated !== "string" || !translated || translated === field.value) continue;
      if (compareInvariants(field.value, translated).length) continue;
      const sourceSegments = splitHtml(field.value);
      const translatedSegments = splitHtml(translated);
      if (!sourceSegments || !translatedSegments || sourceSegments.length !== translatedSegments.length) continue;
      for (let index = 0; index < sourceSegments.length; index += 1) {
        if (sourceSegments[index].kind !== "text" || translatedSegments[index].kind !== "text") continue;
        const sourceText = sourceSegments[index].value.trim();
        const translatedText = translatedSegments[index].value.trim();
        if (!sourceText || !translatedText || sourceText === translatedText) continue;
        if (compareInvariants(sourceText, translatedText).length) continue;
        const values = candidates.get(sourceText) ?? new Set();
        values.add(translatedText);
        candidates.set(sourceText, values);
      }
    }
  }
  return new Map([...candidates].filter(([, values]) => values.size === 1).map(([source, values]) => [source, [...values][0]]));
}

export function segmentMissingOverrides(source, translation, memory) {
  const overrides = {};
  for (const field of walkVisibleFields(source)) {
    const current = translationForField(source, field, translation);
    if (current !== undefined && current !== null && current !== "") continue;
    const segments = splitHtml(field.value);
    if (!segments) continue;
    let changed = false;
    const localized = [];
    let complete = true;
    for (const segment of segments) {
      if (segment.kind === "tag" || !segment.value.trim()) {
        localized.push(segment.value);
        continue;
      }
      const parts = trimParts(segment.value);
      const value = memory.get(parts.value);
      if (value === undefined) {
        if (isTechnicalOnlySegment(parts.value)) {
          localized.push(segment.value);
          continue;
        }
        complete = false;
        break;
      }
      localized.push(`${parts.leading}${value}${parts.trailing}`);
      changed ||= value !== parts.value;
    }
    if (!complete || !changed) continue;
    const value = localized.join("");
    if (compareInvariants(field.value, value).length) continue;
    overrides[field.fieldPath] = value;
  }
  return overrides;
}

export function configuredMissingOverrides(source, translation, phrases) {
  return exactMissingOverrides(source, translation, new Map(Object.entries(phrases)));
}

export function configuredFolderTranslation(sourceName, current, phrases) {
  return current ?? phrases[sourceName];
}
