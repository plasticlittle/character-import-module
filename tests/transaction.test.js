import test from "node:test";
import assert from "node:assert/strict";
import { Mnm3eCharacterImportService } from "../scripts/importer/import-service.js";
import { createActorTransaction, updateActorTransaction } from "../scripts/importer/transaction.js";
import { FLAG_EXTERNAL_ID, FLAG_SCOPE } from "../scripts/importer/constants.js";
import { loadExample } from "./helpers.js";

test("dry-run import does not create or update documents", async () => {
  const example = await loadExample();
  let created = false;
  class ActorClass {
    static async create() {
      created = true;
      throw new Error("should not be called");
    }
  }
  const result = await new Mnm3eCharacterImportService().import(example, {
    dryRun: true,
    mode: "create",
    ActorClass,
    useFoundry: false
  });
  assert.equal(result.ok, true);
  assert.equal(result.committed, false);
  assert.equal(created, false);
});

test("create rollback deletes a newly created actor on embedded item failure", async () => {
  let deleted = false;
  const actor = {
    async createEmbeddedDocuments(type) {
      if (type === "Item") throw new Error("item create failed");
      return [];
    },
    async delete() {
      deleted = true;
    }
  };
  class ActorClass {
    static async create() {
      return actor;
    }
  }
  await assert.rejects(
    createActorTransaction({
      actorData: { name: "Broken", type: "character", data: {}, flags: {} },
      actorEffects: [],
      itemDataArray: [{ name: "Item", type: "power", data: {} }]
    }, { ActorClass }),
    /item create failed/
  );
  assert.equal(deleted, true);
});

test("create uses CONFIG.Actor.documentClass when global Actor is unavailable", async () => {
  const hadActor = Object.prototype.hasOwnProperty.call(globalThis, "Actor");
  const originalActor = globalThis.Actor;
  const originalConfig = globalThis.CONFIG;
  let createdName = "";
  const actor = {
    async createEmbeddedDocuments() {
      return [];
    }
  };
  class DocumentActor {
    static async create(data) {
      createdName = data.name;
      return actor;
    }
  }

  try {
    delete globalThis.Actor;
    globalThis.CONFIG = { Actor: { documentClass: DocumentActor } };
    const result = await createActorTransaction({
      actorData: { name: "Created Via Config", type: "character", data: {}, flags: {} },
      actorEffects: [],
      itemDataArray: []
    });
    assert.equal(result, actor);
    assert.equal(createdName, "Created Via Config");
  } finally {
    if (hadActor) globalThis.Actor = originalActor;
    else delete globalThis.Actor;
    globalThis.CONFIG = originalConfig;
  }
});

test("create supports legacy createEmbeddedEntity API", async () => {
  const calls = [];
  const actor = {
    async createEmbeddedEntity(type, data) {
      calls.push([type, data.name || data.label]);
      return { type, data };
    }
  };
  class ActorClass {
    static async create() {
      return actor;
    }
  }

  const result = await createActorTransaction({
    actorData: { name: "Legacy Actor", type: "character", data: {}, flags: {} },
    actorEffects: [{ label: "Legacy Effect" }],
    itemDataArray: [{ name: "Legacy Item", type: "power", data: {} }]
  }, { ActorClass });

  assert.equal(result, actor);
  assert.deepEqual(calls, [
    ["OwnedItem", "Legacy Item"],
    ["ActiveEffect", "Legacy Effect"]
  ]);
});

