/**
 * Read one field of a row record. Rows are constrained to `object` rather
 * than an index signature, so the read is expressed here once instead of at
 * every call site.
 *
 * Own properties only: a column naming `constructor`, `toString` or any
 * other inherited member reads nothing, rather than a value the record
 * never carried.
 *
 * One read for the row model and for a source's default field reader, so
 * both read a row the same way.
 */
export default function readField(row: object, field: string): unknown {
  return Object.hasOwn(row, field)
    ? (row as Record<string, unknown>)[field]
    : undefined;
}
