export const MODULE_ID = "1000_mnm3e-character-importer";
export const FLAG_SCOPE = "mnm3eCharacterImporter";
export const FLAG_EXTERNAL_ID = "externalId";
export const FLAG_SOURCE_ITEM_EXTERNAL_ID = "sourceItemExternalId";

export const ACTOR_TYPES = ["character", "npc"];
export const TOP_LEVEL_ITEM_TYPES = ["advantage", "power", "equipment", "vehicle", "base"];
export const ITEM_TYPES = [...TOP_LEVEL_ITEM_TYPES, "effect", "modifier"];

export const ABILITY_IDS = ["str", "sta", "agl", "dex", "fgt", "int", "awe", "pre"];
export const DEFENSE_IDS = ["dge", "pry", "frt", "tgh", "wil"];
export const MOVEMENT_IDS = ["burrowing", "flight", "leaping", "speed", "swim", "teleport"];
export const SKILL_IDS = [
  "acr",
  "ath",
  "cco",
  "dec",
  "exp",
  "ins",
  "itm",
  "inv",
  "prc",
  "per",
  "rco",
  "slt",
  "ste",
  "tec",
  "tre",
  "vhc"
];
export const DYNAMIC_SKILL_IDS = ["cco", "exp", "rco"];
export const STATIC_SKILL_IDS = SKILL_IDS.filter((id) => !DYNAMIC_SKILL_IDS.includes(id));

export const COST_TYPES = ["flat", "perRank", "discount"];

export const DERIVED_FIELD_NAMES = new Set([
  "total",
  "pointCosts",
  "equipmentCost",
  "totalCost",
  "isTrained",
  "override",
  "originalValue",
  "overrideRank",
  "numOverrides",
  "overrideRanks"
]);

export const DERIVED_POINTER_SUFFIXES = [
  "/summary/parsed",
  "/summary/data",
  "/targetScore/label"
];

export const DEFAULT_MAX_DEPTH = 20;

export const FORMULA_DETAIL_PATHS = [
  "activation.check",
  "action.roll.attack",
  "action.roll.resist"
];

export const ROLL_DETAIL_TARGET_PATHS = [
  "activation.check.targetScore",
  "action.roll.attack.targetScore",
  "action.roll.resist.targetScore"
];
