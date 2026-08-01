import { duplicateData, mergeData, toSourceObject } from "./foundry-utils.js";

const formulaDetail = () => ({
  formula: { value: [] },
  targetScore: {
    type: { value: "" },
    custom: { value: "" }
  },
  rollType: { value: "" }
});

const activationDefaults = () => ({
  check: formulaDetail(),
  consume: {
    type: { value: "" },
    target: { value: null },
    amount: { value: null }
  },
  duration: { type: { value: "" } },
  range: {
    area: { value: null },
    type: { value: "" },
    multiplier: { value: null }
  },
  uses: {
    amount: { value: 0 },
    max: { value: null },
    per: { value: null }
  },
  type: { value: "" }
});

const actionDefaults = () => ({
  roll: {
    attack: formulaDetail(),
    resist: formulaDetail()
  },
  type: { value: "" }
});

export const COMMON_ITEM_SYSTEM_DEFAULTS = {
  description: {
    value: "",
    chat: ""
  },
  summary: {
    format: "",
    position: ""
  },
  activation: activationDefaults(),
  action: actionDefaults(),
  rank: 1,
  cost: {
    value: 0,
    type: "",
    discountPer: 1
  }
};

function commonItemSystem() {
  return duplicateData(COMMON_ITEM_SYSTEM_DEFAULTS);
}

function itemSource(name, type, data, img = "icons/svg/item-bag.svg") {
  return {
    name,
    type,
    img,
    data,
    effects: [],
    flags: {}
  };
}

export function fallbackItemSource({ name = "New Item", type, img = "icons/svg/item-bag.svg" }) {
  switch (type) {
    case "advantage":
      return itemSource(name, type, commonItemSystem(), img);
    case "effect":
      return itemSource(name, type, mergeData(commonItemSystem(), { modifiers: [] }), img);
    case "modifier":
      return itemSource(name, type, mergeData(commonItemSystem(), { expressions: [] }), img);
    case "power":
      return itemSource(name, type, {
        description: { value: "", chat: "" },
        effects: [],
        powerArray: [],
        descriptor: ""
      }, img);
    case "equipment":
      return itemSource(name, type, {
        description: { value: "", chat: "" },
        effects: [],
        descriptor: ""
      }, img);
    case "vehicle":
      return itemSource(name, type, mergeData(commonItemSystem(), {
        effects: [],
        descriptor: "",
        info: {
          size: "",
          strength: "",
          speed: "",
          defense: "",
          toughness: "",
          powers: "",
          features: ""
        }
      }), img);
    case "base":
      return itemSource(name, type, {
        description: { value: "", chat: "" },
        effects: [],
        descriptor: "",
        info: {
          size: "",
          toughness: "",
          features: ""
        }
      }, img);
    default:
      return itemSource(name, type, {}, img);
  }
}

export async function createTemporaryItemSource({ name, type, img }, options = {}) {
  const canUseFoundry = options.useFoundry !== false && globalThis.Item && typeof globalThis.Item.create === "function";
  if (!canUseFoundry) return fallbackItemSource({ name, type, img });
  const item = await globalThis.Item.create({ name, type, img }, { temporary: true });
  const source = toSourceObject(item);
  source.name = name;
  source.type = type;
  source.img = img || source.img || "icons/svg/item-bag.svg";
  source.data = source.data || {};
  source.effects = Array.isArray(source.effects) ? source.effects : [];
  source.flags = source.flags || {};
  return source;
}

export const ACTOR_SYSTEM_DEFAULTS = {
  character: {
    abilities: {
      str: { rank: 0 },
      sta: { rank: 0 },
      agl: { rank: 0 },
      dex: { rank: 0 },
      fgt: { rank: 0 },
      int: { rank: 0 },
      awe: { rank: 0 },
      pre: { rank: 0 }
    },
    defenses: {
      dge: { rank: 0, ability: "agl" },
      pry: { rank: 0, ability: "fgt" },
      frt: { rank: 0, ability: "sta" },
      tgh: { rank: 0, ability: "sta" },
      wil: { rank: 0, ability: "awe" }
    },
    attributes: {
      powerLevel: 0,
      equipmentPoints: 0,
      initiative: 0,
      penaltyPoints: 0,
      movement: {
        burrowing: 0,
        flight: 0,
        leaping: 0,
        speed: 0,
        swim: 0,
        teleport: 0
      }
    },
    info: {
      groupAffiliation: "",
      identity: "",
      baseOfOperations: "",
      background: "",
      notes: "",
      complications: "",
      gender: "",
      age: "",
      eyes: "",
      height: "",
      weight: "",
      hair: "",
      origins: "",
      relationships: "",
      assets: ""
    },
    skills: {
      acr: { type: "static", ability: "agl", trainedOnly: true, actions: ["move", "free"], base: 0, data: { rank: 0 } },
      ath: { type: "static", ability: "str", trainedOnly: false, actions: ["move"], base: 0, data: { rank: 0 } },
      cco: { type: "dynamic", ability: "fgt", trainedOnly: false, actions: ["standard"], base: 0, data: {} },
      dec: { type: "static", ability: "pre", trainedOnly: false, actions: ["standard"], base: 0, data: { rank: 0 } },
      exp: { type: "dynamic", ability: "int", trainedOnly: true, actions: [], base: 0, data: {} },
      ins: { type: "static", ability: "awe", trainedOnly: false, actions: ["free"], base: 0, data: { rank: 0 } },
      itm: { type: "static", ability: "pre", trainedOnly: false, actions: ["standard"], base: 0, data: { rank: 0 } },
      inv: { type: "static", ability: "int", trainedOnly: true, actions: [], base: 0, data: { rank: 0 } },
      prc: { type: "static", ability: "awe", trainedOnly: false, actions: ["free"], base: 0, data: { rank: 0 } },
      per: { type: "static", ability: "pre", trainedOnly: false, actions: [], base: 0, data: { rank: 0 } },
      rco: { type: "dynamic", ability: "dex", trainedOnly: false, actions: ["standard"], base: 0, data: {} },
      slt: { type: "static", ability: "dex", trainedOnly: true, actions: ["standard"], base: 0, data: { rank: 0 } },
      ste: { type: "static", ability: "agl", trainedOnly: false, actions: ["move"], base: 0, data: { rank: 0 } },
      tec: { type: "static", ability: "int", trainedOnly: true, actions: ["standard"], base: 0, data: { rank: 0 } },
      tre: { type: "static", ability: "int", trainedOnly: true, actions: ["standard"], base: 0, data: { rank: 0 } },
      vhc: { type: "static", ability: "dex", trainedOnly: true, actions: ["move"], base: 0, data: { rank: 0 } }
    },
    victoryPoints: 1,
    earnedCharacterPoints: 0
  },
  npc: {
    abilities: {},
    defenses: {},
    attributes: {},
    info: {},
    skills: {},
    isMinion: false
  }
};

ACTOR_SYSTEM_DEFAULTS.npc = mergeData(
  duplicateData(ACTOR_SYSTEM_DEFAULTS.character),
  { isMinion: false },
  { inplace: false }
);
delete ACTOR_SYSTEM_DEFAULTS.npc.victoryPoints;
delete ACTOR_SYSTEM_DEFAULTS.npc.earnedCharacterPoints;

export function actorSystemDefaults(type = "character") {
  return duplicateData(ACTOR_SYSTEM_DEFAULTS[type] || ACTOR_SYSTEM_DEFAULTS.character);
}

