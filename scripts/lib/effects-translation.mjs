const ABILITY = { Charisma: "Carisma", Constitution: "Costituzione", Dexterity: "Destrezza", Intelligence: "Intelligenza", Strength: "Forza", Wisdom: "Saggezza" };
const SKILL = { Acrobatics: "Acrobazia", "Animal Handling": "Addestrare Animali", Arcana: "Arcano", Athletics: "Atletica", Deception: "Inganno", History: "Storia", Insight: "Intuizione", Intimidation: "Intimidire", Investigation: "Indagare", Medicine: "Medicina", Nature: "Natura", Perception: "Percezione", Performance: "Intrattenere", Persuasion: "Persuasione", Religion: "Religione", "Sleight of Hand": "Rapidità di Mano", Stealth: "Furtività", Survival: "Sopravvivenza" };
const DAMAGE = { Acid: "Acido", Bludgeoning: "Contundenti", Cold: "Freddo", Fire: "Fuoco", Force: "Forza", Lightning: "Fulmine", Necrotic: "Necrotici", Piercing: "Perforanti", Poison: "Veleno", Psychic: "Psichici", Radiant: "Radianti", Slashing: "Taglienti", Thunder: "Tuono" };
const CONDITION = { Bleeding: "Sanguinante", Blinded: "Accecato", Burning: "In Fiamme", Charmed: "Affascinato", Cursed: "Maledetto", Dashing: "Scatto", Deafened: "Assordato", Dehydration: "Disidratato", Diseased: "Malato", Disengaged: "Disimpegno", Dodging: "Schivata", Falling: "In Caduta", Frightened: "Spaventato", Grappled: "Afferrato", Incapacitated: "Incapacitato", Invisible: "Invisibile", Malnutrition: "Malnutrito", "No Opportunity Attacks": "Nessun Attacco di Opportunità", "No Reactions": "Nessuna Reazione", Paralyzed: "Paralizzato", Petrified: "Pietrificato", Poisoned: "Avvelenato", Prone: "Prono", Restrained: "Trattenuto", Silenced: "Silenziato", Stunned: "Stordito", Suffocation: "Soffocamento", Surprised: "Sorpreso", Transformed: "Trasformato", Unconscious: "Privo di Sensi" };

const FOLDERS = {
  "Ability Check Advantage": "Vantaggio alle Prove di Caratteristica", "Ability Check Disadvantage": "Svantaggio alle Prove di Caratteristica",
  "Ability Check & Save Advantage": "Vantaggio alle Prove e ai Tiri Salvezza", "Ability Check & Save Disadvantage": "Svantaggio alle Prove e ai Tiri Salvezza",
  "Ability Save Advantage": "Vantaggio ai Tiri Salvezza", "Ability Save Disadvantage": "Svantaggio ai Tiri Salvezza",
  "Attack Advantage": "Vantaggio agli Attacchi", "Attack Disadvantage": "Svantaggio agli Attacchi", "Condition Immunities": "Immunità alle Condizioni", Conditions: "Condizioni",
  "D20 Tests": "Prove di d20", "Damage Immunities": "Immunità ai Danni", "Damage Resistances": "Resistenze ai Danni", "Damage Vulnerabilities": "Vulnerabilità ai Danni",
  "Skill Advantage": "Vantaggio alle Prove di Abilità", "Skill Disadvantage": "Svantaggio alle Prove di Abilità", Species: "Specie", Dragonborn: "Dragonide", Speeds: "Velocità", Spells: "Incantesimi"
};

export function translateEffectFolder(name) { return FOLDERS[name] ?? null; }

