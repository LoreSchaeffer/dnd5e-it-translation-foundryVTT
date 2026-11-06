export function pruneObsoleteEntries(document, obsoleteNames, sourceNames) {
  const output = structuredClone(document);
  const removed = [];
  for (const name of obsoleteNames) {
    if (sourceNames.has(name)) throw new Error(`Refusing to prune live source entry: ${name}`);
    if (!Object.hasOwn(output.entries ?? {}, name)) continue;
    delete output.entries[name];
    removed.push(name);
  }
  return { document: output, removed };
}
