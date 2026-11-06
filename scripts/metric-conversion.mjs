const DISTANCE_FIELDS = Object.freeze(["burrow", "climb", "fly", "swim", "walk"]);
const SENSE_FIELDS = Object.freeze(["blindsight", "darkvision", "tremorsense", "truesight"]);
const TEMPLATE_FIELDS = Object.freeze(["size", "width"]);

function roundToTwoDecimals(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function convertScalar(value, factor) {
  if (value === 0 || value === null || value === undefined || value === "") return value;
  if (typeof value !== "number" && typeof value !== "string") return value;
  if (typeof value === "string" && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return value;

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return roundToTwoDecimals(numeric * factor);
}

export function poundsToKilograms(value) {
  return convertScalar(value, 0.5);
}

export function feetToMetres(value) {
  return convertScalar(value, 0.3);
}

export function milesToKilometres(value) {
  return convertScalar(value, 1.5);
}

function distanceConverter(units) {
  if (units === "ft") return { convert: feetToMetres, units: "m" };
  if (units === "mi") return { convert: milesToKilometres, units: "km" };
  return null;
}

function convertFields(value, fields, sourceUnits, includeUnits) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const conversion = distanceConverter(sourceUnits);
  if (!conversion) return value;

  const converted = { ...value };
  for (const field of fields) {
    if (Object.hasOwn(value, field)) converted[field] = conversion.convert(value[field]);
  }
  if (includeUnits) converted.units = conversion.units;
  return converted;
}

export function convertRange(range) {
  return convertFields(range, ["value", "long"], range?.units, true);
}

export function convertMovement(movement) {
  return convertFields(movement, DISTANCE_FIELDS, movement?.units, true);
}

export function convertSenses(senses, fallbackUnits) {
  const sourceUnits = senses?.units ?? fallbackUnits;
  return convertFields(senses, SENSE_FIELDS, sourceUnits, Object.hasOwn(senses ?? {}, "units"));
}

export function convertTemplate(template) {
  return convertFields(template, TEMPLATE_FIELDS, template?.units, true);
}

function readFlag(document, scope, key) {
  if (typeof document?.getFlag === "function") return document.getFlag(scope, key);
  return document?.flags?.[scope]?.[key];
}

function blocksConversion(document) {
  return Boolean(
    readFlag(document, "babele", "translated") ||
    readFlag(document, "dnd5e-it-translation", "converted")
  );
}

export function buildActorMetricUpdate(actor) {
  if (!actor || blocksConversion(actor)) return null;

  const updates = {};
  const movement = actor.system?.attributes?.movement;
  const convertedMovement = convertMovement(movement);
  const movementUnits = distanceConverter(movement?.units) ? movement.units : undefined;

  if (convertedMovement !== movement) {
    updates["system.attributes.movement"] = convertedMovement;
  }

  const senses = actor.system?.attributes?.senses;
  const convertedSenses = convertSenses(senses, movementUnits);
  if (convertedSenses !== senses) {
    updates["system.attributes.senses"] = convertedSenses;
  }

  const tokenConverter = distanceConverter(movementUnits)?.convert;
  if (tokenConverter && actor.prototypeToken) {
    for (const field of ["dimSight", "brightSight"]) {
      if (Object.hasOwn(actor.prototypeToken, field)) {
        updates[`prototypeToken.${field}`] = tokenConverter(actor.prototypeToken[field]);
      }
    }
  }

  if (movementUnits && actor.system?.traits && Object.hasOwn(actor.system.traits, "weight")) {
    updates["system.traits.weight"] = poundsToKilograms(actor.system.traits.weight);
  }

  return Object.keys(updates).length ? updates : null;
}

export function buildItemMetricUpdate(item) {
  if (!item || blocksConversion(item)) return null;

  const updates = {};
  const range = item.system?.range;
  const convertedRange = convertRange(range);
  if (convertedRange !== range) updates["system.range"] = convertedRange;

  const template = item.system?.target?.template;
  const convertedTemplate = convertTemplate(template);
  if (convertedTemplate !== template) updates["system.target.template"] = convertedTemplate;

  return Object.keys(updates).length ? updates : null;
}

export function buildSceneMetricUpdate(scene) {
  if (!scene || blocksConversion(scene)) return null;
  const conversion = distanceConverter(scene.grid?.units);
  if (!conversion) return null;

  return {
    "grid.distance": conversion.convert(scene.grid.distance),
    "grid.units": conversion.units
  };
}

async function applyMetricUpdate(document, buildUpdate) {
  const updates = buildUpdate(document);
  if (!updates) return false;

  await document.update(updates);
  await document.setFlag("dnd5e-it-translation", "converted", true);
  return true;
}

export function applyActorMetricConversion(actor) {
  return applyMetricUpdate(actor, buildActorMetricUpdate);
}

export function applyItemMetricConversion(item) {
  return applyMetricUpdate(item, buildItemMetricUpdate);
}

export function applySceneMetricConversion(scene) {
  return applyMetricUpdate(scene, buildSceneMetricUpdate);
}
