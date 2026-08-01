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
      await createEmbedded(actor, "ActiveEffect", normalized.actorEffects);
    }
    if (normalized.itemDataArray?.length) {
      const created = await createEmbedded(actor, "Item", normalized.itemDataArray);
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
  await deleteEmbedded(actor, documentName, ids);
  await createEmbedded(actor, documentName, data);
}

async function appendEmbedded(actor, documentName, data) {
  await createEmbedded(actor, documentName, data);
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

  await updateEmbedded(actor, "Item", toUpdate);
  await createEmbedded(actor, "Item", toCreate);
}

async function createEmbedded(actor, documentName, data) {
  const documents = duplicateData(data || []);
  if (!documents.length) return [];
  if (typeof actor.createEmbeddedDocuments === "function") {
    return actor.createEmbeddedDocuments(documentName, documents);
  }
  if (typeof actor.createEmbeddedEntity === "function") {
    const created = [];
    for (const document of documents) {
      created.push(await actor.createEmbeddedEntity(legacyEmbeddedName(documentName), document));
    }
    return created;
  }
  if (documentName === "Item" && typeof actor.createOwnedItem === "function") {
    const created = [];
    for (const document of documents) {
      created.push(await actor.createOwnedItem(document));
    }
    return created;
  }
  throw new Error(`Actor cannot create embedded ${documentName} documents in this Foundry version.`);
}

async function updateEmbedded(actor, documentName, data) {
  const documents = duplicateData(data || []);
  if (!documents.length) return [];
  if (typeof actor.updateEmbeddedDocuments === "function") {
    return actor.updateEmbeddedDocuments(documentName, documents);
  }
  if (typeof actor.updateEmbeddedEntity === "function") {
    const updated = [];
    for (const document of documents) {
      updated.push(await actor.updateEmbeddedEntity(legacyEmbeddedName(documentName), document));
    }
    return updated;
  }
  if (documentName === "Item" && typeof actor.updateOwnedItem === "function") {
    const updated = [];
    for (const document of documents) {
      updated.push(await actor.updateOwnedItem(document));
    }
    return updated;
  }
  throw new Error(`Actor cannot update embedded ${documentName} documents in this Foundry version.`);
}

async function deleteEmbedded(actor, documentName, ids) {
  if (!ids.length) return [];
  if (typeof actor.deleteEmbeddedDocuments === "function") {
    return actor.deleteEmbeddedDocuments(documentName, ids);
  }
  if (typeof actor.deleteEmbeddedEntity === "function") {
    const deleted = [];
    for (const id of ids) {
      deleted.push(await actor.deleteEmbeddedEntity(legacyEmbeddedName(documentName), id));
    }
    return deleted;
  }
  if (documentName === "Item" && typeof actor.deleteOwnedItem === "function") {
    const deleted = [];
    for (const id of ids) {
      deleted.push(await actor.deleteOwnedItem(id));
    }
    return deleted;
  }
  throw new Error(`Actor cannot delete embedded ${documentName} documents in this Foundry version.`);
}

function legacyEmbeddedName(documentName) {
  return documentName === "Item" ? "OwnedItem" : documentName;
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
