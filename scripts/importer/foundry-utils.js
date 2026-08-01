export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function duplicateData(value) {
  if (typeof globalThis.duplicate === "function") {
    return globalThis.duplicate(value);
  }
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

export function mergeData(target, source, options = {}) {
  const overwrite = options.overwrite !== false;
  const result = options.inplace === false ? duplicateData(target) : target;
  if (!isPlainObject(source)) return result;
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      mergeData(result[key], value, { overwrite, inplace: true });
    } else if (overwrite || result[key] === undefined) {
      result[key] = duplicateData(value);
    }
  }
  return result;
}

export function getPropertySafe(source, path) {
  if (!path) return source;
  if (typeof globalThis.getProperty === "function") {
    return globalThis.getProperty(source, path);
  }
  return String(path)
    .split(".")
    .reduce((value, segment) => (value == null ? undefined : value[segment]), source);
}

export function setPropertySafe(source, path, value) {
  if (typeof globalThis.setProperty === "function") {
    return globalThis.setProperty(source, path, value);
  }
  const parts = String(path).split(".");
  let cursor = source;
  while (parts.length > 1) {
    const part = parts.shift();
    if (!isPlainObject(cursor[part])) cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts[0]] = value;
  return true;
}

export function deletePropertySafe(source, path) {
  const parts = String(path).split(".");
  const key = parts.pop();
  const parent = parts.reduce((value, segment) => (value == null ? undefined : value[segment]), source);
  if (parent && Object.prototype.hasOwnProperty.call(parent, key)) {
    delete parent[key];
  }
}

export function toSourceObject(document) {
  if (!document) return document;
  if (typeof document.toObject === "function") return document.toObject();
  if (document.data) return duplicateData(document.data);
  return duplicateData(document);
}

export function randomTempId() {
  if (typeof globalThis.randomID === "function") {
    return `${globalThis.randomID(8)}-temp`;
  }
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";
  for (let i = 0; i < 8; i += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${value}-temp`;
}

export function escapeJsonPointerSegment(segment) {
  return String(segment).replace(/~/g, "~0").replace(/\//g, "~1");
}

export function joinPointer(base, segment) {
  if (segment === undefined || segment === null || segment === "") return base || "";
  return `${base || ""}/${escapeJsonPointerSegment(segment)}`;
}

export function titleForObject(value) {
  if (value && typeof value.name === "string" && value.name.trim()) return value.name;
  if (value && typeof value.externalId === "string" && value.externalId.trim()) return value.externalId;
  return "";
}

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (isPlainObject(value)) return Object.values(value);
  return [];
}

export function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function numberOrZero(value) {
  return isFiniteNumber(value) ? value : 0;
}

