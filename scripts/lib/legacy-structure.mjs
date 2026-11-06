const TERMS = new Map(Object.entries({
  "Path of the Berserker": "Cammino del Berserker",
  "College of Lore": "Collegio della Sapienza",
  "Circle of the Land": "Circolo della Terra",
  "Draconic Bloodline": "Discendenza Draconica",
  "Life Domain": "Dominio della Vita",
  "Oath of Devotion": "Giuramento di Devozione",
  "School of Evocation": "Scuola di Invocazione",
  "Way of the Open Hand": "Via della Mano Aperta",
  "Pact of the Blade": "Patto della Lama",
  "Pact of the Chain": "Patto della Catena",
  "Pact of the Tome": "Patto del Tomo",
  "Eldritch Blast": "Deflagrazione Occulta",
  "The Fiend": "L'Immondo",
  Barbarian: "Barbaro", Bard: "Bardo", Champion: "Campione", Cleric: "Chierico",
  Druid: "Druido", Fighter: "Guerriero", Hunter: "Cacciatore", Monk: "Monaco",
  Paladin: "Paladino", Ranger: "Ranger", Rogue: "Ladro", Sorcerer: "Stregone",
  Thief: "Furfante", Warlock: "Warlock", Wizard: "Mago"
}));

const FOLDERS = {
  "Barbarian Features": "Privilegi del Barbaro",
  "Path of the Berserker Features": "Privilegi del Cammino del Berserker",
  "Bard Features": "Privilegi del Bardo",
  "College of Lore Features": "Privilegi del Collegio della Sapienza",
  "Cleric Features": "Privilegi del Chierico",
  "Life Domain Features": "Privilegi del Dominio della Vita",
  "Circle of the Land Features": "Privilegi del Circolo della Terra",
  "Druid Features": "Privilegi del Druido",
  "Champion Features": "Privilegi del Campione",
  "Fighter Features": "Privilegi del Guerriero",
  "Monk Features": "Privilegi del Monaco",
  "Way of the Open Hand Features": "Privilegi della Via della Mano Aperta",
  "Oath of Devotion Features": "Privilegi del Giuramento di Devozione",
  "Paladin Features": "Privilegi del Paladino",
  "Hunter Features": "Privilegi del Cacciatore",
  "Ranger Features": "Privilegi del Ranger",
  "Rogue Features": "Privilegi del Ladro",
  "Thief Features": "Privilegi del Furfante",
  "Fighting Styles": "Stili di Combattimento",
  "Draconic Bloodline Features": "Privilegi della Discendenza Draconica",
  Metamagic: "Metamagia",
  "Sorcerer Features": "Privilegi dello Stregone",
  "Eldritch Invocations": "Suppliche Occulte",
  "The Fiend Features": "Privilegi dell'Immondo",
  "Warlock Features": "Privilegi del Warlock",
  "School of Evocation Features": "Privilegi della Scuola di Invocazione",
  "Wizard Features": "Privilegi del Mago"
};

export function translateRequirement(value) {
  if (value === "STR 13 or higher") return "FOR 13 o superiore";
  let output = value;
  for (const [source, translation] of [...TERMS].sort((a, b) => b[0].length - a[0].length)) {
    output = output.replaceAll(source, translation);
  }
  return output.replace(/\b(Ranger|Warlock) (\d+)\b/g, "$1 $2°");
}

export function translateFeatureFolder(value) {
  return FOLDERS[value] ?? null;
}
