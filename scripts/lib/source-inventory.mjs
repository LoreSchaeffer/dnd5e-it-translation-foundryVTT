import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import yaml from "js-yaml";

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(entryPath));
    else if (/\.ya?ml$/i.test(entry.name)) files.push(entryPath);
  }
  return files;
}

function detectDocumentType(data, isFolder) {
  if (isFolder) return "Folder";
  if (Array.isArray(data?.pages)) return "JournalEntry";
  if (Array.isArray(data?.results)) return "RollTable";
  if (Array.isArray(data?.changes)) return "ActiveEffect";
  if (data?.prototypeToken || Array.isArray(data?.items)) return "Actor";
  return "Item";
}

export async function loadSourcePack(packPath) {
  const resolvedPackPath = path.resolve(packPath);
  const pack = path.basename(resolvedPackPath);
  const records = [];

  for (const filePath of await walk(resolvedPackPath)) {
    const data = yaml.load(await readFile(filePath, "utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error(`Expected one YAML object in ${filePath}`);
    }
    if (!data._id) throw new Error(`Foundry document has no _id: ${filePath}`);

    const isFolder = path.basename(filePath).startsWith("_folder.");
    records.push({
      kind: isFolder ? "folder" : "document",
      pack,
      id: data._id,
      name: data.name ?? "",
      sourcePath: path.relative(path.dirname(resolvedPackPath), filePath).replaceAll("\\", "/"),
      documentType: detectDocumentType(data, isFolder),
      data
    });
  }

  return records;
}
