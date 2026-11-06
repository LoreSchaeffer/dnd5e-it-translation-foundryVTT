export function applyStructuredTermsToDocument(source, translation, phrases) {
  const output = structuredClone(translation ?? {});
  const missing = [];

  for (const advancement of source?.system?.advancement ?? []) {
    if (!advancement?._id) continue;
    for (const field of ["title", "hint"]) {
      const value = advancement[field];
      if (typeof value !== "string" || !value.length) continue;
      const translated = phrases[value];
      if (typeof translated !== "string" || !translated.length) {
        missing.push({ id: advancement._id, field, value });
        continue;
      }
      output.advancement ??= {};
      output.advancement[advancement._id] ??= {};
      output.advancement[advancement._id][field] = translated;
    }
  }

  return { translation: output, missing };
}
