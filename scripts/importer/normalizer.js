import {
  DEFAULT_MAX_DEPTH,
  FLAG_EXTERNAL_ID,
  FLAG_SCOPE,
  FLAG_SOURCE_ITEM_EXTERNAL_ID,
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
  const actorEffects = normalizeActiveEffects(actor.activeEffects);
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
    actorEffects: mergeActorActiveEffects(actorEffects, collectActorActiveEffects(itemDataArray)),
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
  if (type === "effect") {
    completePowerEffectDetails(source.data, source.name);
  }
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
    if (!copy.label && typeof copy.name === "string") copy.label = copy.name;
    if (!copy.label) copy.label = "Active Effect";
    if (!copy.icon) copy.icon = copy.img || "icons/svg/aura.svg";
    if (!Array.isArray(copy.changes)) copy.changes = [];
    if (typeof copy.disabled !== "boolean") copy.disabled = false;
    return copy;
  });
}

function collectActorActiveEffects(items) {
  const effects = [];
  asArray(items).forEach((item) => {
    const externalId = itemExternalId(item);
    asArray(item.effects).forEach((effect) => {
      if (!hasActiveEffectChanges(effect)) return;
      const actorEffect = duplicateData(effect);
      markActiveEffectSourceItem(actorEffect, externalId, item.name);
      effects.push(actorEffect);
    });
  });
  return normalizeActiveEffects(effects);
}

function mergeActorActiveEffects(actorEffects, itemEffects) {
  const merged = [];
  const sourceSignatures = new Set();
  const fallbackSignatures = new Set();

  const remember = (effect) => {
    merged.push(effect);
    sourceSignatures.add(activeEffectSignature(effect, true));
    fallbackSignatures.add(activeEffectSignature(effect, false));
  };

  actorEffects.forEach((effect) => remember(effect));
  itemEffects.forEach((effect) => {
    if (sourceSignatures.has(activeEffectSignature(effect, true))) return;
    if (fallbackSignatures.has(activeEffectSignature(effect, false))) return;
    remember(effect);
  });
  return merged;
}

function markActiveEffectSourceItem(effect, externalId, itemName) {
  if (!externalId) return;
  effect.flags = effect.flags || {};
  effect.flags[FLAG_SCOPE] = effect.flags[FLAG_SCOPE] || {};
  effect.flags[FLAG_SCOPE][FLAG_SOURCE_ITEM_EXTERNAL_ID] = externalId;
  if (itemName && !effect.flags[FLAG_SCOPE].sourceItemName) {
    effect.flags[FLAG_SCOPE].sourceItemName = itemName;
  }
}

function activeEffectSignature(effect, includeSource) {
  const label = String(effect?.label || "").trim();
  const source = includeSource ? activeEffectSourceItemExternalId(effect) : "";
  const changes = asArray(effect?.changes)
    .map((change) => ({
      key: change?.key || "",
      mode: change?.mode ?? "",
      value: change?.value ?? "",
      priority: change?.priority ?? ""
    }))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return JSON.stringify({ label, source, changes });
}

function activeEffectSourceItemExternalId(effect) {
  const flagged = effect?.flags?.[FLAG_SCOPE]?.[FLAG_SOURCE_ITEM_EXTERNAL_ID];
  if (flagged) return String(flagged);
  return itemIdFromOrigin(effect?.origin);
}

function itemIdFromOrigin(origin) {
  const text = String(origin || "");
  const match = text.match(/(?:OwnedItem|Item)\.([^.]*)$/);
  return match ? match[1] : "";
}

function itemExternalId(item) {
  return item?.flags?.[FLAG_SCOPE]?.[FLAG_EXTERNAL_ID] || item?._id || "";
}

