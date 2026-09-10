import readField from "./readField.js";
import type { RowEntry, RowIdentifier, RowModel } from "./types.js";

/**
 * The identifier used when a provider declares none: the record's own `id`,
 * which must be a non-empty string. A record without one is a configuration
 * error, not a row with an unknown identity.
 */
const defaultRowIdentifier = <TRow extends object>(row: TRow): string => {
  const id = readField(row, "id");
  if (typeof id !== "string" || id === "") {
    throw new Error(
      "row record has no non-empty string id; declare identify to name one",
    );
  }
  return id;
};

/**
 * Build the ordered row model of one result: stable identities in result
 * order, addressable by identity.
 *
 * Passing the current model as `previous` carries every entry whose identity
 * and record are both unchanged — reordering and paging keep their objects —
 * and returns `previous` itself when the whole model is unchanged, so an
 * unrelated republication recreates nothing.
 *
 * Empty, duplicate and non-string identities throw: an ambiguous row identity
 * would silently key selection, focus and actions to the wrong record.
 */
export default function createRowModel<TRow extends object>(
  rows: readonly TRow[],
  identify: RowIdentifier<TRow> = defaultRowIdentifier,
  previous?: RowModel<TRow>,
): RowModel<TRow> {
  const reusable = new Map<string, RowEntry<TRow>>();
  for (const entry of previous?.entries ?? []) {
    reusable.set(entry.id, entry);
  }

  const entries: RowEntry<TRow>[] = [];
  const ids: string[] = [];
  const index = new Map<string, TRow>();
  // The predecessor is returned whole only if every entry lands unmoved;
  // holding the model itself keeps the final check free of a re-test.
  let unmoved: RowModel<TRow> | undefined =
    previous !== undefined && previous.entries.length === rows.length
      ? previous
      : undefined;

  for (const [position, record] of rows.entries()) {
    const id = identify(record);
    if (typeof id !== "string" || id === "") {
      throw new Error("row identity must be a non-empty string");
    }
    if (index.has(id)) {
      throw new Error(`duplicate row id "${id}"`);
    }
    const carried = reusable.get(id);
    const entry =
      carried !== undefined && carried.record === record
        ? carried
        : Object.freeze({ id, record });
    if (unmoved !== undefined && unmoved.entries[position] !== entry) {
      unmoved = undefined;
    }
    entries.push(entry);
    ids.push(id);
    index.set(id, record);
  }

  if (unmoved !== undefined) {
    return unmoved;
  }
  return Object.freeze({
    entries: Object.freeze(entries),
    ids: Object.freeze(ids),
    byId: (id: string): TRow | undefined => index.get(id),
  });
}
