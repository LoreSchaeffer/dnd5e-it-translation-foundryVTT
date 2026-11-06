import { scanFoundryTokens } from "./foundry-tokens.mjs";
import { scanHtml } from "./html-tokens.mjs";

function valueOf(input) {
  return typeof input === "string" ? input : input?.value ?? "";
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function identityOf(source) {
  if (!source || typeof source === "string") return {};
  return {
    pack: source.pack,
    id: source.id,
    fieldPath: source.fieldPath
  };
}

export function compareInvariants(source, translation) {
  const sourceText = valueOf(source);
  const translationText = valueOf(translation);
  const identity = identityOf(source);
  const diagnostics = [];
  const add = (code, message) => diagnostics.push({ code, severity: "blocking", message, ...identity });

  const sourceHtml = scanHtml(sourceText);
  const translationHtml = scanHtml(translationText);
  if (translationHtml.errors.length) add("html-balance", translationHtml.errors.join("; "));

  const sourceTags = sourceHtml.tokens.map(({ kind, name, selfClosing }) => ({ kind, name, selfClosing }));
  const translationTags = translationHtml.tokens.map(({ kind, name, selfClosing }) => ({ kind, name, selfClosing }));
  if (!same(sourceTags, translationTags)) add("html-tag-sequence", "HTML tag sequence differs from source");

  const sourceAttributes = sourceHtml.tokens.map(token => token.attributes);
  const translationAttributes = translationHtml.tokens.map(token => token.attributes);
  if (!same(sourceAttributes, translationAttributes)) add("html-attributes", "HTML attributes differ from source");

  const sourceFoundry = scanFoundryTokens(sourceText);
  const translationFoundry = scanFoundryTokens(translationText);
  if (sourceFoundry.references.length !== translationFoundry.references.length) {
    add("foundry-reference-count", "Foundry reference count differs from source");
  } else if (!same(sourceFoundry.references, translationFoundry.references)) {
    add("foundry-references", "Foundry reference targets or order differ from source");
  }

  for (const [property, code, label] of [
    ["inlineRolls", "foundry-inline-rolls", "inline rolls"],
    ["commands", "foundry-commands", "slash commands"],
    ["placeholders", "foundry-placeholders", "placeholders"],
    ["formulas", "foundry-formulas", "formulas"],
    ["dataReferences", "foundry-data-references", "data references"]
  ]) {
    if (!same(sourceFoundry[property], translationFoundry[property])) {
      add(code, `Foundry ${label} differ from source`);
    }
  }

  return diagnostics;
}
