import defaultRowIdentifier from "./defaultRowIdentifier.js";
import type {
  RowEntry,
  RowIdentifier,
  RowModel,
  RowModelResult,
} from "./types.js";

/** Configuration of one row model build. */
export type RowModelConfig<TRow extends object> = {
  readonly rows: readonly TRow[];
  /**
   * Reads one record's stable identity. Defaults to the record's own `id`,
   * which must then be a non-empty string.
   */
  readonly identify?: RowIdentifier<TRow> | undefined;
  /** The model this one supersedes, so unchanged entries keep their object. */
  readonly previous?: RowModel<TRow> | undefined;
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
 * Empty, duplicate and non-string identities reject the build rather than
 * throwing: an ambiguous row identity would silently key selection, focus and
 * actions to the wrong record, and the caller that asked for the model is the
 * one that can report it — the provider fails the completion the rows came in.
 */
export default function createRowModel<TRow extends object>(
  config: RowModelConfig<TRow>,
): RowModelResult<TRow> {
  const { rows, previous } = config;
  const identify: (row: TRow) => unknown =
    config.identify ?? defaultRowIdentifier;
  // Named once, not per row: a declared identifier that answered with a
  // non-identity is a different mistake from a record with no `id` at all.
  // Both are fragments a renderer composes into a sentence, so neither
  // tells the developer what to do about it; `identify` says that.
  const identityRejection =
    config.identify === undefined
      ? "row record has no non-empty string id"
      : "row identity must be a non-empty string";
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
      return { status: "rejected", reason: identityRejection };
    }
    if (index.has(id)) {
      return { status: "rejected", reason: `duplicate row id "${id}"` };
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
    return { status: "built", model: unmoved };
  }
  return {
    status: "built",
    model: Object.freeze({
      entries: Object.freeze(entries),
      ids: Object.freeze(ids),
      byId: (id: string): TRow | undefined => index.get(id),
    }),
  };
}
