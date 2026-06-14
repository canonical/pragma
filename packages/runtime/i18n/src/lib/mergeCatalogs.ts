import type { Messages } from "./types.js";

/**
 * Merge a base catalog with overrides, key by key. Overrides win; keys absent
 * from `overrides` keep their `base` value. Returns a new object and never
 * mutates its inputs — useful for layering app messages over a component's
 * built-in defaults.
 *
 * @param base - Default messages (e.g. a component's built-in catalog).
 * @param overrides - Messages that take precedence (e.g. app or locale data).
 */
export default function mergeCatalogs(
  base: Messages,
  overrides: Messages,
): Messages {
  return { ...base, ...overrides };
}
