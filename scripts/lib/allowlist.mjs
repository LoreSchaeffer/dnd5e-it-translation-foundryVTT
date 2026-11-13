import { readFile } from "node:fs/promises";

const VALID_STATUSES = new Set(["verified", "proposed", "review"]);

export function validateAllowlist(entries) {
  if (!Array.isArray(entries)) throw new Error("Allowlist entries must be an array");
  return entries.map((entry, index) => {
    for (const key of ["kind", "pack", "reason", "status"]) {
      if (!entry[key]) throw new Error(`Allowlist entry ${index} is missing ${key}`);
    }
    if (!VALID_STATUSES.has(entry.status)) {
      throw new Error(`Allowlist entry ${index} has invalid status ${entry.status}`);
    }
    if (entry.values !== undefined && (!Array.isArray(entry.values) || !entry.values.length || entry.values.some(value => typeof value !== "string" || !value))) {
      throw new Error(`Allowlist entry ${index} has invalid values`);
    }
    return entry;
  });
}

export async function loadAllowlist(filePath) {
  const parsed = JSON.parse(await readFile(filePath, "utf8"));
  return validateAllowlist(Array.isArray(parsed) ? parsed : parsed.entries);
}

export function isAllowed(issue, context, allowlist) {
  return allowlist.some(entry => {
    if (entry.kind !== issue.code) return false;
    if (entry.pack !== "*" && entry.pack !== context.pack) return false;
    if (entry.id && entry.id !== context.id) return false;
    if (entry.fieldPath && entry.fieldPath !== context.fieldPath) return false;
    if (entry.value !== undefined && entry.value !== issue.value) return false;
    if (entry.values !== undefined && !entry.values.includes(issue.value)) return false;
    return true;
  });
}
