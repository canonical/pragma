/**
 * Row records and the channels their cells observe. A row's identity comes
 * from its record, never from its position in the current array: paging,
 * sorting and windowing all move records between positions.
 */

import type { ReadonlyChannel } from "../observable/index.js";
import type { Selection } from "../selection/index.js";

/**
 * The default row shape: a plain record keyed by field name. Rows are
 * only constrained to `object`, so a consumer's own `interface` is a legal
 * row type without an index signature.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type RowRecord = Readonly<Record<string, unknown>>;

/**
 * Extracts one record's stable identity.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type RowIdentifier<TRow extends object = RowRecord> = (
  row: TRow,
) => string;

/**
 * One row of the model: a stable identity and the record it identifies.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type RowEntry<TRow extends object = RowRecord> = {
  readonly id: string;
  readonly record: TRow;
};

/**
 * The ordered rows of one result, addressable by stable identity. Entries
 * are carried across rebuilds when their identity and record are unchanged,
 * so an unchanged row keeps its object.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type RowModel<TRow extends object = RowRecord> = {
  readonly entries: readonly RowEntry<TRow>[];
  readonly ids: readonly string[];
  /** The record for one identity, or undefined when the row is not modelled. */
  readonly byId: (id: string) => TRow | undefined;
};

/**
 * Whether a schema field applies to a row, by the field's type scoping.
 * Value and empty are the field's own states; this is the third.
 *
 * @seam typed cells — read by the body cell, which draws a not-applicable
 * cell as a dash with the accessible text "not applicable"
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type Applicability = "applies" | "not-applicable";

/**
 * What one model build produced. Building never throws: rows the table
 * could not key reject the completion they arrived in, which the provider
 * publishes as a failure, so the rows already displayed stay — reporting
 * `refresh-failed`, or `stale` once the query has moved on — rather than being
 * replaced by rows nothing can address.
 */
export type RowModelResult<TRow extends object> =
  | { readonly status: "built"; readonly model: RowModel<TRow> }
  | { readonly status: "rejected"; readonly reason: string };

/**
 * One row's channels. Minted once per row identity and shared by every
 * cell of that row: field channels notify only the cells whose value
 * actually changed. A projection, so every channel on it is read-only at
 * runtime — the registry that mints it is the only publisher.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type RowChannels<TRow extends object = RowRecord> = {
  readonly id: string;
  /** The whole record. Watching it is broader than watching one field. */
  readonly record: ReadonlyChannel<TRow>;
  /** One channel per observed field name. */
  readonly fields: Readonly<Record<string, ReadonlyChannel<unknown>>>;
  /** This row's membership of the collection's selection. */
  readonly selected: ReadonlyChannel<boolean>;
};

/** Configuration of one row model build. */
export type RowModelConfig<TRow extends object> = {
  readonly rows: readonly TRow[];
  /** Reads one record's stable identity: the collection's `identify`. */
  readonly identify: RowIdentifier<TRow>;
  /** The model this one supersedes, so unchanged entries keep their object. */
  readonly previous?: RowModel<TRow> | undefined;
};

/**
 * Configuration of one table's row-scope registry.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type RowScopesConfig<TRow extends object = RowRecord> = {
  /** The provider's row model channel. */
  readonly rows: ReadonlyChannel<RowModel<TRow>>;
  /** The collection's selection record. */
  readonly selection: Selection;
  /** The field names the mounted cells observe. Duplicates are collapsed. */
  readonly fields: readonly string[];
};

/**
 * The row scopes of one mounted table.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type RowScopes<TRow extends object = RowRecord> = {
  /** The modelled row identities, in result order. */
  readonly ids: ReadonlyChannel<readonly string[]>;
  /** The channels of one modelled row. Unmodelled identities throw. */
  readonly readRow: (id: string) => RowChannels<TRow>;
  /**
   * Begin observing the row model and the selection; the return value
   * detaches. Construction reads the current model but subscribes to
   * nothing, so a registry whose caller never attaches it — a render React
   * discarded, or a server render — holds no subscription to leak, and
   * re-attaching after a detach is an ordinary second call.
   */
  readonly observe: () => () => void;
};