export function translateEffectName(name, folder) {
  if (name === "Silenced") return "Silenziato";
  if (name === "Aura of Life") return "Aura di Vita";
  const polarity = /Disadvantage/.test(name) ? "Svantaggio" : "Vantaggio";
  let match;
  if (name === "Advantage on Ability Checks" || name === "Disadvantage on Ability Checks") return `${polarity} alle Prove di Caratteristica`;
  if (name === "Advantage on Checks & Saves" || name === "Disadvantage on Checks & Saves") return `${polarity} alle Prove e ai Tiri Salvezza`;
  if (name === "Advantage on Saving Throws" || name === "Disadvantage on Saving Throws") return `${polarity} ai Tiri Salvezza`;
  if (name === "Advantage on D20 Tests" || name === "Disadvantage on D20 Tests") return `${polarity} alle Prove di d20`;
  if (name === "Advantage on Skill Checks" || name === "Disadvantage on Skill Checks") return `${polarity} alle Prove di Abilità`;
  if ((match = name.match(/^(Charisma|Constitution|Dexterity|Intelligence|Strength|Wisdom) Check(?: & Save)? (Advantage|Disadvantage)$/))) return `${polarity} alle Prove${name.includes("& Save") ? " e ai Tiri Salvezza" : ""} di ${ABILITY[match[1]]}`;
  if ((match = name.match(/^(Charisma|Constitution|Dexterity|Intelligence|Strength|Wisdom) Save (Advantage|Disadvantage)$/))) return `${polarity} ai Tiri Salvezza su ${ABILITY[match[1]]}`;
  if (name === "Initiative Advantage" || name === "Initiative Disadvantage") return `${polarity} all'Iniziativa`;
  if ((match = name.match(/^(Acrobatics|Animal Handling|Arcana|Athletics|Deception|History|Insight|Intimidation|Investigation|Medicine|Nature|Perception|Performance|Persuasion|Religion|Sleight of Hand|Stealth|Survival) (Advantage|Disadvantage)$/))) return `${polarity} alle Prove di ${SKILL[match[1]]}`;
  if ((match = name.match(/^(Advantage|Disadvantage) on (?:(Melee|Ranged) )?(?:(Spell|Weapon) )?Attacks$/))) {
    return `${polarity} agli Attacchi${match[2] ? match[2] === "Melee" ? " in Mischia" : " a Distanza" : ""}${match[3] ? match[3] === "Spell" ? " con Incantesimo" : " con Arma" : ""}`;
  }
  if (folder === "Conditions") return CONDITION[name] ?? null;
  if (folder === "Condition Immunities" && name.endsWith(" Immunity")) return `Immunità: ${CONDITION[name.slice(0, -9)]}`;
  if (folder?.startsWith("Damage ")) {
    if (name.includes("All Damage")) return folder === "Damage Immunities" ? "Immunità a Tutti i Danni" : folder === "Damage Resistances" ? "Resistenza a Tutti i Danni" : "Vulnerabilità a Tutti i Danni";
    match = name.match(/^(.+) (Immunity|Resistance|Vulnerability)$/);
    if (match) return `${match[2] === "Immunity" ? "Immunità" : match[2] === "Resistance" ? "Resistenza" : "Vulnerabilità"} ai Danni ${DAMAGE[match[1]] === "Acido" || DAMAGE[match[1]] === "Fuoco" || DAMAGE[match[1]] === "Freddo" || DAMAGE[match[1]] === "Fulmine" || DAMAGE[match[1]] === "Forza" || DAMAGE[match[1]] === "Tuono" || DAMAGE[match[1]] === "Veleno" ? `da ${DAMAGE[match[1]]}` : DAMAGE[match[1]]}`;
  }
  const exact = { "Burrow Speed": "Velocità di Scavare", "Climb Speed": "Velocità di Scalare", "Fly Speed": "Velocità di Volare", "Swim Speed": "Velocità di Nuotare", "Speed Doubled": "Velocità Raddoppiata", "Speed Halved": "Velocità Dimezzata", "Speed is 0": "Velocità Pari a 0", "Acid Breath Weapon": "Arma a Soffio di Acido", "Cold Breath Weapon": "Arma a Soffio di Freddo", "Fire Breath Weapon": "Arma a Soffio di Fuoco", "Lightning Breath Weapon": "Arma a Soffio di Fulmine", "Poison Breath Weapon": "Arma a Soffio di Veleno", "Aura of Life": "Aura di Vita" };
  return exact[name] ?? null;
}
