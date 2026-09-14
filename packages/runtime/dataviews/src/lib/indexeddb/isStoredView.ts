import { RECORD_VERSION } from "./constants.js";
import readRecordFields from "./readRecordFields.js";
import type { StoredView } from "./types.js";

/**
 * Whether a stored record is a saved view in the format this store reads.
 * Storage is an external boundary, so the record is checked before it is
 * read, never cast.
 */
export default function isStoredView(record: unknown): record is StoredView {
  const fields = readRecordFields(record);
  if (fields === null) {
    return false;
  }
  const { v, id, name, query, presentation, revision, createdAt, updatedAt } =
    fields;
  return (
    v === RECORD_VERSION &&
    typeof id === "string" &&
    typeof name === "string" &&
    typeof query === "string" &&
    typeof revision === "number" &&
    Number.isInteger(revision) &&
    revision >= 1 &&
    typeof createdAt === "string" &&
    typeof updatedAt === "string" &&
    typeof presentation === "object" &&
    presentation !== null &&
    !Array.isArray(presentation)
  );
}
