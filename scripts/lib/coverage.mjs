import { EXCLUDED_PACKS, IN_SCOPE_PACKS } from "./config.mjs";
import { compareInvariants } from "./invariants.mjs";
import { detectResiduals } from "./residuals.mjs";
import { walkVisibleFields } from "./visible-fields.mjs";

function issue(code, details = {}) {
  return { code, severity: "blocking", ...details };
}

function isPresent(value) {
  return typeof value === "string" ? value.length > 0 : value !== undefined && value !== null;
}

function byId(values, id) {
  return values?.find(value => value?._id === id);
}

function getPath(value, pathText) {
  const segments = pathText.match(/[^.[\]]+/g) ?? [];
  return segments.reduce((current, key) => current?.[key], value);
}

function translateNestedField(translation, rest) {
  if (rest === "name") return translation?.name;
  if (rest === "system.description.value") return translation?.description ?? translation?.system?.description?.value;
  if (rest === "system.description.chat") return translation?.chat ?? translation?.system?.description?.chat;
  if (rest === "system.materials.value") return translation?.materials ?? translation?.system?.materials?.value;
  return getPath(translation, rest.replace(/^system\./, "")) ?? getPath(translation, rest);
}

export function translationForField(sourceRecord, field, translation) {
  const fieldPath = field.fieldPath;
  if (fieldPath === "name") return translation?.name;
  if (fieldPath === "system.description.value" || fieldPath === "description") return translation?.description;
  if (fieldPath === "system.description.chat") return translation?.chat;
  if (fieldPath === "system.materials.value") return translation?.materials;

  let match = fieldPath.match(/^system\.advancement\[([^\]]+)\]\.(.+)$/);
  if (match) {
    return translateNestedField(translation?.advancement?.[match[1]], match[2]);
  }

  match = fieldPath.match(/^pages\[([^\]]+)\]\.(.+)$/);
  if (match) {
    const page = byId(sourceRecord.data.pages, match[1]);
    const translatedPage = translation?.pages?.[match[1]] ?? translation?.pages?.[page?.name];
    if (match[2] === "name") return translatedPage?.name;
    if (match[2] === "text.content") return translatedPage?.text?.content ?? translatedPage?.content ?? translatedPage?.description;
    if (match[2] === "system.tooltip") return translatedPage?.system?.tooltip ?? translatedPage?.tooltip;
    return translateNestedField(translatedPage, match[2]);
  }

  match = fieldPath.match(/^results\[([^\]]+)\]\.(.+)$/);
  if (match) {
    const result = byId(sourceRecord.data.results, match[1]);
    const rangeKey = Array.isArray(result?.range) ? result.range.join("-") : null;
    const translatedResult = translation?.results?.[match[1]] ?? translation?.results?.[rangeKey] ?? translation?.results?.[result?.text];
    if (["text", "description"].includes(match[2]) && typeof translatedResult === "string") return translatedResult;
    return translateNestedField(translatedResult, match[2]);
  }

  match = fieldPath.match(/^items\[([^\]]+)\]\.(.+)$/);
  if (match) {
    const embedded = byId(sourceRecord.data.items, match[1]);
    const translatedItem = translation?.items?.[match[1]] ?? translation?.items?.[embedded?.name];
    return translateNestedField(translatedItem, match[2]);
  }

  match = fieldPath.match(/^system\.activities\.([^.]+)\.(.+)$/);
  if (match) {
    const activity = sourceRecord.data.system?.activities?.[match[1]];
    const translatedActivity = translation?.activities?.[match[1]] ?? translation?.activities?.[activity?.name];
    const profile = match[2].match(/^profiles\[([^\]]+)\]\.(.+)$/);
    if (profile) return translateNestedField(translatedActivity?.profiles?.[profile[1]], profile[2]);
    return translateNestedField(translatedActivity, match[2]);
  }

  match = fieldPath.match(/^effects\[([^\]]+)\]\.(.+)$/);
  if (match) {
    const effect = byId(sourceRecord.data.effects, match[1]);
    const translatedEffect = translation?.effects?.[match[1]] ?? translation?.effects?.[effect?.name];
    return translateNestedField(translatedEffect, match[2]);
  }

  return translateNestedField(translation, fieldPath);
}

function emptySummary(total = 0) {
  return { total, translated: 0, missing: 0, partial: 0, review: 0 };
}

