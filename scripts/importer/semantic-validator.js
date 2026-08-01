import {
  ABILITY_IDS,
  ACTOR_TYPES,
  COST_TYPES,
  DEFAULT_MAX_DEPTH,
  DEFENSE_IDS,
  DERIVED_FIELD_NAMES,
  DERIVED_POINTER_SUFFIXES,
  DYNAMIC_SKILL_IDS,
  FORMULA_DETAIL_PATHS,
  ITEM_TYPES,
  MOVEMENT_IDS,
  ROLL_DETAIL_TARGET_PATHS,
  SKILL_IDS,
  STATIC_SKILL_IDS,
  TOP_LEVEL_ITEM_TYPES
} from "./constants.js";
import { calculatePowerCost, systemData, validScorePaths } from "./cost-calculator.js";
import {
  asArray,
  getPropertySafe,
  isFiniteNumber,
  isPlainObject,
  joinPointer,
  titleForObject
} from "./foundry-utils.js";

const ACTOR_KEYS = new Set(["externalId", "name", "type", "img", "system", "activeEffects", "items", "flags"]);
const ROOT_KEYS = new Set(["$schema", "schemaVersion", "actor", "expected"]);
const ITEM_KEYS = new Set(["externalId", "name", "type", "img", "system", "activeEffects", "flags"]);
const EXPECTED_KEYS = new Set(["points", "items"]);
const ACTOR_SYSTEM_KEYS = new Set([
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
const ATTRIBUTE_KEYS = new Set(["powerLevel", "equipmentPoints", "initiative", "penaltyPoints", "movement"]);
const SKILL_KEYS = new Set(["type", "ability", "trainedOnly", "actions", "base", "data"]);
const STATIC_SKILL_DATA_KEYS = new Set(["rank"]);
const DYNAMIC_SKILL_DATA_KEYS = new Set(["rank", "displayName"]);
const DESCRIPTION_KEYS = new Set(["value", "chat"]);
const SUMMARY_KEYS = new Set(["format", "position"]);
const COST_KEYS = new Set(["value", "type", "discountPer"]);
const COMMON_EFFECT_KEYS = new Set(["description", "summary", "activation", "action", "rank", "cost"]);
const VALUE_OBJECT_KEYS = new Set(["value"]);
const FORMULA_KEYS = new Set(["value"]);
const FORMULA_ENTRY_KEYS = new Set(["op", "dataPath", "value"]);
const TARGET_SCORE_KEYS = new Set(["type", "custom"]);
const ROLL_DETAIL_KEYS = new Set(["formula", "targetScore", "rollType"]);
const ACTION_KEYS = new Set(["roll", "type"]);
const ACTION_ROLL_KEYS = new Set(["attack", "resist"]);
const ACTIVATION_KEYS = new Set(["check", "consume", "duration", "range", "uses", "type"]);
const CONSUME_KEYS = new Set(["type", "target", "amount"]);
const DURATION_KEYS = new Set(["type"]);
const RANGE_KEYS = new Set(["area", "type", "multiplier"]);
const USES_KEYS = new Set(["amount", "max", "per", "remaining"]);
const POWER_KEYS = new Set(["description", "effects", "powerArray", "descriptor"]);
const EQUIPMENT_KEYS = new Set(["description", "effects", "descriptor"]);
const VEHICLE_KEYS = new Set([...COMMON_EFFECT_KEYS, "effects", "descriptor", "info"]);
const BASE_KEYS = new Set(["description", "effects", "descriptor", "info"]);
const VEHICLE_INFO_KEYS = new Set(["size", "strength", "speed", "defense", "toughness", "powers", "features"]);
const BASE_INFO_KEYS = new Set(["size", "toughness", "features"]);

const DYNAMIC_SKILL_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

export function semanticValidate(document, options = {}) {
  const maxDepth = Number.isFinite(options.maxDepth) ? options.maxDepth : DEFAULT_MAX_DEPTH;
  const issues = [];
  const actor = document.actor || {};
  const scorePaths = validScorePaths(actor.system || {});

  function issue(pointer, code, message, severity = "error", object = undefined) {
    issues.push({
      pointer,
      code,
      message,
      severity,
      name: titleForObject(object)
    });
  }

  validateUnknownKeys(document, ROOT_KEYS, "", document, issue);
  if (isPlainObject(document.expected)) {
    validateUnknownKeys(document.expected, EXPECTED_KEYS, "/expected", document, issue, true);
  }

  validateActor(actor, issue);
  validateFiniteNumbers(document, "", issue);
  validateDerivedFields(document, "", issue);
  validateExternalIds(document, issue);
  validateDynamicSkills(actor, issue);

  asArray(actor.items).forEach((item, index) => {
    validateItemTree(item, `/actor/items/${index}`, TOP_LEVEL_ITEM_TYPES, 0, maxDepth, scorePaths, issue);
  });

  return issues;
}

function validateActor(actor, issue) {
  validateUnknownKeys(actor, ACTOR_KEYS, "/actor", actor, issue);
  if (!ACTOR_TYPES.includes(actor.type)) {
    issue("/actor/type", "actor.invalid-type", "Actor type must be character or npc.", "error", actor);
  }
  validateActorSystem(actor.system || {}, "/actor/system", actor, issue);
}

function validateActorSystem(system, pointer, actor, issue) {
  validateUnknownKeys(system, ACTOR_SYSTEM_KEYS, pointer, actor, issue);
  validateExactNestedKeys(system.abilities, ABILITY_IDS, `${pointer}/abilities`, actor, issue, new Set(["rank"]));
  validateExactNestedKeys(system.defenses, DEFENSE_IDS, `${pointer}/defenses`, actor, issue, new Set(["rank", "ability"]));
  validateUnknownKeys(system.attributes || {}, ATTRIBUTE_KEYS, `${pointer}/attributes`, actor, issue);
  validateExactValueKeys(system.attributes?.movement, MOVEMENT_IDS, `${pointer}/attributes/movement`, actor, issue);
  validateUnknownKeys(system.skills || {}, new Set(SKILL_IDS), `${pointer}/skills`, actor, issue);

  Object.entries(system.skills || {}).forEach(([skillId, skill]) => {
    const skillPointer = `${pointer}/skills/${skillId}`;
    validateUnknownKeys(skill, SKILL_KEYS, skillPointer, actor, issue);
    if (DYNAMIC_SKILL_IDS.includes(skillId)) {
      Object.entries(skill.data || {}).forEach(([subSkillId, subSkill]) => {
        validateUnknownKeys(subSkill, DYNAMIC_SKILL_DATA_KEYS, `${skillPointer}/data/${subSkillId}`, actor, issue);
      });
    } else if (STATIC_SKILL_IDS.includes(skillId)) {
      validateUnknownKeys(skill.data || {}, STATIC_SKILL_DATA_KEYS, `${skillPointer}/data`, actor, issue);
    }
  });
}

function validateItemTree(item, pointer, expectedTypes, depth, maxDepth, scorePaths, issue) {
  validateUnknownKeys(item, ITEM_KEYS, pointer, item, issue);

  if (!ITEM_TYPES.includes(item.type)) {
    issue(`${pointer}/type`, "item.unknown-type", `Unknown item type '${item.type}'.`, "error", item);
  } else if (!expectedTypes.includes(item.type)) {
    issue(
      `${pointer}/type`,
      "item.invalid-nested-type",
      `Item type '${item.type}' is not valid here; expected ${expectedTypes.join(", ")}.`,
      "error",
      item
    );
  }

  if (depth > maxDepth) {
    issue(pointer, "recursion.max-depth", `Maximum recursion depth ${maxDepth} exceeded.`, "error", item);
    return;
  }

  validateItemSystem(item, pointer, issue);
  validateItemBehavior(item, pointer, scorePaths, issue);

  const data = systemData(item);
  if (["power", "equipment", "vehicle", "base"].includes(item.type)) {
    asArray(data.effects).forEach((effect, index) => {
      validateItemTree(effect, `${pointer}/system/effects/${index}`, ["effect"], depth + 1, maxDepth, scorePaths, issue);
    });
  }
  if (item.type === "effect") {
    asArray(data.modifiers).forEach((modifier, index) => {
      validateItemTree(modifier, `${pointer}/system/modifiers/${index}`, ["modifier"], depth + 1, maxDepth, scorePaths, issue);
    });
  }
  if (item.type === "power") {
    const parentCost = calculatePowerCost(item);
    asArray(data.powerArray).forEach((power, index) => {
      const alternativeCost = calculatePowerCost(power);
      const altPointer = `${pointer}/system/powerArray/${index}`;
      if (alternativeCost > parentCost) {
        issue(
          altPointer,
          "power-array.too-expensive",
          `Power array alternative costs ${alternativeCost}, more than parent power cost ${parentCost}.`,
          "error",
          power
        );
      }
      validateItemTree(power, altPointer, ["power"], depth + 1, maxDepth, scorePaths, issue);
    });
  }
}

function validateItemSystem(item, pointer, issue) {
  const data = item.system || {};
  switch (item.type) {
    case "advantage":
    case "modifier":
    case "effect":
      validateUnknownKeys(data, new Set([...COMMON_EFFECT_KEYS, ...(item.type === "effect" ? ["modifiers"] : []), ...(item.type === "modifier" ? ["expressions"] : [])]), `${pointer}/system`, item, issue);
      validateCommonEffectSystem(data, `${pointer}/system`, item, issue);
      break;
    case "power":
      validateUnknownKeys(data, POWER_KEYS, `${pointer}/system`, item, issue);
      validateDescription(data.description, `${pointer}/system/description`, item, issue);
      break;
    case "equipment":
      validateUnknownKeys(data, EQUIPMENT_KEYS, `${pointer}/system`, item, issue);
      validateDescription(data.description, `${pointer}/system/description`, item, issue);
      break;
    case "vehicle":
      validateUnknownKeys(data, VEHICLE_KEYS, `${pointer}/system`, item, issue);
      validateCommonEffectSystem(data, `${pointer}/system`, item, issue);
      validateUnknownKeys(data.info || {}, VEHICLE_INFO_KEYS, `${pointer}/system/info`, item, issue);
      break;
    case "base":
      validateUnknownKeys(data, BASE_KEYS, `${pointer}/system`, item, issue);
      validateDescription(data.description, `${pointer}/system/description`, item, issue);
      validateUnknownKeys(data.info || {}, BASE_INFO_KEYS, `${pointer}/system/info`, item, issue);
      break;
    default:
      break;
  }
}

function validateCommonEffectSystem(data, pointer, item, issue) {
  validateDescription(data.description, `${pointer}/description`, item, issue);
  validateUnknownKeys(data.summary || {}, SUMMARY_KEYS, `${pointer}/summary`, item, issue);
  validateUnknownKeys(data.cost || {}, COST_KEYS, `${pointer}/cost`, item, issue);
  if (data.cost?.type && !COST_TYPES.includes(data.cost.type)) {
    issue(`${pointer}/cost/type`, "cost.invalid-type", `Invalid cost type '${data.cost.type}'.`, "error", item);
  }
  if (data.cost?.type === "discount" && Object.prototype.hasOwnProperty.call(data.cost, "discountPer")) {
    if (!isFiniteNumber(data.cost.discountPer) || data.cost.discountPer < 1) {
      issue(`${pointer}/cost/discountPer`, "cost.invalid-discount-divisor", "Discount divisor must be a finite number greater than or equal to 1.", "error", item);
    }
  }
  validateActivation(data.activation || {}, `${pointer}/activation`, item, issue);
  validateAction(data.action || {}, `${pointer}/action`, item, issue);
}

function validateItemBehavior(item, pointer, scorePaths, issue) {
  const data = item.system || {};
  FORMULA_DETAIL_PATHS.forEach((detailPath) => {
    const detail = getPropertySafe(data, detailPath);
    asArray(detail?.formula?.value).forEach((formulaPart, index) => {
      const formulaPointer = `${pointer}/system/${detailPath.replace(/\./g, "/")}/formula/value/${index}`;
      if (formulaPart?.dataPath === "formula") {
        if (String(formulaPart.value || "").trim() === "") {
          issue(`${formulaPointer}/value`, "formula.empty", "Formula entries using dataPath 'formula' must contain a value.", "error", item);
        }
      } else if (formulaPart?.dataPath && !scorePaths.has(formulaPart.dataPath)) {
        issue(`${formulaPointer}/dataPath`, "formula.unknown-score-path", `Formula path '${formulaPart.dataPath}' does not exist on this actor.`, "error", item);
      }
    });
  });

  ROLL_DETAIL_TARGET_PATHS.forEach((targetPath) => {
    const targetScore = getPropertySafe(data, targetPath);
    if (targetScore?.type?.value === "custom" && String(targetScore?.custom?.value || "").trim() === "") {
      issue(
        `${pointer}/system/${targetPath.replace(/\./g, "/")}/custom/value`,
        "target-score.empty-custom-label",
        "Custom target scores need a non-empty custom label.",
        "error",
        item
      );
    }
  });

  const remaining = data.activation?.uses?.remaining;
  const max = data.activation?.uses?.max?.value;
  if (isFiniteNumber(remaining) && isFiniteNumber(max) && remaining > max) {
    issue(`${pointer}/system/activation/uses/remaining`, "uses.remaining-exceeds-max", "Remaining uses cannot be greater than maximum uses.", "error", item);
  }
}

function validateDynamicSkills(actor, issue) {
  const skills = actor.system?.skills || {};
  DYNAMIC_SKILL_IDS.forEach((skillId) => {
    Object.keys(skills[skillId]?.data || {}).forEach((subSkillId) => {
      if (!DYNAMIC_SKILL_ID_PATTERN.test(subSkillId)) {
        issue(
          `/actor/system/skills/${skillId}/data/${subSkillId}`,
          "skill.invalid-dynamic-id",
          "Dynamic skill IDs must start with a letter and contain only letters, digits, underscores or hyphens.",
          "error",
          actor
        );
      }
    });
  });
}

function validateExternalIds(document, issue) {
  const seen = new Map();
  const collect = (value, pointer) => {
    if (value?.externalId) {
      const list = seen.get(value.externalId) || [];
      list.push({ pointer: `${pointer}/externalId`, object: value });
      seen.set(value.externalId, list);
    }
  };
  const walkItem = (item, pointer) => {
    collect(item, pointer);
    const data = item.system || {};
    asArray(data.effects).forEach((effect, index) => walkItem(effect, `${pointer}/system/effects/${index}`));
    asArray(data.modifiers).forEach((modifier, index) => walkItem(modifier, `${pointer}/system/modifiers/${index}`));
    asArray(data.powerArray).forEach((power, index) => walkItem(power, `${pointer}/system/powerArray/${index}`));
  };

  collect(document.actor, "/actor");
  asArray(document.actor?.items).forEach((item, index) => walkItem(item, `/actor/items/${index}`));
  seen.forEach((entries, externalId) => {
    if (entries.length <= 1) return;
    entries.forEach((entry) => {
      issue(entry.pointer, "external-id.duplicate", `External ID '${externalId}' is used more than once.`, "error", entry.object);
    });
  });
}

function validateFiniteNumbers(value, pointer, issue, parent = undefined) {
  if (typeof value === "number" && !Number.isFinite(value)) {
    issue(pointer, "number.non-finite", "Only finite numbers are allowed.", "error", parent);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validateFiniteNumbers(entry, joinPointer(pointer, index), issue, parent));
    return;
  }
  if (isPlainObject(value)) {
    const object = value.name || value.externalId ? value : parent;
    Object.entries(value).forEach(([key, entry]) => validateFiniteNumbers(entry, joinPointer(pointer, key), issue, object));
  }
}

function validateDerivedFields(value, pointer, issue, parent = undefined) {
  if (pointer === "/expected" || pointer.startsWith("/expected/")) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validateDerivedFields(entry, joinPointer(pointer, index), issue, parent));
    return;
  }
  if (!isPlainObject(value)) return;

  const object = value.name || value.externalId ? value : parent;
  Object.entries(value).forEach(([key, entry]) => {
    const childPointer = joinPointer(pointer, key);
    if (DERIVED_FIELD_NAMES.has(key) || DERIVED_POINTER_SUFFIXES.some((suffix) => childPointer.endsWith(suffix))) {
      issue(childPointer, "field.derived", `Derived field '${key}' must not be imported.`, "error", object);
    }
    validateDerivedFields(entry, childPointer, issue, object);
  });
}

