const SKIPPED_SUBTREES = new Set([
  "flags",
  "ownership",
  "permission",
  "texture"
]);

const TECHNICAL_LEAVES = new Set([
  "_id",
  "id",
  "uuid",
  "documentUuid",
  "folder",
  "sort",
  "img",
  "src",
  "icon",
  "type",
  "key",
  "mode",
  "priority",
  "transfer",
  "formula",
  "identifier",
  "calculation"
]);

function hasSegment(segments, value) {
  return segments.some(segment => segment.key === value);
}

function isDescriptionPath(segments) {
  const index = segments.findIndex(segment => segment.key === "description");
  if (index < 0) return false;
  const last = segments.at(-1).key;
  return index === segments.length - 1 || ["value", "chat", "unidentified", "full", "summary"].includes(last);
}

function isBiographyPath(segments) {
  const index = segments.findIndex(segment => segment.key === "biography");
  if (index < 0) return false;
  return ["value", "public"].includes(segments.at(-1).key);
}

function isVisibleChange(segments, root) {
  if (segments.length !== 2 || segments[0].key !== "changes" || segments[1].key !== "value") return false;
  const change = root.changes?.[segments[0].index];
  return typeof change?.key === "string" && /(?:^|\.)(?:custom|label|name|description|text)$/.test(change.key);
}

function isVisibleString(segments, value, root) {
  if (!value) return false;
  if (segments.some(segment => SKIPPED_SUBTREES.has(segment.key))) return false;
  const last = segments.at(-1).key;
  if (TECHNICAL_LEAVES.has(last)) return false;
  if (isVisibleChange(segments, root)) return true;
  if (hasSegment(segments, "changes")) return false;
  if (isDescriptionPath(segments)) return true;
  if (isBiographyPath(segments)) return true;
  if (last === "name") return true;
  if (["label", "title", "hint", "tooltip", "requirements", "chatFlavor", "content", "summary", "public", "alignment"].includes(last)) return true;
  if (last === "text" && hasSegment(segments, "results")) return true;
  if (last === "value" && hasSegment(segments, "materials")) return true;
  if (last === "custom" && (hasSegment(segments, "type") || hasSegment(segments, "traits"))) return true;
  if (last === "special" && hasSegment(segments, "senses")) return true;
  return false;
}

function appendPath(base, key, value, index = null) {
  if (index !== null) {
    const identity = value && typeof value === "object" && value._id ? value._id : index;
    return `${base}[${identity}]`;
  }
  return base ? `${base}.${key}` : key;
}

export function walkVisibleFields(document) {
  const fields = [];
  const root = document.data;

  function visit(value, segments, fieldPath) {
    if (typeof value === "string") {
      if (isVisibleString(segments, value, root)) {
        fields.push({
          pack: document.pack,
          id: document.id,
          sourcePath: document.sourcePath,
          documentType: document.documentType,
          fieldPath,
          value
        });
      }
      return;
    }
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value)) {
      value.forEach((child, index) => {
        const arraySegment = segments.at(-1);
        const childSegments = [...segments.slice(0, -1), { ...arraySegment, index }];
        visit(child, childSegments, appendPath(fieldPath, "", child, index));
      });
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      if (SKIPPED_SUBTREES.has(key)) continue;
      visit(child, [...segments, { key }], appendPath(fieldPath, key, child));
    }
  }

  visit(root, [], "");
  return fields;
}
