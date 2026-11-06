import { isAllowed } from "./allowlist.mjs";

const ENGLISH_SIGNAL = /\b(?:the|and|you|your|this|that|these|those|with|within|must|target|creature|spell|attack|damage|saving throw|feet|foot|miles?|pounds?|inches?)\b/i;
const IMPERIAL_UNIT = /\b(?:\d+(?:[.,]\d+)?\s*)?(?:feet|foot|ft\.?|miles?|mi\.?|pounds?|lbs?\.?|inches?|in\.?)\b/i;

function visibleText(value) {
  return value
    .replace(/@(UUID|Compendium|Embed|Check|Save|Damage|Template|Condition)\[[^\]]*\](?:\{([^{}]*)\})?/gi, (_, _type, label) => label ?? "")
    .replace(/\[\[[\s\S]*?\]\]/g, "")
    .replace(/\{\{\{?[\s\S]*?\}\}\}?/g, "")
    .replace(/\$\{[^{}]*\}/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectResiduals({ source, translation, context, allowlist }) {
  const sourceVisible = visibleText(source);
  const translationVisible = visibleText(translation);
  const candidates = [];

  if (sourceVisible && sourceVisible === translationVisible && /[A-Za-z]/.test(sourceVisible)) {
    candidates.push({ code: "unchanged-english", value: translationVisible, message: "Visible translation is identical to the English source" });
  }
  if (ENGLISH_SIGNAL.test(translationVisible)) {
    candidates.push({ code: "english-residual", value: translationVisible, message: "High-confidence English wording remains visible" });
  }
  if (IMPERIAL_UNIT.test(translationVisible)) {
    candidates.push({ code: "imperial-unit", value: translationVisible, message: "An imperial unit remains visible" });
  }

  return candidates
    .filter(issue => !isAllowed(issue, context, allowlist))
    .map(issue => ({ ...issue, severity: "blocking", ...context }));
}