function validateActivation(value, pointer, item, issue) {
  validateUnknownKeys(value, ACTIVATION_KEYS, pointer, item, issue);
  validateRollDetail(value.check || {}, `${pointer}/check`, item, issue);
  validateUnknownKeys(value.consume || {}, CONSUME_KEYS, `${pointer}/consume`, item, issue);
  ["type", "target", "amount"].forEach((key) => validateValueObject(value.consume?.[key], `${pointer}/consume/${key}`, item, issue));
  validateUnknownKeys(value.duration || {}, DURATION_KEYS, `${pointer}/duration`, item, issue);
  validateValueObject(value.duration?.type, `${pointer}/duration/type`, item, issue);
  validateUnknownKeys(value.range || {}, RANGE_KEYS, `${pointer}/range`, item, issue);
  ["area", "type", "multiplier"].forEach((key) => validateValueObject(value.range?.[key], `${pointer}/range/${key}`, item, issue));
  validateUnknownKeys(value.uses || {}, USES_KEYS, `${pointer}/uses`, item, issue);
  ["amount", "max", "per"].forEach((key) => validateValueObject(value.uses?.[key], `${pointer}/uses/${key}`, item, issue));
  validateValueObject(value.type, `${pointer}/type`, item, issue);
}

function validateAction(value, pointer, item, issue) {
  validateUnknownKeys(value, ACTION_KEYS, pointer, item, issue);
  validateUnknownKeys(value.roll || {}, ACTION_ROLL_KEYS, `${pointer}/roll`, item, issue);
  validateRollDetail(value.roll?.attack || {}, `${pointer}/roll/attack`, item, issue);
  validateRollDetail(value.roll?.resist || {}, `${pointer}/roll/resist`, item, issue);
  validateValueObject(value.type, `${pointer}/type`, item, issue);
}