export function auditPack({ pack, sourceRecords, translationRecords, allowlist, permitTestPack = false }) {
  if (EXCLUDED_PACKS.includes(pack)) throw new Error(`Refusing excluded modern pack ${pack}`);
  if (!permitTestPack && !IN_SCOPE_PACKS.includes(pack)) throw new Error(`Pack is outside configured scope: ${pack}`);

  const sourceDocuments = sourceRecords.filter(record => record.kind === "document");
  const sourceFolders = sourceRecords.filter(record => record.kind === "folder");
  const translatedEntries = translationRecords.filter(record => record.kind === "entry");
  const translatedFolders = translationRecords.filter(record => record.kind === "folder");
  const entriesByKey = new Map(translatedEntries.map(record => [record.lookupKey, record]));
  const folderKeys = new Set(translatedFolders.map(record => record.lookupKey));
  const sourceNames = new Map();
  const issues = [];
  const summary = {
    documents: emptySummary(sourceDocuments.length),
    folders: emptySummary(sourceFolders.length),
    fields: { total: 0, translated: 0, missing: 0, invariantFailures: 0, englishResiduals: 0, imperialResiduals: 0 }
  };

  for (const record of sourceDocuments) {
    sourceNames.set(record.name, (sourceNames.get(record.name) ?? 0) + 1);
  }

  for (const folder of sourceFolders) {
    if (folderKeys.has(folder.name) || folderKeys.has(folder.id)) summary.folders.translated += 1;
    else {
      summary.folders.missing += 1;
      issues.push(issue("missing-folder", { pack, id: folder.id, name: folder.name, sourcePath: folder.sourcePath }));
    }
  }

  for (const record of sourceDocuments) {
    const fields = walkVisibleFields(record);
    summary.fields.total += fields.length;
    const translated = entriesByKey.get(record.id) ?? entriesByKey.get(record.name);
    if (!translated) {
      summary.documents.missing += 1;
      summary.fields.missing += fields.length;
      issues.push(issue("missing-document", { pack, id: record.id, name: record.name, sourcePath: record.sourcePath }));
      continue;
    }

    const issueStart = issues.length;
    if (sourceNames.get(record.name) > 1 && !entriesByKey.has(record.id)) {
      issues.push(issue("ambiguous-name", { pack, id: record.id, name: record.name, sourcePath: record.sourcePath }));
    }

    for (const field of fields) {
      const translatedValue = translationForField(record, field, translated.data);
      if (!isPresent(translatedValue)) {
        summary.fields.missing += 1;
        issues.push(issue("missing-field", { pack, id: record.id, name: record.name, fieldPath: field.fieldPath, sourcePath: record.sourcePath }));
        continue;
      }

      summary.fields.translated += 1;
      const context = { pack, id: record.id, name: record.name, fieldPath: field.fieldPath, sourcePath: record.sourcePath };
      const invariantIssues = compareInvariants(field, String(translatedValue));
      summary.fields.invariantFailures += invariantIssues.length;
      issues.push(...invariantIssues.map(diagnostic => ({ ...diagnostic, ...context })));
      const residualIssues = detectResiduals({ source: field.value, translation: String(translatedValue), context, allowlist });
      summary.fields.englishResiduals += residualIssues.filter(item => item.code === "unchanged-english" || item.code === "english-residual").length;
      summary.fields.imperialResiduals += residualIssues.filter(item => item.code === "imperial-unit").length;
      issues.push(...residualIssues);
    }

    const documentIssues = issues.slice(issueStart).filter(item => item.id === record.id);
    if (!documentIssues.length) summary.documents.translated += 1;
    else {
      summary.documents.partial += 1;
      if (documentIssues.some(item => ["ambiguous-name", "unchanged-english", "english-residual"].includes(item.code))) {
        summary.documents.review += 1;
      }
    }
  }

  const sourceKeys = new Set(sourceDocuments.flatMap(record => [record.id, record.name]));
  for (const translated of translatedEntries) {
    if (!sourceKeys.has(translated.lookupKey)) {
      issues.push(issue("extra-entry", { pack, name: translated.lookupKey, sourcePath: translated.sourcePath }));
    }
  }

  return { pack, summary, issues };
}

export function buildReport(packAudits) {
  const packs = [...packAudits].sort((left, right) => left.pack.localeCompare(right.pack));
  const totals = {
    documents: emptySummary(),
    folders: emptySummary(),
    fields: { total: 0, translated: 0, missing: 0, invariantFailures: 0, englishResiduals: 0, imperialResiduals: 0 },
    blockingIssues: 0
  };
  for (const audit of packs) {
    for (const category of ["documents", "folders"]) {
      for (const key of Object.keys(totals[category])) totals[category][key] += audit.summary[category][key];
    }
    for (const key of Object.keys(totals.fields)) totals.fields[key] += audit.summary.fields[key];
    totals.blockingIssues += audit.issues.filter(item => item.severity === "blocking").length;
  }
  return { schemaVersion: 1, totals, packs };
}

export function hasBlockingFailures(report) {
  return report.totals.blockingIssues > 0;
}

export function renderMarkdownReport(report) {
  const lines = [
    "# Translation Audit",
    "",
    "| Pack | Documents | Complete | Missing | Partial | Folders missing | Fields missing | Blocking issues |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"
  ];
  for (const audit of report.packs) {
    lines.push(`| ${audit.pack} | ${audit.summary.documents.total} | ${audit.summary.documents.translated} | ${audit.summary.documents.missing} | ${audit.summary.documents.partial} | ${audit.summary.folders.missing} | ${audit.summary.fields.missing} | ${audit.issues.filter(item => item.severity === "blocking").length} |`);
  }
  lines.push("", `Total blocking issues: ${report.totals.blockingIssues}`, "", "## Issues", "");
  for (const audit of report.packs) {
    for (const item of audit.issues) {
      lines.push(`- **${item.code}** \`${audit.pack}:${item.id ?? item.name ?? "pack"}${item.fieldPath ? `:${item.fieldPath}` : ""}\``);
    }
  }
  return `${lines.join("\n")}\n`;
}
