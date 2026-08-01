import { FLAG_EXTERNAL_ID, FLAG_SCOPE } from "./constants.js";
import { duplicateData, toSourceObject } from "./foundry-utils.js";

export async function commitImport(normalized, options = {}) {
  if (options.mode === "update") {
    if (!options.actor) throw new Error("Update import requires an existing actor.");
    return updateActorTransaction(options.actor, normalized, options);
  }
  return createActorTransaction(normalized, options);
}

export async function createActorTransaction(normalized, options = {}) {
  const ActorClass = resolveActorClass(options);
  if (!ActorClass || typeof ActorClass.create !== "function") {
    throw new Error("Foundry Actor.create is not available through Actor or CONFIG.Actor.documentClass.");
  }

  const actorData = duplicateData(normalized.actorData);
  let actor = null;
  try {
    actor = await ActorClass.create(actorData);
    if (normalized.actorEffects?.length) {
      await actor.createEmbeddedDocuments("ActiveEffect", duplicateData(normalized.actorEffects));
    }
    if (normalized.itemDataArray?.length) {
      const created = await actor.createEmbeddedDocuments("Item", duplicateData(normalized.itemDataArray));
      if (Array.isArray(created) && created.length !== normalized.itemDataArray.length) {
        throw new Error("Foundry did not create all requested embedded items.");
      }
    }
    return actor;
  } catch (error) {
    if (actor && typeof actor.delete === "function") {
      await actor.delete();
    }
    throw error;
  }
}

function resolveActorClass(options = {}) {
  return options.ActorClass
    || globalThis.CONFIG?.Actor?.documentClass
    || globalThis.CONFIG?.Actor?.entityClass
    || globalThis.CONFIG?.Actor?.implementation
    || globalThis.Actor;
}

export async function updateActorTransaction(actor, normalized, options = {}) {
  const snapshot = snapshotActor(actor);
  try {
    await applyActorBaseUpdate(actor, normalized.actorData);
    const strategy = options.strategy || "replace";
    if (strategy === "replace") {
      await replaceEmbedded(actor, "ActiveEffect", normalized.actorEffects || []);
      await replaceEmbedded(actor, "Item", normalized.itemDataArray || []);
    } else if (strategy === "append") {
      await appendEmbedded(actor, "ActiveEffect", normalized.actorEffects || []);
      await appendEmbedded(actor, "Item", normalized.itemDataArray || []);
    } else if (strategy === "merge-by-external-id") {
      await appendEmbedded(actor, "ActiveEffect", normalized.actorEffects || []);
      await mergeItemsByExternalId(actor, normalized.itemDataArray || []);
    } else {
      throw new Error(`Unknown import strategy '${strategy}'.`);
    }
    return actor;
  } catch (error) {
    try {
      await restoreActorSnapshot(actor, snapshot);
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    throw error;
  }
}

export function snapshotActor(actor) {
  const source = toSourceObject(actor);
  return duplicateData(source);
}

export async function restoreActorSnapshot(actor, snapshot) {
  await applyActorBaseUpdate(actor, pickActorBase(snapshot));
  await replaceEmbedded(actor, "ActiveEffect", snapshot.effects || []);
  await replaceEmbedded(actor, "Item", snapshot.items || []);
}

async function applyActorBaseUpdate(actor, actorData) {
  const update = pickActorBase(actorData);
  if (typeof actor.update === "function") {
    await actor.update(update);
  }
}

function pickActorBase(source) {
  return {
    name: source.name,
    type: source.type,
    img: source.img,
    data: duplicateData(source.data || {}),
    flags: duplicateData(source.flags || {}),
    token: duplicateData(source.token)
  };
}

async function replaceEmbedded(actor, documentName, data) {
  const ids = embeddedIds(actor, documentName);
  if (ids.length && typeof actor.deleteEmbeddedDocuments === "function") {
    await actor.deleteEmbeddedDocuments(documentName, ids);
  }
  if (data.length && typeof actor.createEmbeddedDocuments === "function") {
    await actor.createEmbeddedDocuments(documentName, duplicateData(data));
  }
}

async function appendEmbedded(actor, documentName, data) {
  if (data.length && typeof actor.createEmbeddedDocuments === "function") {
    await actor.createEmbeddedDocuments(documentName, duplicateData(data));
  }
}

async function mergeItemsByExternalId(actor, itemDataArray) {
  const existing = embeddedValues(actor, "Item");
  const byExternalId = new Map();
  existing.forEach((item) => {
    const id = itemExternalId(item);
    if (!id) return;
    const list = byExternalId.get(id) || [];
    list.push(item);
    byExternalId.set(id, list);
  });

  const toUpdate = [];
  const toCreate = [];
  itemDataArray.forEach((itemData) => {
    const externalId = itemExternalId(itemData);
    const matches = byExternalId.get(externalId) || [];
    if (externalId && matches.length === 1) {
      const update = duplicateData(itemData);
      update._id = documentId(matches[0]);
      toUpdate.push(update);
    } else {
      toCreate.push(itemData);
    }
  });

  if (toUpdate.length && typeof actor.updateEmbeddedDocuments === "function") {
    await actor.updateEmbeddedDocuments("Item", toUpdate);
  }
  if (toCreate.length && typeof actor.createEmbeddedDocuments === "function") {
    await actor.createEmbeddedDocuments("Item", duplicateData(toCreate));
  }
}

function itemExternalId(item) {
  return item?.externalId || item?.flags?.[FLAG_SCOPE]?.[FLAG_EXTERNAL_ID] || item?.data?.flags?.[FLAG_SCOPE]?.[FLAG_EXTERNAL_ID] || "";
}

function embeddedIds(actor, documentName) {
  return embeddedValues(actor, documentName).map((document) => documentId(document)).filter(Boolean);
}

function embeddedValues(actor, documentName) {
  const collection = documentName === "Item" ? actor.items : actor.effects;
  if (Array.isArray(collection)) return collection;
  if (collection && typeof collection.values === "function") return Array.from(collection.values());
  if (Array.isArray(collection?.contents)) return collection.contents;
  const source = toSourceObject(actor);
  if (documentName === "Item") return source.items || [];
  return source.effects || [];
}

function documentId(document) {
  return document?.id || document?._id || document?.data?._id;
}
