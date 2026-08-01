import { ACTOR_TYPES, ITEM_TYPES, TOP_LEVEL_ITEM_TYPES } from "./constants.js";
import { isPlainObject, joinPointer, titleForObject } from "./foundry-utils.js";

export const MNM3E_CHARACTER_SCHEMA = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.local/mnm3e-character.schema.json",
  "title": "MNM3E Character Import Document",
  "type": "object",
  "required": ["actor"],
  "additionalProperties": false,
  "properties": {
    "$schema": { "type": "string" },
    "schemaVersion": { "type": "string" },
    "actor": { "$ref": "#/$defs/actor" },
    "expected": { "$ref": "#/$defs/expected" }
  },
  "$defs": {
    "actor": {
      "type": "object",
      "required": ["name", "type", "system"],
      "additionalProperties": false,
      "properties": {
        "externalId": { "type": "string", "minLength": 1 },
        "name": { "type": "string", "minLength": 1 },
        "type": { "type": "string", "enum": ACTOR_TYPES },
        "img": { "type": "string" },
        "system": { "type": "object" },
        "activeEffects": { "type": "array", "items": { "$ref": "#/$defs/activeEffect" } },
        "items": { "type": "array", "items": { "$ref": "#/$defs/topLevelItem" } },
        "flags": { "type": "object" }
      }
    },
    "topLevelItem": {
      "allOf": [
        { "$ref": "#/$defs/item" },
        { "properties": { "type": { "enum": TOP_LEVEL_ITEM_TYPES } } }
      ]
    },
    "item": {
      "type": "object",
      "required": ["name", "type", "system"],
      "additionalProperties": false,
      "properties": {
        "externalId": { "type": "string", "minLength": 1 },
        "name": { "type": "string", "minLength": 1 },
        "type": { "type": "string", "enum": ITEM_TYPES },
        "img": { "type": "string" },
        "system": { "type": "object" },
        "activeEffects": { "type": "array", "items": { "$ref": "#/$defs/activeEffect" } },
        "flags": { "type": "object" }
      }
    },
    "activeEffect": {
      "type": "object",
      "additionalProperties": true,
      "properties": {
        "label": { "type": "string" },
        "icon": { "type": "string" },
        "disabled": { "type": "boolean" },
        "changes": { "type": "array" },
        "duration": { "type": "object" },
        "flags": { "type": "object" },
        "origin": { "type": "string" },
        "transfer": { "type": "boolean" }
      }
    },
    "expected": {
      "type": "object",
      "additionalProperties": true,
      "properties": {
        "points": { "type": "object" },
        "items": { "type": "object" }
      }
    }
  }
};

export function validateAgainstSchema(value, schema = MNM3E_CHARACTER_SCHEMA) {
  const issues = [];
  const root = schema;

  function issue(pointer, code, message, instance) {
    issues.push({
      pointer: pointer || "",
      code,
      message,
      severity: "error",
      name: titleForObject(instance)
    });
  }

  function resolveRef(ref) {
    if (!ref.startsWith("#/")) return null;
    return ref
      .slice(2)
      .split("/")
      .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"))
      .reduce((cursor, segment) => cursor?.[segment], root);
  }

  function validate(instance, node, pointer) {
    if (!node) return;
    if (node.$ref) {
      validate(instance, resolveRef(node.$ref), pointer);
      return;
    }
    if (Array.isArray(node.allOf)) {
      node.allOf.forEach((part) => validate(instance, part, pointer));
      return;
    }

    if (node.type) {
      const types = Array.isArray(node.type) ? node.type : [node.type];
      const ok = types.some((type) => matchesType(instance, type));
      if (!ok) {
        issue(pointer, "schema.type", `Expected ${types.join(" or ")}.`, instance);
        return;
      }
    }

    if (node.enum && !node.enum.includes(instance)) {
      issue(pointer, "schema.enum", `Expected one of: ${node.enum.join(", ")}.`, instance);
    }

    if (typeof instance === "string" && Number.isFinite(node.minLength) && instance.length < node.minLength) {
      issue(pointer, "schema.minLength", `Expected at least ${node.minLength} characters.`, instance);
    }

    if (Array.isArray(instance)) {
      instance.forEach((entry, index) => validate(entry, node.items, joinPointer(pointer, index)));
      return;
    }

    if (isPlainObject(instance)) {
      const required = node.required || [];
      required.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(instance, key)) {
          issue(joinPointer(pointer, key), "schema.required", `Missing required property '${key}'.`, instance);
        }
      });

      const properties = node.properties || {};
      Object.entries(instance).forEach(([key, entry]) => {
        if (properties[key]) {
          validate(entry, properties[key], joinPointer(pointer, key));
        } else if (node.additionalProperties === false) {
          issue(joinPointer(pointer, key), "schema.additionalProperties", `Unknown property '${key}'.`, instance);
        }
      });
    }
  }

  validate(value, schema, "");
  return issues;
}

function matchesType(value, type) {
  switch (type) {
    case "array":
      return Array.isArray(value);
    case "object":
      return isPlainObject(value);
    case "null":
      return value === null;
    case "integer":
      return Number.isInteger(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    default:
      return typeof value === type;
  }
}

