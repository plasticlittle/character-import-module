import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateActorPointPreview,
  calculateEffectCost,
  calculateEquipmentCost,
  calculatePowerCost,
  collectItemCostPreview
} from "../scripts/importer/cost-calculator.js";
import { makeEffect, makeModifier, makePower } from "./helpers.js";

test("calculates per-rank costs", () => {
  assert.equal(calculateEffectCost(makePower([makeEffect({ rank: 5, type: "perRank", value: 2 })])), 10);
});

test("reproduces flat-cost behavior from Item3e", () => {
  assert.equal(calculateEffectCost(makePower([makeEffect({ rank: 3, type: "flat", value: 2 })])), 7.5);
});

test("combines extras and flaws as per-rank modifiers", () => {
  const modifiers = [
    makeModifier({ type: "perRank", value: 1 }),
    makeModifier({ type: "perRank", value: -2 })
  ];
  assert.equal(calculateEffectCost(makePower([makeEffect({ rank: 4, type: "perRank", value: 2, modifiers })])), 4);
});

test("applies discounts after all effects in original order", () => {
  const modifiers = [makeModifier({ type: "discount", value: -0.5, discountPer: 5 })];
  assert.equal(calculateEffectCost(makePower([makeEffect({ rank: 10, type: "perRank", value: 2, modifiers })])), 18);
});

test("calculates fractional costs when per-rank cost drops below one", () => {
  const total = calculateEffectCost(makePower([makeEffect({ rank: 4, type: "perRank", value: -1 })]));
  assert.equal(total, 4 / 3);
});

test("enforces equipment minimum cost", () => {
  assert.equal(calculateEquipmentCost({ type: "equipment", system: { effects: [] } }), 1);
});

test("sums multiple effects", () => {
  const power = makePower([
    makeEffect({ rank: 2, type: "perRank", value: 2 }),
    makeEffect({ rank: 3, type: "perRank", value: 1 })
  ]);
  assert.equal(calculateEffectCost(power), 7);
});

test("adds one point per power-array alternative", () => {
  const alt = makePower([makeEffect({ rank: 1, type: "perRank", value: 1 })]);
  const main = makePower([makeEffect({ rank: 3, type: "perRank", value: 2 })], [alt]);
  assert.equal(calculatePowerCost(main), 7);
});

test("collects recursive power-array preview rows", () => {
  const nested = makePower([makeEffect({ name: "Nested", rank: 1, type: "perRank", value: 1 })]);
  const alt = makePower([makeEffect({ name: "Alt", rank: 1, type: "perRank", value: 1 })], [nested]);
  const rows = collectItemCostPreview([makePower([makeEffect({ rank: 3, type: "perRank", value: 2 })], [alt])]);
  assert.equal(rows[0].children.some((entry) => entry.type === "power"), true);
  assert.equal(rows[0].children.find((entry) => entry.type === "power").children.some((entry) => entry.type === "power"), true);
});

test("calculates actor points like Actor3e", () => {
  const actorData = {
    data: {
      abilities: { str: { rank: 2 } },
      defenses: { dge: { rank: 3 } },
      skills: {
        acr: { type: "static", data: { rank: 2 } },
        exp: { type: "dynamic", data: { Science: { rank: 4 } } }
      },
      attributes: { powerLevel: 5 },
      earnedCharacterPoints: 2
    },
    flags: {}
  };
  const items = [
    {
      type: "advantage",
      data: { rank: 2, cost: { type: "perRank", value: 1 } }
    },
    makePower([makeEffect({ rank: 2, type: "perRank", value: 2 })])
  ];
  assert.deepEqual(calculateActorPointPreview(actorData, items), {
    abilities: 4,
    skills: 3,
    defenses: 3,
    advantages: 2,
    powers: 4,
    total: 16,
    equipment: 0,
    max: 77,
    overMax: false
  });
});

test("matches a temporary MNM3E item prepared with the reference formula", () => {
  const power = makePower([
    makeEffect({
      rank: 6,
      type: "perRank",
      value: 2,
      modifiers: [
        makeModifier({ type: "flat", value: 1, rank: 2 }),
        makeModifier({ type: "discount", value: -0.25, discountPer: 4 })
      ]
    })
  ], [makePower([makeEffect({ rank: 1, type: "perRank", value: 1 })])]);
  const foundryPowerSource = {
    name: "Power",
    type: "power",
    data: {
      effects: power.system.effects.map((effect) => ({
        ...effect,
        data: {
          ...effect.system,
          modifiers: effect.system.modifiers.map((modifier) => ({
            ...modifier,
            data: modifier.system
          }))
        }
      })),
      powerArray: power.system.powerArray.map((entry) => ({ ...entry, data: entry.system }))
    }
  };

  const temporaryItem = {
    data: JSON.parse(JSON.stringify(foundryPowerSource)),
    prepareMNM3EData() {
      this.data.data.totalCost = referenceCalculateEffectCost(this.data) + this.data.data.powerArray.length;
    }
  };
  temporaryItem.prepareMNM3EData();
  assert.equal(calculatePowerCost(power), temporaryItem.data.data.totalCost);
});

function referenceCalculateEffectCost(item) {
  let totalPowerCost = 0;
  const deferredCosts = [];
  item.data.effects.forEach((effect) => {
    let perRankCost = 0;
    let flatCost = 0;
    const evaluateCostType = (costType, rank, cost, discountPer) => {
      switch (costType) {
        case "flat":
          flatCost += cost * rank;
          break;
        case "perRank":
          perRankCost += cost;
          break;
        case "discount":
          deferredCosts.push({ modifier: cost, discountPer: !discountPer || discountPer < 1 ? 1 : discountPer });
          break;
        default:
          break;
      }
    };
    evaluateCostType(effect.data.cost.type, effect.data.rank, effect.data.cost.value, effect.data.cost.discountPer);
    effect.data.modifiers.forEach((modifier) => {
      evaluateCostType(modifier.data.cost.type, modifier.data.rank, modifier.data.cost.value, modifier.data.cost.discountPer);
    });
    if (perRankCost < 1) {
      perRankCost = 1 / (Math.abs(perRankCost) + 2);
    }
    let totalRankCost = perRankCost * effect.data.rank;
    if (totalRankCost + flatCost >= 1) {
      totalRankCost += flatCost;
    } else {
      totalRankCost = Math.min(totalRankCost, 1);
    }
    totalPowerCost += totalRankCost;
  });
  deferredCosts.forEach((dc) => {
    const quotient = totalPowerCost / dc.discountPer;
    totalPowerCost += quotient * dc.modifier;
  });
  return totalPowerCost;
}
