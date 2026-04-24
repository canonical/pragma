/**
 * Generator-specific casing utilities.
 *
 * For standard casing (camelCase, PascalCase, kebabCase), use
 * `@canonical/utils` instead. These functions cover cases not
 * provided by the shared utils package.
 */

import { capitalize } from "@canonical/utils";

/**
 * Convert a value to Title Case (space-separated capitalized words).
 */
export function toTitleCase(value: string): string {
  return value
    .split(/[/_\-+\s]+/)
    .filter(Boolean)
    .map((segment) => capitalize(segment))
    .join(" ");
}

/**
 * Normalize a command path argument: trim, remove leading/trailing slashes,
 * convert backslashes to forward slashes.
 */
export function normalizeCommandPath(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}
