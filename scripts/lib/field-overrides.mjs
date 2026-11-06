function setPath(object, path, value) {
  let target = object;
  for (const key of path.slice(0, -1)) target = target[key] ??= {};
  target[path.at(-1)] = value;
}

export function babelePathForField(fieldPath) {
  if (fieldPath === "name") return ["name"];
  if (fieldPath === "system.description.value") return ["description"];
  if (fieldPath === "system.description.chat") return ["chat"];
  if (fieldPath === "system.requirements") return ["requirements"];
  if (fieldPath === "system.materials.value") return ["materials"];
  const advancement = fieldPath.match(/^system\.advancement(?:\[([^\]]+)\]|\.([^.]+))\.(.+)$/);
  if (advancement) return ["advancement", advancement[1] ?? advancement[2], ...advancement[3].split(".")];
  const activity = fieldPath.match(/^system\.activities\.([^.]+)\.(.+)$/);
  if (activity) return ["activities", activity[1], ...activity[2].split(".")];
  const effect = fieldPath.match(/^effects\[([^\]]+)\]\.(.+)$/);
  if (effect) return ["effects", effect[1], ...effect[2].split(".")];
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
