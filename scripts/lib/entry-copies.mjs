export function expandEntryCopies(document, copies) {
  const output = structuredClone(document);
  output.entries ??= {};
  const created = [];
  for (const [sourceKey, targets] of Object.entries(copies)) {
    const source = output.entries[sourceKey];
    if (!source) throw new Error(`Missing copy source entry: ${sourceKey}`);
    for (const target of targets) {
      const targetKey = target.key ?? target.id;
      const existing = output.entries[targetKey];
      if (targetKey !== sourceKey && existing?.description) throw new Error(`Refusing to overwrite copy target: ${targetKey}`);
      output.entries[targetKey] = { ...(existing ?? {}), ...source, _id: target.id };
      created.push({ sourceKey, targetKey, ...target });
    }
    if (!targets.some(target => (target.key ?? target.id) === sourceKey)) delete output.entries[sourceKey];
  }
  return { document: output, created };
}
