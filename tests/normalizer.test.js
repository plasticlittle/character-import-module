import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDocument } from "../scripts/importer/normalizer.js";
import { FLAG_EXTERNAL_ID, FLAG_SCOPE } from "../scripts/importer/constants.js";
import { clone, loadExample } from "./helpers.js";

test("maps canonical actor system and activeEffects to Foundry v9 data/effects", async () => {
  const example = await loadExample();
  const normalized = await normalizeDocument(example, { useFoundry: false });
  assert.equal(normalized.actorData.system, undefined);
  assert.equal(normalized.actorData.data.attributes.powerLevel, 8);
  assert.equal(normalized.actorEffects.length, 1);
  assert.equal(normalized.actorData.flags[FLAG_SCOPE][FLAG_EXTERNAL_ID], "example-hero");
});

test("normalizes nested effects, modifiers and active effects as full item sources", async () => {
  const example = await loadExample();
  const normalized = await normalizeDocument(example, { useFoundry: false });
  const power = normalized.itemDataArray.find((item) => item.type === "power");
  const effect = power.data.effects[0];
  const modifier = effect.data.modifiers[0];
  assert.equal(effect.type, "effect");
  assert.match(effect._id, /-temp$/);
  assert.equal(effect.effects.length, 1);
  assert.equal(modifier.type, "modifier");
  assert.match(modifier._id, /-temp$/);
});

test("strips derived fields during normalization", async () => {
  const example = await loadExample();
  const doc = clone(example);
  doc.actor.items[1].system.totalCost = 999;
  doc.actor.items[1].system.effects[0].system.summary = { format: "@name", parsed: "derived", data: { cost: 1 } };
  const normalized = await normalizeDocument(doc, { useFoundry: false });
  const effect = normalized.itemDataArray.find((item) => item.type === "power").data.effects[0];
  assert.equal(normalized.itemDataArray.find((item) => item.type === "power").data.totalCost, undefined);
  assert.equal(effect.data.summary.parsed, undefined);
  assert.equal(effect.data.summary.data, undefined);
});

test("preserves recursive power arrays and dynamic skills", async () => {
  const example = await loadExample();
  const normalized = await normalizeDocument(example, { useFoundry: false });
  const power = normalized.itemDataArray.find((item) => item.type === "power");
  assert.equal(power.data.powerArray[0].type, "power");
  assert.equal(normalized.actorData.data.skills.exp.data.Science.rank, 4);
});

