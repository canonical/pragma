import readRecordFields from "./readRecordFields.js";

/** The id a stored record claims, as text, for reporting it unreadable. */
export default function readStoredId(record: unknown): string {
  return String(readRecordFields(record)?.["id"]);
}
