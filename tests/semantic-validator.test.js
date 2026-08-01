import test from "node:test";
import assert from "node:assert/strict";
import { validateAgainstSchema } from "../scripts/importer/schema-validator.js";
import { semanticValidate } from "../scripts/importer/semantic-validator.js";
import { clone, loadExample } from "./helpers.js";

test("accepts the bundled example", async () => {
  const example = await loadExample();
  assert.deepEqual(validateAgainstSchema(example), []);
  assert.deepEqual(semanticValidate(example), []);
});

test("reports duplicate external IDs", async () => {
  const doc = await loadExample();
  doc.actor.items[0].externalId = "power-blast";
  const issues = semanticValidate(doc);
  assert.equal(issues.some((issue) => issue.code === "external-id.duplicate"), true);
});

test("reports invalid nested item types", async () => {
  const doc = await loadExample();
  doc.actor.items[1].system.effects[0].type = "power";
  const issues = semanticValidate(doc);
  assert.equal(issues.some((issue) => issue.code === "item.invalid-nested-type"), true);
});

test("validates dynamic skill IDs and formula paths", async () => {
  const doc = await loadExample();
  doc.actor.system.skills.exp.data["Bad.Name"] = { rank: 1, displayName: "Bad" };
  doc.actor.items[1].system.effects[0].system.action.roll.attack.formula.value[0].dataPath = "skills.exp.data.Missing.total";
  const issues = semanticValidate(doc);
  assert.equal(issues.some((issue) => issue.code === "skill.invalid-dynamic-id"), true);
  assert.equal(issues.some((issue) => issue.code === "formula.unknown-score-path"), true);
});

test("validates formula values, custom target labels and remaining uses", async () => {
  const doc = await loadExample();
  const effect = doc.actor.items[1].system.effects[0];
  effect.system.activation.check.formula.value[1].value = "";
  effect.system.activation.check.targetScore.custom.value = "";
  effect.system.activation.uses.remaining = 4;
  const issues = semanticValidate(doc);
  assert.equal(issues.some((issue) => issue.code === "formula.empty"), true);
  assert.equal(issues.some((issue) => issue.code === "target-score.empty-custom-label"), true);
  assert.equal(issues.some((issue) => issue.code === "uses.remaining-exceeds-max"), true);
});

test("validates recursion depth and expensive power arrays", async () => {
  const doc = await loadExample();
  const alt = doc.actor.items[1].system.powerArray[0];
  alt.system.effects[0].system.rank = 30;
  const issues = semanticValidate(doc, { maxDepth: 0 });
  assert.equal(issues.some((issue) => issue.code === "recursion.max-depth"), true);
  assert.equal(issues.some((issue) => issue.code === "power-array.too-expensive"), true);
});

test("reports unknown, derived and invalid discount fields", async () => {
  const doc = await loadExample();
  const effect = doc.actor.items[1].system.effects[0];
  effect.system.total = 99;
  effect.system.notAField = true;
  effect.system.modifiers[0].system.cost.type = "discount";
  effect.system.modifiers[0].system.cost.discountPer = 0;
  const issues = semanticValidate(doc);
  assert.equal(issues.some((issue) => issue.code === "field.derived"), true);
  assert.equal(issues.some((issue) => issue.code === "field.unknown"), true);
  assert.equal(issues.some((issue) => issue.code === "cost.invalid-discount-divisor"), true);
});

test("does not treat expected totals as import-derived fields", async () => {
  const doc = clone(await loadExample());
  doc.expected.points.total = 123;
  const issues = semanticValidate(doc);
  assert.equal(issues.some((issue) => issue.pointer === "/expected/points/total" && issue.code === "field.derived"), false);
});
