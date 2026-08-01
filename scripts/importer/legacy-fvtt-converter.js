import { TOP_LEVEL_ITEM_TYPES } from "./constants.js";
import { duplicateData, isPlainObject } from "./foundry-utils.js";
import { stripDerivedFields } from "./normalizer.js";

export function isLegacyFoundryActorDocument(document) {
  return isPlainObject(document)
    && !document.actor
    && typeof document.name === "string"
    && ["character", "npc"].includes(document.type)
    && isPlainObject(document.data)
    && Array.isArray(document.items);
}

export function convertLegacyFoundryActor(document) {
  if (!isLegacyFoundryActorDocument(document)) return document;
  return {
    schemaVersion: "1.0.0",
    actor: {
      externalId: externalIdFor(document),
      name: document.name,
      type: document.type,
      img: document.img || "icons/svg/mystery-man.svg",
      flags: duplicateData(document.flags || {}),
      system: cleanSystemData(document.data || {}),
      activeEffects: cleanActiveEffects(document.effects || []),
      items: (document.items || [])
        .filter((item) => TOP_LEVEL_ITEM_TYPES.includes(item.type))
        .map((item) => convertLegacyItem(item))
    }
  };
}

function convertLegacyItem(item) {
  const system = cleanSystemData(item.system || item.data || {});
  const converted = {
    externalId: externalIdFor(item),
    name: item.name || item.type || "Item",
    type: item.type,
    img: item.img || "icons/svg/item-bag.svg",
    flags: duplicateData(item.flags || {}),
    activeEffects: cleanActiveEffects(item.effects || []),
    system
  };

  if (Array.isArray(system.effects)) {
    converted.system.effects = system.effects
      .filter((entry) => entry?.type === "effect")
      .map((entry) => convertLegacyItem(entry));
  }
  if (Array.isArray(system.modifiers)) {
    converted.system.modifiers = system.modifiers
      .filter((entry) => entry?.type === "modifier")
      .map((entry) => convertLegacyItem(entry));
  }
  if (Array.isArray(system.powerArray)) {
    converted.system.powerArray = system.powerArray
      .filter((entry) => entry?.type === "power")
      .map((entry) => convertLegacyItem(entry));
  }
  normalizeNullableText(converted.system);
  return converted;
}

function cleanSystemData(data) {
  const cleaned = stripDerivedFields(duplicateData(data || {}));
  removeLegacySummaryData(cleaned);
  normalizeLegacyRollDetails(cleaned);
  return cleaned;
}

function cleanActiveEffects(effects) {
  return (effects || []).map((effect) => {
    const copy = duplicateData(effect);
    delete copy.data;
    delete copy.system;
    delete copy.permission;
    delete copy.folder;
    delete copy.sort;
    return copy;
  });
}

function externalIdFor(source) {
  return source?.flags?.mnm3eCharacterImporter?.externalId
    || source?.flags?.mnm3e?.externalId
    || source?._id
    || source?.id
    || "";
}

function normalizeNullableText(system) {
  if (system?.description) {
    if (system.description.value == null) system.description.value = "";
    if (system.description.chat == null) system.description.chat = "";
  }
  if (system?.summary) {
    if (system.summary.format == null) system.summary.format = "";
    if (system.summary.position == null) system.summary.position = "";
  }
}

function removeLegacySummaryData(value) {
  if (Array.isArray(value)) {
    value.forEach((entry) => removeLegacySummaryData(entry));
    return;
  }
  if (!isPlainObject(value)) return;
  if (isPlainObject(value.summary)) {
    delete value.summary.data;
  }
  Object.values(value).forEach((entry) => removeLegacySummaryData(entry));
}

function normalizeLegacyRollDetails(value) {
  if (Array.isArray(value)) {
    value.forEach((entry) => normalizeLegacyRollDetails(entry));
    return;
  }
  if (!isPlainObject(value)) return;

  if (isPlainObject(value.formula) && isPlainObject(value.targetScore) && isPlainObject(value.rollType)) {
    const rollType = String(value.rollType.value || "");
    if (Array.isArray(value.formula.value)) {
      value.formula.value = value.formula.value.filter((entry) => {
        return !(entry?.dataPath === "formula" && String(entry.value || "").trim() === "");
      });
    }
    if (rollType !== "required") {
      value.formula.value = [];
      if (value.targetScore?.type?.value === "custom" && !String(value.targetScore?.custom?.value || "").trim()) {
        value.targetScore.type.value = "";
      }
    } else if (value.targetScore?.type?.value === "custom" && !String(value.targetScore?.custom?.value || "").trim()) {
      value.targetScore.custom.value = "DC";
    }
  }

  Object.values(value).forEach((entry) => normalizeLegacyRollDetails(entry));
}
