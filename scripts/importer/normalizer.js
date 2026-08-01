import {
  DEFAULT_MAX_DEPTH,
  FLAG_EXTERNAL_ID,
  FLAG_SCOPE,
  TOP_LEVEL_ITEM_TYPES
} from "./constants.js";
import { actorSystemDefaults, createTemporaryItemSource } from "./defaults.js";
import {
  asArray,
  duplicateData,
  isPlainObject,
  mergeData,
  randomTempId
} from "./foundry-utils.js";

const VALUE_OBJECT_KEYS = new Set(["value"]);
const DESCRIPTION_KEYS = new Set(["value", "chat"]);
const SUMMARY_KEYS = new Set(["format", "position"]);
const COST_KEYS = new Set(["value", "type", "discountPer"]);
const FORMULA_ENTRY_KEYS = new Set(["op", "dataPath", "value"]);

const INFO_KEYS = {
  vehicle: new Set(["size", "strength", "speed", "defense", "toughness", "powers", "features"]),
  base: new Set(["size", "toughness", "features"])
};

const DERIVED_REMOVALS = new Set([
  "total",
  "pointCosts",
  "equipmentCost",
  "totalCost",
  "parsed",
  "isTrained",
  "label",
  "override",
  "originalValue",
  "overrideRank",
  "numOverrides",
  "overrideRanks"
]);

export async function normalizeDocument(document, options = {}) {
  const actor = document.actor;
  const actorData = normalizeActor(actor);
  const itemDataArray = [];
  for (const item of asArray(actor.items)) {
    itemDataArray.push(await normalizeItem(item, {
      ...options,
      nested: false,
      expectedType: TOP_LEVEL_ITEM_TYPES,
      depth: 0,
      maxDepth: Number.isFinite(options.maxDepth) ? options.maxDepth : DEFAULT_MAX_DEPTH
    }));
  }
  return {
    actorData,
    actorEffects: normalizeActiveEffects(actor.activeEffects),
    itemDataArray
  };
}

export function normalizeActor(actor) {
  const actorType = actor.type || "character";
  const system = mergeData(actorSystemDefaults(actorType), filterActorSystem(stripDerivedFields(actor.system || {})));
  const actorData = {
    name: actor.name,
    type: actorType,
    img: actor.img || "icons/svg/mystery-man.svg",
    data: system,
    flags: mergeData({}, actor.flags || {})
  };
  applyExternalId(actorData, actor.externalId);
  return actorData;
}

export async function normalizeItem(item, options = {}) {
  const type = item.type;
  const source = await createTemporaryItemSource({
    name: item.name,
    type,
    img: item.img || "icons/svg/item-bag.svg"
  }, options);

  source.name = item.name;
  source.type = type;
  source.img = item.img || source.img || "icons/svg/item-bag.svg";
  source.data = source.data || {};
  source.effects = normalizeActiveEffects(item.activeEffects);
  source.flags = mergeData(source.flags || {}, item.flags || {});
  applyExternalId(source, item.externalId);

  if (options.nested) {
    source._id = randomTempId();
  }

  const system = stripDerivedFields(item.system || {});
  const filtered = filterItemSystem(type, system);

  if (["power", "equipment", "vehicle", "base"].includes(type)) {
    const normalizedEffects = [];
    for (const effect of asArray(system.effects)) {
      normalizedEffects.push(await normalizeItem(effect, {
        ...options,
        nested: true,
        expectedType: ["effect"],
        depth: (options.depth || 0) + 1
      }));
    }
    filtered.effects = normalizedEffects;
  }

  if (type === "power") {
    const normalizedPowers = [];
    for (const power of asArray(system.powerArray)) {
      normalizedPowers.push(await normalizeItem(power, {
        ...options,
        nested: true,
        expectedType: ["power"],
        depth: (options.depth || 0) + 1
      }));
    }
    filtered.powerArray = normalizedPowers;
  }

  if (type === "effect") {
    const normalizedModifiers = [];
    for (const modifier of asArray(system.modifiers)) {
      normalizedModifiers.push(await normalizeItem(modifier, {
        ...options,
        nested: true,
        expectedType: ["modifier"],
        depth: (options.depth || 0) + 1
      }));
    }
    filtered.modifiers = normalizedModifiers;
  }

  mergeData(source.data, filtered, { inplace: true });
  delete source.system;
  delete source.items;
  delete source.activeEffects;
  return source;
}

export function normalizeActiveEffects(activeEffects) {
  return asArray(activeEffects).map((effect) => {
    const copy = duplicateData(effect);
    delete copy.system;
    delete copy.activeEffects;
    return copy;
  });
}

