import { compareInvariants } from "./invariants.mjs";

const COLORS = {
  Black: ["Nero", "Acido", "acid", "Destrezza"],
  Blue: ["Blu", "Fulmine", "lightning", "Destrezza"],
  Brass: ["d'Ottone", "Fuoco", "fire", "Destrezza"],
  Bronze: ["di Bronzo", "Fulmine", "lightning", "Destrezza"],
  Copper: ["di Rame", "Acido", "acid", "Destrezza"],
  Gold: ["d'Oro", "Fuoco", "fire", "Destrezza"],
  Green: ["Verde", "Veleno", "poison", "Costituzione"],
  Red: ["Rosso", "Fuoco", "fire", "Destrezza"],
  Silver: ["d'Argento", "Gelo", "cold", "Costituzione"],
  White: ["Bianco", "Gelo", "cold", "Costituzione"]
};

export function translateBreathWeapon(record) {
  const color = record.name.match(/^(\w+) Breath Weapon$/)?.[1];
  const terms = COLORS[color];
  if (!terms) return null;
  const [italianColor, energy, damage, save] = terms;
  const source = record.data.system.description.value;
  const lookups = [...source.matchAll(/\[\[lookup [^\]]+\]\]/g)].map(match => match[0]);
  if (lookups.length !== 2) throw new Error(`${record.name}: expected two lookup rolls`);
  const activity = Object.values(record.data.system.activities ?? {})[0];
  if (!activity?._id) throw new Error(`${record.name}: missing activity`);
  const damageItalian = { acid: "da acido", lightning: "da fulmine", fire: "da fuoco", poison: "da veleno", cold: "da freddo" }[damage];
  const description = `<p>Puoi usare la tua azione per esalare un soffio distruttivo di ${energy.toLocaleLowerCase("it")}.</p><p>Quando usi la tua arma a soffio, ogni creatura ${lookups[0]} in ${lookups[1]} deve effettuare un tiro salvezza su ${save}. La CD di questo tiro salvezza è pari a 8 + il tuo modificatore di Costituzione + il tuo bonus di competenza. Una creatura subisce 2d6 danni ${damageItalian} se fallisce il tiro salvezza, o la metà dei danni se lo supera. I danni aumentano a 3d6 al 6° livello, 4d6 all'11° livello e 5d6 al 16° livello.</p><p>Dopo aver usato la tua arma a soffio, non puoi usarla di nuovo finché non completi un riposo breve o lungo.</p>`;
  const diagnostics = compareInvariants(source, description);
  if (diagnostics.length) throw new Error(`${record.name}: ${JSON.stringify(diagnostics)}`);
  return {
    name: `Arma a Soffio del Dragonide ${italianColor}`,
    description,
    requirements: `Dragonide ${italianColor}`,
    activities: { [activity._id]: { name: `Esala ${energy}` } }
  };
}
