function matches(text, expression, mapper = match => match[0]) {
  return [...text.matchAll(expression)].map(mapper);
}

export function scanFoundryTokens(text) {
  const references = matches(
    text,
    /@(UUID|Compendium|Embed|Check|Save|Damage|Template|Condition)\[([^\]]*)\](?:\{[^{}]*\})?/gi,
    match => `@${match[1]}[${match[2]}]`
  );
  const inlineRolls = matches(text, /\[\[[\s\S]*?\]\]/g);
  const commands = matches(
    text,
    /(?:^|[\r\n])\s*(\/(?:r|roll|damage|check|save)\b[^\r\n<]*)/gim,
    match => match[1].trimEnd()
  );
  const placeholders = [
    ...matches(text, /\{\{\{?[\s\S]*?\}\}\}?/g),
    ...matches(text, /\$\{[^{}]*\}/g)
  ].sort((left, right) => text.indexOf(left) - text.indexOf(right));
  const formulas = matches(text, /\b\d+d\d+(?:\s*[+\-*/]\s*(?:@[A-Za-z_][\w.]*|\d+(?:\.\d+)?))*/gi);
  const dataReferences = matches(text, /@[A-Za-z_][\w.]*/g).filter(token => {
    const index = text.indexOf(token);
    return text[index + token.length] !== "[";
  });

  return { references, inlineRolls, commands, placeholders, formulas, dataReferences };
}
