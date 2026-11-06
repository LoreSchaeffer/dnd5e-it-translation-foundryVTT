import { readFile } from "node:fs/promises";
import path from "node:path";

function packName(filePath) {
  return path.basename(filePath).replace(/^dnd5e\./, "").replace(/\.json$/i, "");
}

export async function loadBabelePack(filePath) {
  const resolvedPath = path.resolve(filePath);
  const pack = packName(resolvedPath);
  const data = JSON.parse(await readFile(resolvedPath, "utf8"));
  const records = [];

  for (const [lookupKey, translatedName] of Object.entries(data.folders ?? {})) {
    records.push({
      kind: "folder",
      pack,
      id: null,
      lookupKey,
      name: lookupKey,
      sourcePath: path.basename(resolvedPath),
      documentType: "Folder",
      data: { name: translatedName }
    });
  }

  for (const [lookupKey, translation] of Object.entries(data.entries ?? {})) {
    records.push({
      kind: "entry",
      pack,
      id: null,
      lookupKey,
      name: lookupKey,
      sourcePath: path.basename(resolvedPath),
      documentType: "BabeleEntry",
      data: translation
    });
  }

  return records;
}