test("create rewrites actor active effect origins to newly created owned items", async () => {
  const createdEffects = [];
  const actor = {
    id: "newActor",
    uuid: "Actor.newActor",
    async createEmbeddedDocuments(type, documents) {
      if (type === "Item") {
        return documents.map((document, index) => ({
          id: `newItem${index + 1}`,
          uuid: `Actor.newActor.OwnedItem.newItem${index + 1}`,
          name: document.name,
          flags: document.flags,
          data: {
            _id: `newItem${index + 1}`,
            flags: document.flags
          }
        }));
      }
      if (type === "ActiveEffect") {
        createdEffects.push(...documents);
        return documents;
      }
      return documents;
    }
  };
  class ActorClass {
    static async create() {
      return actor;
    }
  }

  await createActorTransaction({
    actorData: { name: "Effect Origin Test", type: "character", data: {}, flags: {} },
    itemDataArray: [{
      name: "Defensive Roll",
      type: "advantage",
      data: {},
      flags: { [FLAG_SCOPE]: { [FLAG_EXTERNAL_ID]: "oldItemId" } }
    }],
    actorEffects: [{
      label: "Defensive Roll",
      origin: "Actor.oldActor.OwnedItem.oldItemId",
      changes: [{ key: "data.defenses.tgh.rank", value: "@rank * 1", mode: 0 }]
    }]
  }, { ActorClass });

  assert.equal(createdEffects.length, 1);
  assert.equal(createdEffects[0].origin, "Actor.newActor.OwnedItem.newItem1");
});

test("update rollback supports legacy embedded entity APIs", async () => {
  const calls = [];
  const actor = {
    data: {
      name: "Old",
      type: "character",
      img: "old.png",
      data: {},
      flags: {},
      items: [{ _id: "oldItem", name: "Old Item", type: "power", data: {} }],
      effects: [{ _id: "oldEffect", label: "Old Effect" }]
    },
    toObject() {
      return this.data;
    },
    async update(data) {
      calls.push(["update", data.name]);
    },
    async deleteEmbeddedEntity(type, id) {
      calls.push(["delete", type, id]);
    },
    async createEmbeddedEntity(type, data) {
      calls.push(["create", type, data.name || data.label]);
      if (type === "OwnedItem" && data.name === "Bad Item") {
        throw new Error("legacy update failed");
      }
      return data;
    }
  };

  await assert.rejects(
    updateActorTransaction(actor, {
      actorData: { name: "New", type: "character", img: "new.png", data: {}, flags: {} },
      actorEffects: [],
      itemDataArray: [{ name: "Bad Item", type: "power", data: {} }]
    }, { strategy: "replace" }),
    /legacy update failed/
  );

  assert.equal(calls.some((call) => call[0] === "delete" && call[1] === "OwnedItem" && call[2] === "oldItem"), true);
  assert.equal(calls.some((call) => call[0] === "create" && call[1] === "ActiveEffect" && call[2] === "Old Effect"), true);
  assert.equal(calls.some((call) => call[0] === "create" && call[1] === "OwnedItem" && call[2] === "Old Item"), true);
});

test("update rollback restores actor, items and active effects", async () => {
  const calls = [];
  const actor = {
    name: "Old",
    data: {
      name: "Old",
      type: "character",
      img: "old.png",
      data: { attributes: { powerLevel: 1 } },
      flags: {},
      items: [{ _id: "oldItem", name: "Old Item", type: "power", data: {} }],
      effects: [{ _id: "oldEffect", label: "Old Effect" }]
    },
    items: [{ _id: "oldItem", name: "Old Item", type: "power", data: {} }],
    effects: [{ _id: "oldEffect", label: "Old Effect" }],
    toObject() {
      return this.data;
    },
    async update(data) {
      calls.push(["update", data.name]);
    },
    async deleteEmbeddedDocuments(type, ids) {
      calls.push(["delete", type, ids.join(",")]);
    },
    async createEmbeddedDocuments(type, docs) {
      calls.push(["create", type, docs.length]);
      if (type === "Item" && docs.some((doc) => doc.name === "Bad Item")) {
        throw new Error("update failed");
      }
      return docs;
    }
  };

  await assert.rejects(
    updateActorTransaction(actor, {
      actorData: { name: "New", type: "character", img: "new.png", data: {}, flags: {} },
      actorEffects: [],
      itemDataArray: [{ name: "Bad Item", type: "power", data: {} }]
    }, { strategy: "replace" }),
    /update failed/
  );

  assert.equal(calls.some((call) => call[0] === "update" && call[1] === "Old"), true);
  assert.equal(calls.some((call) => call[0] === "create" && call[1] === "ActiveEffect" && call[2] === 1), true);
  assert.equal(calls.some((call) => call[0] === "create" && call[1] === "Item" && call[2] === 1), true);
});
