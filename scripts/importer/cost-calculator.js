import {
  DYNAMIC_SKILL_IDS,
  FLAG_EXTERNAL_ID,
  FLAG_SCOPE,
  STATIC_SKILL_IDS
} from "./constants.js";
import { asArray, getPropertySafe, isPlainObject, numberOrZero } from "./foundry-utils.js";

export function systemData(source) {
  if (!source) return {};
  return source.system || source.data || source;
}

export function externalIdOf(source) {
  return source?.externalId || source?.flags?.[FLAG_SCOPE]?.[FLAG_EXTERNAL_ID] || "";
}

function costData(source) {
  return systemData(source).cost || {};
}

function rankOf(source) {
  return numberOrZero(systemData(source).rank);
}

export function calculateEffectCost(powerLike) {
  let totalPowerCost = 0;
  const deferredCosts = [];
  const powerSystem = systemData(powerLike);

  asArray(powerSystem.effects).forEach((effect) => {
    const effectSystem = systemData(effect);
    let perRankCost = 0;
    let flatCost = 0;
    const evaluateCostType = (costType, rank, cost, discountPer) => {
      switch (costType) {
        case "flat":
          flatCost += numberOrZero(cost) * numberOrZero(rank);
          break;
        case "perRank":
          perRankCost += numberOrZero(cost);
          break;
        case "discount":
          deferredCosts.push({
            modifier: numberOrZero(cost),
            discountPer: !discountPer || discountPer < 1 ? 1 : discountPer
          });
          break;
        default:
          break;
      }
    };

    evaluateCostType(
      effectSystem.cost?.type,
      effectSystem.rank,
      effectSystem.cost?.value,
      effectSystem.cost?.discountPer
    );
    asArray(effectSystem.modifiers).forEach((modifier) => {
      const modifierCost = costData(modifier);
      evaluateCostType(modifierCost.type, rankOf(modifier), modifierCost.value, modifierCost.discountPer);
    });

    if (perRankCost < 1) {
      perRankCost = 1 / (Math.abs(perRankCost) + 2);
    }

    let totalRankCost = perRankCost * numberOrZero(effectSystem.rank);
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

export function calculatePowerCost(power) {
  const data = systemData(power);
  return calculateEffectCost(power) + asArray(data.powerArray).length;
}

export function calculateEquipmentCost(equipment) {
  return Math.max(1, calculateEffectCost(equipment));
}

export function calculateItemCost(item) {
  const data = systemData(item);
  switch (item?.type) {
    case "power":
      return calculatePowerCost(item);
    case "equipment":
      return calculateEquipmentCost(item);
    case "advantage": {
      const value = numberOrZero(data.cost?.value);
      return data.cost?.type === "perRank" ? value * numberOrZero(data.rank) : value;
    }
    case "vehicle":
    case "base":
      return calculateEffectCost(item);
    default:
      return 0;
  }
}

export function collectItemCostPreview(items, parentPowerCost = null) {
  return asArray(items).map((item) => {
    const data = systemData(item);
    const totalCost = calculateItemCost(item);
    const entry = {
      name: item.name || "",
      type: item.type || "",
      externalId: externalIdOf(item),
      totalCost,
      effectCost: ["power", "equipment", "vehicle", "base"].includes(item.type) ? calculateEffectCost(item) : undefined,
      invalidAlternative: parentPowerCost !== null && item.type === "power" && totalCost > parentPowerCost,
      children: []
    };
    if (item.type === "power") {
      entry.children = [
        ...collectEffectCostPreview(data.effects),
        ...collectItemCostPreview(data.powerArray, totalCost)
      ];
    } else if (["equipment", "vehicle", "base"].includes(item.type)) {
      entry.children = collectEffectCostPreview(data.effects);
    }
    return entry;
  });
}

export function collectEffectCostPreview(effects) {
  return asArray(effects).map((effect) => {
    const data = systemData(effect);
    return {
      name: effect.name || "",
      type: effect.type || "",
      externalId: externalIdOf(effect),
      rank: numberOrZero(data.rank),
      costType: data.cost?.type || "",
      costValue: numberOrZero(data.cost?.value),
      activeEffects: asArray(effect.effects || effect.activeEffects).length,
      children: asArray(data.modifiers).map((modifier) => {
        const modifierData = systemData(modifier);
        return {
          name: modifier.name || "",
          type: modifier.type || "",
          externalId: externalIdOf(modifier),
          rank: numberOrZero(modifierData.rank),
          costType: modifierData.cost?.type || "",
          costValue: numberOrZero(modifierData.cost?.value),
          children: []
        };
      })
    };
  });
}

export function collectPowerArrayViolations(items, pointer = "/actor/items") {
  const violations = [];
  asArray(items).forEach((item, index) => {
    const itemPointer = `${pointer}/${index}`;
    if (item?.type !== "power") return;
    const itemCost = calculatePowerCost(item);
    asArray(systemData(item).powerArray).forEach((alternative, altIndex) => {
      if (alternative?.type !== "power") return;
      const alternativeCost = calculatePowerCost(alternative);
      if (alternativeCost > itemCost) {
        violations.push({
          pointer: `${itemPointer}/system/powerArray/${altIndex}`,
          item,
          alternative,
          itemCost,
          alternativeCost
        });
      }
      violations.push(...collectPowerArrayViolations([alternative], `${itemPointer}/system/powerArray`));
    });
  });
  return violations;
}

export function validScorePaths(actorSystem) {
  const paths = new Set();
  ["str", "sta", "agl", "dex", "fgt", "int", "awe", "pre"].forEach((id) => paths.add(`abilities.${id}.total`));
  ["dge", "pry", "frt", "tgh", "wil"].forEach((id) => paths.add(`defenses.${id}.total`));
  STATIC_SKILL_IDS.forEach((id) => paths.add(`skills.${id}.data.total`));
  DYNAMIC_SKILL_IDS.forEach((id) => {
    paths.add(`skills.${id}.base`);
    const skillData = getPropertySafe(actorSystem, `skills.${id}.data`);
    if (isPlainObject(skillData)) {
      Object.keys(skillData).forEach((subSkillId) => paths.add(`skills.${id}.data.${subSkillId}.total`));
    }
  });
  return paths;
}

export function calculateActorPointPreview(actorData, itemDataArray = []) {
  const actorSystem = systemData(actorData);
  const items = asArray(itemDataArray);
  const costs = {
    abilities: 0,
    skills: 0,
    defenses: 0,
    advantages: 0,
    powers: 0,
    total: 0,
    equipment: 0,
    max: 0,
    overMax: false
  };

  Object.values(actorSystem.abilities || {}).forEach((ability) => {
    costs.abilities += numberOrZero(ability.rank) * 2;
  });
  Object.values(actorSystem.defenses || {}).forEach((defense) => {
    costs.defenses += numberOrZero(defense.rank);
  });
  Object.values(actorSystem.skills || {}).forEach((skill) => {
    if (skill?.type === "dynamic") {
      Object.values(skill.data || {}).forEach((entry) => {
        costs.skills += numberOrZero(entry.rank) / 2;
      });
    } else {
      costs.skills += numberOrZero(skill?.data?.rank) / 2;
    }
  });
  items.forEach((item) => {
    const data = systemData(item);
    switch (item.type) {
      case "equipment":
        costs.equipment += calculateEquipmentCost(item);
        break;
      case "power":
        costs.powers += calculatePowerCost(item);
        break;
      case "advantage": {
        const advantageCost = numberOrZero(data.cost?.value);
        costs.advantages += data.cost?.type === "perRank"
          ? advantageCost * numberOrZero(data.rank)
          : advantageCost;
        break;
      }
      default:
        break;
    }
  });
  costs.total = costs.abilities + costs.skills + costs.defenses + costs.advantages + costs.powers;

  const overrideMax = Boolean(actorData?.flags?.mnm3e?.overrideMaxPoints);
  costs.max = overrideMax && Number.isFinite(actorSystem.maxPoints)
    ? actorSystem.maxPoints
    : 15 * numberOrZero(actorSystem.attributes?.powerLevel) + numberOrZero(actorSystem.earnedCharacterPoints);
  costs.overMax = costs.total > costs.max;
  return costs;
}

