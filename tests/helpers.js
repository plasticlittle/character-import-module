import fs from "node:fs/promises";

export async function loadExample() {
  return JSON.parse(await fs.readFile(new URL("../examples/mnm3e-character.example.json", import.meta.url), "utf8"));
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function makeEffect({ name = "Effect", rank = 1, type = "perRank", value = 1, modifiers = [], discountPer = 1 } = {}) {
  return {
    name,
    type: "effect",
    system: {
      rank,
      cost: { type, value, discountPer },
      modifiers
    }
  };
}

export function makeModifier({ name = "Modifier", rank = 1, type = "perRank", value = 1, discountPer = 1 } = {}) {
  return {
    name,
    type: "modifier",
    system: {
      rank,
      cost: { type, value, discountPer }
    }
  };
}

export function makePower(effects = [], powerArray = []) {
  return {
    name: "Power",
    type: "power",
    system: {
      effects,
      powerArray
    }
  };
}

