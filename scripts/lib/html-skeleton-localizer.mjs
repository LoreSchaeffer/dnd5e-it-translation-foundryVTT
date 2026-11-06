const REFERENCE = /@(UUID|Compendium|Embed|Check|Save|Damage|Template|Condition)\[([^\]]*)\](?:\{([^{}]*)\})?/gi;

export function localizeHtmlSkeleton(sourceHtml, { text, labelsById }) {
  return sourceHtml.split(/(<[^>]+>)/g).map(segment => {
    if (!segment || segment.startsWith("<") || !segment.trim()) return segment;
    const leading = segment.match(/^\s*/u)[0];
    const trailing = segment.match(/\s*$/u)[0];
    const sourceText = segment.trim();
    let localized = sourceText.replace(REFERENCE, (match, type, target) => {
      const id = target.split(".").at(-1);
      const label = labelsById.get(id);
      if (!label) throw new Error(`Missing translated reference label: ${target}`);
      return `@${type}[${target}]{${label}}`;
    });
    if (localized === sourceText) {
      localized = text[sourceText];
      if (localized === undefined) throw new Error(`Missing skeleton text translation: ${sourceText}`);
    }
    return `${leading}${localized}${trailing}`;
  }).join("");
}
