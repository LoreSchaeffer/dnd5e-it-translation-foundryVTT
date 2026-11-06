import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolvePaths } from "./lib/config.mjs";
import { translateEffectFolder, translateEffectName } from "./lib/effects-translation.mjs";
import { loadSourcePack } from "./lib/source-inventory.mjs";

const DESCRIPTIONS = {
  phbeffBreWeapAci: "<p>La tua Arma a Soffio infligge danni da Acido.</p>",
  phbeffBreWeapCol: "<p>La tua Arma a Soffio infligge danni da Freddo.</p>",
  phbeffBreWeapFir: "<p>La tua Arma a Soffio infligge danni da Fuoco.</p>",
  phbeffBreWeapLig: "<p>La tua Arma a Soffio infligge danni da Fulmine.</p>",
  phbeffBreWeapPoi: "<p>La tua Arma a Soffio infligge danni da Veleno.</p>",
  phbeffAuraLife00: "<p>Finché si trovano nell'aura, tu e i tuoi alleati possedete Resistenza ai danni Necrotici e i vostri massimi dei Punti Ferita non possono essere ridotti. Se un alleato con 0 Punti Ferita inizia il proprio turno nell'aura, recupera [[/healing 1 type=healing]]{1 Punto Ferita}.</p>",
  phbeffSilenced00: "<p>Qualsiasi creatura o oggetto interamente all'interno della Sfera possiede Immunità ai danni da Tuono e le creature interamente al suo interno sono Assordate. In quell'area è impossibile lanciare un incantesimo che includa una componente Verbale.</p>"
};

async function main() {
  const sourceIndex = process.argv.indexOf("--source");
  const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
  const moduleRoot = path.join(import.meta.dirname, "..");
  const paths = await resolvePaths({ moduleRoot, sourceRoot });
  const source = await loadSourcePack(path.join(paths.sourcePacksRoot, "effects"));
  const folders = new Map(source.filter(record => record.kind === "folder").map(record => [record.id, record.name]));
  const targetPath = path.join(paths.compendiumRoot, "dnd5e.effects.json");
  const document = JSON.parse(await readFile(targetPath, "utf8"));
  document.folders = {};
  document.entries = {};
  const documents = source.filter(item => item.kind === "document");
  const nameCounts = new Map();
  for (const record of documents) nameCounts.set(record.name, (nameCounts.get(record.name) ?? 0) + 1);
  for (const folder of source.filter(record => record.kind === "folder")) {
    const translated = translateEffectFolder(folder.name);
    if (!translated) throw new Error(`Missing effect folder translation: ${folder.name}`);
    document.folders[folder.name] = translated;
  }
  for (const record of documents) {
    const folder = folders.get(record.data.folder);
    const name = translateEffectName(record.name, folder);
    if (!name) throw new Error(`Missing effect name translation: ${record.name} (${folder})`);
    const key = nameCounts.get(record.name) > 1 ? record.id : record.name;
    document.entries[key] = { ...(key === record.id ? { _id: record.id } : {}), name, ...(DESCRIPTIONS[record.id] ? { description: DESCRIPTIONS[record.id] } : {}) };
  }
  await writeFile(targetPath, `${JSON.stringify(document, null, 2)}\n`);
  process.stdout.write(`${Object.keys(document.entries).length} shared effects translated\n`);
}

main().catch(error => { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; });
