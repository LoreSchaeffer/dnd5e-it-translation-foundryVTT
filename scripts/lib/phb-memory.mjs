const FOUNDRY_REFERENCE = /@(UUID|Compendium|Embed|Check|Save|Damage|Template|Condition)\[([^\]]*)\](?:\{([^{}]*)\})?/gi;
const FIVE_TOOLS_TAG = /\{@([a-zA-Z]+) ([^{}]+)\}/g;

function tagLabel(body) {
  const parts = body.split("|");
  return parts.length >= 3 && parts.at(-1) ? parts.at(-1) : parts[0];
}

export function normalizeMemoryText(value) {
  return String(value)
    .replace(FOUNDRY_REFERENCE, (_match, _type, _target, label) => label ?? "")
    .replace(FIVE_TOOLS_TAG, (_match, _type, body) => tagLabel(body))
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en");
}

export function buildPhbMemory(document) {
  const prose = new Map();
  const names = new Map();
  for (const segment of Object.values(document.segments ?? {})) {
    if (!segment?.reviewed || !segment.source || !segment.text) continue;
    prose.set(normalizeMemoryText(segment.source), segment);
    if (["name", "label"].includes(segment.role) && !segment.preserveIdentity && segment.text !== segment.source) {
      names.set(segment.source, segment.text);
    }
  }
  for (const [source, value] of Object.entries(document.names ?? {})) {
    const translated = typeof value === "string" ? value : value?.reviewed && value?.text;
    if (translated && translated !== source && !value?.preserveIdentity) names.set(source, translated);
  }
  return { prose, names };
}

export function translateNameFromMemory(source, memory) {
  return memory.names.get(source) ?? null;
}

function renderTranslation(segment, sourceInner, memory) {
  const references = [...sourceInner.matchAll(FOUNDRY_REFERENCE)];
  const sourceTags = [...segment.source.matchAll(FIVE_TOOLS_TAG)];
  const translatedTags = [...segment.text.matchAll(FIVE_TOOLS_TAG)];
  if (references.length !== sourceTags.length || sourceTags.length !== translatedTags.length) return null;

  let index = 0;
  return segment.text.replace(FIVE_TOOLS_TAG, (_match, _type, body) => {
    const reference = references[index++];
    const parts = body.split("|");
    const sourceLabel = reference[3] ?? parts[0];
    const label = parts.length >= 3 && parts.at(-1)
      ? parts.at(-1)
      : memory.names.get(sourceLabel) ?? sourceLabel;
    return `@${reference[1]}[${reference[2]}]{${label || reference[3] || ""}}`;
  });
}

export function translateHtmlFromMemory(sourceHtml, memory) {
  const paragraph = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  const matches = [...sourceHtml.matchAll(paragraph)];
  if (!matches.length) return null;

  let cursor = 0;
  let output = "";
  for (const match of matches) {
    if (sourceHtml.slice(cursor, match.index).trim() || /<[^>]+>/.test(match[2])) return null;
    const segment = memory.prose.get(normalizeMemoryText(match[2]));
    if (!segment) return null;
    const translated = renderTranslation(segment, match[2], memory);
    if (translated === null) return null;
    output += sourceHtml.slice(cursor, match.index) + `<p${match[1]}>${translated}</p>`;
    cursor = match.index + match[0].length;
  }
  if (sourceHtml.slice(cursor).trim()) return null;
  return output + sourceHtml.slice(cursor);
}
