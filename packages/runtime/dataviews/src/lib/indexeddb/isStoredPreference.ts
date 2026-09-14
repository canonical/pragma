import type { JsonValue } from "../presentation/index.js";
import readRecordFields from "./readRecordFields.js";
import type { StoredPreference } from "./types.js";

/** Whether a value is JSON: what a presentation may hold, and nothing else. */
const isJsonValue = (value: unknown): value is JsonValue => {
  switch (typeof value) {
    case "string":
    case "boolean":
      return true;
    case "number":
      return Number.isFinite(value);
    case "object":
      if (value === null) {
        return true;
      }
      if (Array.isArray(value)) {
        return value.every(isJsonValue);
      }
      return (
        Object.getPrototypeOf(value) === Object.prototype &&
        Object.values(value).every(isJsonValue)
      );
    default:
      return false;
  }
};

/**
 * Whether a stored record is a preference this store can read. Storage is
 * an external boundary — another client, a newer version of this store or
 * a hand-edited database may have written it — so a record is checked
 * before it is read, never cast. One that fails reads as absent: a pin
 * that is not one leaves the view unpinned, a presentation entry that is
 * not one leaves its key unset, and neither is misread as a value.
 */
export default function isStoredPreference(
  record: unknown,
): record is StoredPreference {
  const fields = readRecordFields(record);
  if (fields === null) {
    return false;
  }
  const { scope, target, key, value } = fields;
  return (
    typeof scope === "string" &&
    typeof target === "string" &&
    typeof key === "string" &&
    isJsonValue(value)
  );
}
