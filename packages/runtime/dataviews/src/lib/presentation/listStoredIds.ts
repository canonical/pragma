import type { JsonValue } from "./types.js";

/**
 * The column ids a stored list holds, in its order, once each: every string
 * in it, whether or not one renderer declares that column, since another
 * table over the same presentation may. Anything stored under the key that
 * is not a list holds none.
 */
export default function listStoredIds(
  stored: JsonValue | undefined,
): readonly string[] {
  if (!Array.isArray(stored)) {
    return [];
  }
  return [
    ...new Set(stored.filter((id): id is string => typeof id === "string")),
  ];
}
