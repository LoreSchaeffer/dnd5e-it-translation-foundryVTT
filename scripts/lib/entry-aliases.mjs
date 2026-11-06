export function migrateEntryAliases(document, aliases) {
  const output = structuredClone(document);
  output.entries ??= {};
  const moved = [];
  for (const [legacyKey, target] of Object.entries(aliases)) {
    const legacy = output.entries[legacyKey];
    if (!legacy) throw new Error(`Missing legacy alias entry: ${legacyKey}`);
    const targetKey = target.key ?? target.name;
    if (output.entries[targetKey]) {
      throw new Error(`Refusing to overwrite alias target: ${target.name}`);
    }
    output.entries[targetKey] = { ...legacy, _id: target.id };
    delete output.entries[legacyKey];
    moved.push({ legacyKey, targetKey, ...target });
  }
  return { document: output, moved };
}
