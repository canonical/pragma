/**
 * A stored record's fields, or null for a value that is no record. Storage
 * is an external boundary: what it holds is checked field by field, and
 * this is the one place a stored value is taken as a record of fields.
 */
export default function readRecordFields(
  value: unknown,
): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}
