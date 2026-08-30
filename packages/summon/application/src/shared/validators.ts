import { normalizeCommandPath } from "./casing.js";

/**
 * A path segment that survives the casing helpers as a valid JS identifier:
 * it must start with a letter (a leading digit would emit code like
 * `function 2faPage()`), and stay within letters/digits/hyphens so
 * toPascalCase/toCamelCase have something well-formed to work on.
 */
const SEGMENT = /^[A-Za-z][A-Za-z0-9-]*$/;

/**
 * Build a `PromptDefinition.validate` for a slash-separated command path
 * (`billing`, `account/settings`). Returns `true | string` per the prompt
 * contract; never throws.
 */
export function validateCommandPath(options: {
  /** Human label for messages, e.g. "Route path". */
  label: string;
  /** Minimum segment count (route needs domain/name = 2). */
  minSegments?: number;
  /** Maximum segment count (a domain or wrapper name is a single segment). */
  maxSegments?: number;
  /** Example shown in error messages. */
  example: string;
}): (value: unknown) => true | string {
  const { label, minSegments = 1, maxSegments, example } = options;
  return (value: unknown): true | string => {
    if (typeof value !== "string" || value.trim() === "") {
      return `${label} is required (for example ${example})`;
    }
    const normalized = normalizeCommandPath(value);
    if (normalized === "") {
      return `${label} is required (for example ${example})`;
    }
    const segments = normalized.split("/");
    if (segments.length < minSegments) {
      return `${label} needs at least ${minSegments} segments (for example ${example})`;
    }
    if (maxSegments !== undefined && segments.length > maxSegments) {
      return `${label} must be a single name without slashes (for example ${example})`;
    }
    for (const segment of segments) {
      if (!SEGMENT.test(segment)) {
        return (
          `${label} segment "${segment}" must start with a letter and use ` +
          `only letters, digits, and hyphens (for example ${example})`
        );
      }
    }
    return true;
  };
}

/**
 * Validate the application directory path: non-empty, relative, and free of
 * `..` traversal — the generator writes an entire tree under it.
 */
export function validateAppPath(value: unknown): true | string {
  if (typeof value !== "string" || value.trim() === "") {
    return "Application directory is required (for example my-app)";
  }
  const trimmed = value.trim();
  if (trimmed.startsWith("/") || /^[A-Za-z]:[\\/]/.test(trimmed)) {
    return "Application directory must be a relative path, not absolute";
  }
  const segments = trimmed.replace(/\\/g, "/").split("/");
  if (segments.some((segment) => segment === "..")) {
    return 'Application directory must not contain ".."';
  }
  if (segments.some((segment) => segment === "" || segment === ".")) {
    return "Application directory must not contain empty or '.' segments";
  }
  return true;
}