function applyExternalId(source, externalId) {
  if (!externalId) return;
  source.flags = source.flags || {};
  source.flags[FLAG_SCOPE] = source.flags[FLAG_SCOPE] || {};
  source.flags[FLAG_SCOPE][FLAG_EXTERNAL_ID] = externalId;
}

export function stripDerivedFields(value) {
  if (Array.isArray(value)) return value.map((entry) => stripDerivedFields(entry));
  if (!isPlainObject(value)) return duplicateData(value);
  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    if (DERIVED_REMOVALS.has(key)) continue;
    result[key] = stripDerivedFields(entry);
  }
  return result;
}

function filterActorSystem(system) {
  const result = {};
  copyKnown(result, system, [
    "abilities",
    "defenses",
    "attributes",
    "info",
    "skills",
    "victoryPoints",
    "earnedCharacterPoints",
    "isMinion",
    "maxPoints"
  ]);
  return result;
}

export function filterItemSystem(type, system) {
  const result = {};
  switch (type) {
    case "advantage":
      copyCommonEffectFields(result, system);
      break;
    case "modifier":
      copyCommonEffectFields(result, system);
      result.expressions = asArray(system.expressions).map((entry) => duplicateData(entry));
      break;
    case "effect":
      copyCommonEffectFields(result, system);
      result.modifiers = [];
      break;
    case "power":
      copyDescription(result, system);
      if (typeof system.descriptor === "string") result.descriptor = system.descriptor;
      result.effects = [];
      result.powerArray = [];
      break;
    case "equipment":
      copyDescription(result, system);
      if (typeof system.descriptor === "string") result.descriptor = system.descriptor;
      result.effects = [];
      break;
    case "vehicle":
      copyCommonEffectFields(result, system);
      if (typeof system.descriptor === "string") result.descriptor = system.descriptor;
      result.effects = [];
      result.info = filterKeySet(system.info, INFO_KEYS.vehicle);
      break;
    case "base":
      copyDescription(result, system);
      if (typeof system.descriptor === "string") result.descriptor = system.descriptor;
      result.effects = [];
      result.info = filterKeySet(system.info, INFO_KEYS.base);
      break;
    default:
      break;
  }
  return result;
}

function copyCommonEffectFields(target, system) {
  copyDescription(target, system);
  if (isPlainObject(system.summary)) target.summary = filterKeySet(system.summary, SUMMARY_KEYS);
  if (typeof system.rank === "number") target.rank = system.rank;
  if (isPlainObject(system.cost)) target.cost = filterKeySet(system.cost, COST_KEYS);
  if (isPlainObject(system.activation)) target.activation = filterActivation(system.activation);
  if (isPlainObject(system.action)) target.action = filterAction(system.action);
}

function copyDescription(target, system) {
  if (isPlainObject(system.description)) {
    target.description = filterKeySet(system.description, DESCRIPTION_KEYS);
  }
}

function filterActivation(activation) {
  return {
    check: filterRollDetail(activation.check),
    consume: {
      type: filterValueObject(activation.consume?.type),
      target: filterValueObject(activation.consume?.target),
      amount: filterValueObject(activation.consume?.amount)
    },
    duration: {
      type: filterValueObject(activation.duration?.type)
    },
    range: {
      area: filterValueObject(activation.range?.area),
      type: filterValueObject(activation.range?.type),
      multiplier: filterValueObject(activation.range?.multiplier)
    },
    uses: {
      amount: filterValueObject(activation.uses?.amount),
      max: filterValueObject(activation.uses?.max),
      per: filterValueObject(activation.uses?.per),
      ...(typeof activation.uses?.remaining === "number" ? { remaining: activation.uses.remaining } : {})
    },
    type: filterValueObject(activation.type)
  };
}

function filterAction(action) {
  return {
    roll: {
      attack: filterRollDetail(action.roll?.attack),
      resist: filterRollDetail(action.roll?.resist)
    },
    type: filterValueObject(action.type)
  };
}

function filterRollDetail(detail) {
  return {
    formula: {
      value: asArray(detail?.formula?.value).map((entry) => filterKeySet(entry, FORMULA_ENTRY_KEYS))
    },
    targetScore: {
      type: filterValueObject(detail?.targetScore?.type),
      custom: filterValueObject(detail?.targetScore?.custom)
    },
    rollType: filterValueObject(detail?.rollType)
  };
}

function filterValueObject(value) {
  if (!isPlainObject(value)) return { value: "" };
  return filterKeySet(value, VALUE_OBJECT_KEYS);
}

function filterKeySet(source, keys) {
  const result = {};
  if (!isPlainObject(source)) return result;
  for (const [key, value] of Object.entries(source)) {
    if (keys.has(key)) result[key] = duplicateData(value);
  }
  return result;
}

function copyKnown(target, source, keys) {
  if (!isPlainObject(source)) return;
  keys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      target[key] = duplicateData(source[key]);
    }
  });
}