function hasActiveEffectChanges(effect) {
  return asArray(effect?.changes).some((change) => String(change?.key || "").trim());
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

export function completePowerEffectDetails(data, effectName = "") {
  ensureEffectDetailShape(data);
  const actionType = wrappedValue(data.action.type);
  if (!actionType) {
    data.action.type.value = "general";
  }
  const effectiveActionType = wrappedValue(data.action.type);

  if (!wrappedValue(data.activation.type)) {
    data.activation.type.value = defaultActivationType(effectiveActionType);
  }
  if (!wrappedValue(data.activation.duration.type)) {
    data.activation.duration.type.value = defaultDurationType(effectiveActionType);
  }
  if (!wrappedValue(data.activation.range.type)) {
    data.activation.range.type.value = defaultRangeType(effectiveActionType);
  }
  if (!data.activation.range.area.value) {
    data.activation.range.area.value = null;
  }
  if (!data.activation.range.multiplier.value) {
    data.activation.range.multiplier.value = null;
  }
  if (typeof data.activation.uses.amount.value !== "number") {
    data.activation.uses.amount.value = 0;
  }
  if (data.activation.uses.max.value === undefined || data.activation.uses.max.value === "") {
    data.activation.uses.max.value = null;
  }
  if (data.activation.uses.per.value === undefined || data.activation.uses.per.value === "") {
    data.activation.uses.per.value = null;
  }

  completeRollDetail(data.activation.check, {
    defaultRollType: "none",
    defaultTargetType: "custom",
    defaultCustomLabel: "DC",
    defaultFormula: "@rank"
  });

  completeRollDetail(data.action.roll.attack, {
    defaultRollType: effectiveActionType === "attack" ? "required" : "none",
    defaultTargetType: "defenses.dge.total",
    defaultCustomLabel: "Dodge",
    defaultFormula: "@rank"
  });

  const resistanceLabel = inferResistanceLabel(data.action.roll.resist, effectName);
  completeRollDetail(data.action.roll.resist, {
    defaultRollType: "none",
    defaultTargetType: "custom",
    defaultCustomLabel: resistanceLabel,
    defaultFormula: `${inferResistanceDcBase(resistanceLabel, effectName)} + @rank`
  });
}

function ensureEffectDetailShape(data) {
  data.activation = data.activation || {};
  data.activation.type = ensureValueObject(data.activation.type, "");
  data.activation.check = ensureRollDetail(data.activation.check);
  data.activation.consume = data.activation.consume || {};
  data.activation.consume.type = ensureValueObject(data.activation.consume.type, "");
  data.activation.consume.target = ensureValueObject(data.activation.consume.target, null);
  data.activation.consume.amount = ensureValueObject(data.activation.consume.amount, null);
  data.activation.duration = data.activation.duration || {};
  data.activation.duration.type = ensureValueObject(data.activation.duration.type, "");
  data.activation.range = data.activation.range || {};
  data.activation.range.area = ensureValueObject(data.activation.range.area, null);
  data.activation.range.type = ensureValueObject(data.activation.range.type, "");
  data.activation.range.multiplier = ensureValueObject(data.activation.range.multiplier, null);
  data.activation.uses = data.activation.uses || {};
  data.activation.uses.amount = ensureValueObject(data.activation.uses.amount, 0);
  data.activation.uses.max = ensureValueObject(data.activation.uses.max, null);
  data.activation.uses.per = ensureValueObject(data.activation.uses.per, null);

  data.action = data.action || {};
  data.action.type = ensureValueObject(data.action.type, "");
  data.action.roll = data.action.roll || {};
  data.action.roll.attack = ensureRollDetail(data.action.roll.attack);
  data.action.roll.resist = ensureRollDetail(data.action.roll.resist);
}

function ensureRollDetail(detail) {
  const result = detail || {};
  result.formula = result.formula || {};
  result.formula.value = asArray(result.formula.value);
  result.targetScore = result.targetScore || {};
  result.targetScore.type = ensureValueObject(result.targetScore.type, "");
  result.targetScore.custom = ensureValueObject(result.targetScore.custom, "");
  result.rollType = ensureValueObject(result.rollType, "");
  return result;
}

function ensureValueObject(value, fallback) {
  if (!isPlainObject(value)) return { value: fallback };
  if (!Object.prototype.hasOwnProperty.call(value, "value")) value.value = fallback;
  return value;
}

function completeRollDetail(detail, defaults) {
  if (!wrappedValue(detail.rollType)) {
    detail.rollType.value = defaults.defaultRollType;
  }
  if (!wrappedValue(detail.targetScore.type)) {
    detail.targetScore.type.value = defaults.defaultTargetType;
  }
  if (wrappedValue(detail.targetScore.type) === "custom" && !wrappedValue(detail.targetScore.custom)) {
    detail.targetScore.custom.value = defaults.defaultCustomLabel;
  }
  if (wrappedValue(detail.rollType) === "required" && detail.formula.value.length === 0) {
    detail.formula.value.push({
      op: "+",
      dataPath: "formula",
      value: defaults.defaultFormula
    });
  }
}

function wrappedValue(wrapper) {
  const value = wrapper?.value;
  return value === undefined || value === null ? "" : String(value);
}

function defaultActivationType(actionType) {
  if (actionType === "movement") return "move";
  if (["defense", "sensory"].includes(actionType)) return "none";
  return "standard";
}

function defaultDurationType(actionType) {
  if (actionType === "defense") return "permanent";
  if (["movement", "sensory"].includes(actionType)) return "sustained";
  return "instant";
}

function defaultRangeType(actionType) {
  if (["attack", "control"].includes(actionType)) return "ranged";
  return "personal";
}

function inferResistanceLabel(detail, effectName) {
  const configured = wrappedValue(detail.targetScore?.custom);
  if (configured) return configured;
  const text = String(effectName || "").toLowerCase();
  if (text.includes("will") || text.includes("mind") || text.includes("mental")) return "Will";
  if (text.includes("fortitude") || text.includes("fort") || text.includes("poison")) return "Fortitude";
  if (text.includes("dodge") || text.includes("bind") || text.includes("area")) return "Dodge";
  return "Toughness";
}

function inferResistanceDcBase(label, effectName) {
  const text = `${label || ""} ${effectName || ""}`.toLowerCase();
  if (text.includes("toughness") || text.includes("zäh") || text.includes("zaeh") || text.includes("damage")) {
    return 15;
  }
  return 10;
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