function validateRollDetail(value, pointer, item, issue) {
  validateUnknownKeys(value, ROLL_DETAIL_KEYS, pointer, item, issue);
  validateUnknownKeys(value.formula || {}, FORMULA_KEYS, `${pointer}/formula`, item, issue);
  asArray(value.formula?.value).forEach((entry, index) => {
    validateUnknownKeys(entry || {}, FORMULA_ENTRY_KEYS, `${pointer}/formula/value/${index}`, item, issue);
  });
  validateUnknownKeys(value.targetScore || {}, TARGET_SCORE_KEYS, `${pointer}/targetScore`, item, issue);
  validateValueObject(value.targetScore?.type, `${pointer}/targetScore/type`, item, issue);
  validateValueObject(value.targetScore?.custom, `${pointer}/targetScore/custom`, item, issue);
  validateValueObject(value.rollType, `${pointer}/rollType`, item, issue);
}

function validateDescription(value, pointer, item, issue) {
  validateUnknownKeys(value || {}, DESCRIPTION_KEYS, pointer, item, issue);
}

function validateValueObject(value, pointer, item, issue) {
  if (value === undefined) return;
  validateUnknownKeys(value || {}, VALUE_OBJECT_KEYS, pointer, item, issue);
}

function validateUnknownKeys(value, allowedKeys, pointer, object, issue, allowExtra = false) {
  if (!isPlainObject(value)) return;
  if (allowExtra) return;
  Object.keys(value).forEach((key) => {
    if (!allowedKeys.has(key)) {
      issue(joinPointer(pointer, key), "field.unknown", `Unknown field '${key}'.`, "error", object);
    }
  });
}

function validateExactNestedKeys(value, knownKeys, pointer, object, issue, childAllowedKeys) {
  validateUnknownKeys(value || {}, new Set(knownKeys), pointer, object, issue);
  Object.entries(value || {}).forEach(([key, entry]) => {
    validateUnknownKeys(entry || {}, childAllowedKeys, `${pointer}/${key}`, object, issue);
  });
}

function validateExactValueKeys(value, knownKeys, pointer, object, issue) {
  validateUnknownKeys(value || {}, new Set(knownKeys), pointer, object, issue);
}
