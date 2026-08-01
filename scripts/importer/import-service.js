import { commitImport } from "./transaction.js";
import { normalizeDocument } from "./normalizer.js";
import { validateAgainstSchema } from "./schema-validator.js";
import { semanticValidate } from "./semantic-validator.js";
import {
  calculateActorPointPreview,
  collectItemCostPreview,
  externalIdOf
} from "./cost-calculator.js";
import { DEFAULT_MAX_DEPTH } from "./constants.js";
import { asArray, duplicateData } from "./foundry-utils.js";
import { convertLegacyFoundryActor } from "./legacy-fvtt-converter.js";

export class Mnm3eCharacterImportService {
  constructor(options = {}) {
    this.maxDepth = Number.isFinite(options.maxDepth) ? options.maxDepth : DEFAULT_MAX_DEPTH;
  }

  parse(source) {
    const parsed = typeof source === "string" ? JSON.parse(source) : duplicateData(source);
    return convertLegacyFoundryActor(parsed);
  }

  async prepare(source, options = {}) {
    const document = this.parse(source);
    const issues = [];

    const schemaIssues = validateAgainstSchema(document);
    issues.push(...schemaIssues);
    if (hasErrors(issues)) {
      return this.previewResult({ document, issues, stage: "schema" });
    }

    const maxDepth = Number.isFinite(options.maxDepth) ? options.maxDepth : this.maxDepth;
    const semanticIssues = semanticValidate(document, { maxDepth });
    issues.push(...semanticIssues);
    if (hasErrors(issues)) {
      return this.previewResult({ document, issues, stage: "semantic" });
    }

    const normalized = await normalizeDocument(document, {
      maxDepth,
      useFoundry: options.useFoundry
    });
    const costs = calculateActorPointPreview(normalized.actorData, normalized.itemDataArray);
    const itemTree = collectItemCostPreview(normalized.itemDataArray);
    issues.push(...auditExpected(document.expected, costs, itemTree));

    return this.previewResult({
      document,
      normalized,
      issues,
      costs,
      itemTree,
      stage: "preview"
    });
  }

  async import(source, options = {}) {
    const preview = await this.prepare(source, options);
    if (!preview.ok) return preview;
    if (options.dryRun) {
      return {
        ...preview,
        committed: false,
        dryRun: true,
        report: buildImportReport(preview, null)
      };
    }
    const actor = await commitImport(preview.normalized, options);
    return {
      ...preview,
      actor,
      committed: true,
      dryRun: false,
      report: buildImportReport(preview, actor)
    };
  }

  previewResult({ document, normalized = null, issues = [], costs = null, itemTree = [], stage }) {
    const ok = !hasErrors(issues);
    return {
      ok,
      stage,
      document,
      normalized,
      issues,
      costs,
      itemTree,
      report: buildImportReport({ ok, stage, document, issues, costs, itemTree }, null)
    };
  }
}

export function canImportActor(actor = null) {
  const user = globalThis.game?.user;
  if (!user) return true;
  if (user.isGM) return true;
  if (actor && typeof actor.testUserPermission === "function") {
    return actor.testUserPermission(user, "OWNER");
  }
  return Boolean(user.can && user.can("ACTOR_CREATE"));
}

export function buildImportReport(preview, actor = null) {
  return {
    module: "mnm3e-character-importer",
    ok: preview.ok,
    stage: preview.stage,
    actor: actor ? { id: actor.id, name: actor.name } : null,
    sourceActor: preview.document?.actor
      ? {
          name: preview.document.actor.name,
          type: preview.document.actor.type,
          externalId: preview.document.actor.externalId || ""
        }
      : null,
    issues: preview.issues || [],
    costs: preview.costs || null,
    itemTree: preview.itemTree || []
  };
}

function hasErrors(issues) {
  return issues.some((issue) => issue.severity === "error");
}

function auditExpected(expected, costs, itemTree) {
  if (!expected) return [];
  const issues = [];
  if (expected.points) {
    ["abilities", "skills", "defenses", "advantages", "powers", "total", "max"].forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(expected.points, key)) return;
      if (expected.points[key] !== costs[key]) {
        issues.push({
          pointer: `/expected/points/${key}`,
          code: "expected.points-mismatch",
          message: `Expected ${key} to be ${expected.points[key]}, calculated ${costs[key]}.`,
          severity: "warning",
          name: ""
        });
      }
    });
  }
  if (expected.items) {
    const byExternalId = new Map();
    flattenCostTree(itemTree).forEach((entry) => {
      if (entry.externalId) byExternalId.set(entry.externalId, entry);
    });
    Object.entries(expected.items).forEach(([externalId, expectedValue]) => {
      const entry = byExternalId.get(externalId);
      const expectedCost = typeof expectedValue === "number" ? expectedValue : expectedValue?.totalCost;
      if (!entry) {
        issues.push({
          pointer: `/expected/items/${externalId}`,
          code: "expected.item-missing",
          message: `Expected item '${externalId}' was not found in the preview tree.`,
          severity: "warning",
          name: externalId
        });
      } else if (typeof expectedCost === "number" && entry.totalCost !== expectedCost) {
        issues.push({
          pointer: `/expected/items/${externalId}`,
          code: "expected.item-cost-mismatch",
          message: `Expected item '${externalId}' to cost ${expectedCost}, calculated ${entry.totalCost}.`,
          severity: "warning",
          name: entry.name || externalId
        });
      }
    });
  }
  return issues;
}

function flattenCostTree(tree) {
  const entries = [];
  asArray(tree).forEach((entry) => {
    entries.push(entry);
    entries.push(...flattenCostTree(entry.children));
  });
  return entries;
}

export { externalIdOf };
