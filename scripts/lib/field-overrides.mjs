function setPath(object, path, value) {
  let target = object;
  for (const key of path.slice(0, -1)) target = target[key] ??= {};
  target[path.at(-1)] = value;
}

export function babelePathForField(fieldPath) {
  if (fieldPath === "name") return ["name"];
  if (fieldPath === "description") return ["description"];
  if (fieldPath === "system.description.value") return ["description"];
  if (fieldPath === "system.description.chat") return ["chat"];
  if (fieldPath === "system.requirements") return ["requirements"];
  if (fieldPath === "system.materials.value") return ["materials"];
  const advancement = fieldPath.match(/^system\.advancement(?:\[([^\]]+)\]|\.([^.]+))\.(.+)$/);
  if (advancement) return ["advancement", advancement[1] ?? advancement[2], ...advancement[3].split(".")];
  const activityProfile = fieldPath.match(/^system\.activities\.([^.]+)\.profiles\[([^\]]+)\]\.(.+)$/);
  if (activityProfile) return ["activities", activityProfile[1], "profiles", activityProfile[2], ...activityProfile[3].split(".")];
  const activity = fieldPath.match(/^system\.activities\.([^.]+)\.(.+)$/);
  if (activity) return ["activities", activity[1], ...activity[2].split(".")];
  const effect = fieldPath.match(/^effects\[([^\]]+)\]\.(.+)$/);
  if (effect) return ["effects", effect[1], ...effect[2].split(".")];
  const embedded = fieldPath.match(/^items\[([^\]]+)\]\.(.+)$/);
  if (embedded) {
    const nested = babelePathForField(embedded[2]);
    return nested ? ["items", embedded[1], ...nested] : null;
  }
  const page = fieldPath.match(/^pages\[([^\]]+)\]\.(.+)$/);
  if (page) {
    if (page[2] === "name") return ["pages", page[1], "name"];
    if (page[2] === "text.content") return ["pages", page[1], "text", "content"];
    if (page[2] === "system.tooltip") return ["pages", page[1], "system", "tooltip"];
  }
  const result = fieldPath.match(/^results\[([^\]]+)\]\.(.+)$/);
  if (result) return ["results", result[1], ...result[2].split(".")];
  if (/^system\.(?:details|traits|resources|attributes|unidentified)\./.test(fieldPath)) return fieldPath.replace(/^system\./, "").split(".");
  if (/^prototypeToken\./.test(fieldPath)) return fieldPath.split(".");
  return null;
}

export function applyFieldOverrides(entry, overrides) {
  const output = structuredClone(entry);
  for (const [fieldPath, value] of Object.entries(overrides)) {
    const path = babelePathForField(fieldPath);
    if (!path) throw new Error(`Unsupported visible field override: ${fieldPath}`);
    setPath(output, path, value);
  }
  return output;
}

export function entryKeyForRecord(entries, record, duplicateNames = new Set()) {
  const named = entries[record.name];
  if (duplicateNames.has(record.name) && named?._id !== record.id) return record.id;
  if (named && (!named._id || named._id === record.id)) return record.name;
  return record.id;
}
