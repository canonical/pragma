import type { Channel, ReadonlyChannel } from "../observable/createChannel.js";
import createChannel from "../observable/createChannel.js";
import type { Selection } from "../selection/createSelection.js";
import readField from "./readField.js";
import type { RowModel, RowScope } from "./types.js";

/** Configuration of one table's row-scope registry. */
export type RowScopesConfig<TRow extends object> = {
  /** The provider's row model channel. */
  readonly rows: ReadonlyChannel<RowModel<TRow>>;
  /** The collection's selection record. */
  readonly selection: Selection;
  /** The field names the mounted cells observe. Duplicates are collapsed. */
  readonly fields: readonly string[];
};

/** The row scopes of one mounted table. */
export type RowScopes<TRow extends object> = {
  /** The modelled row identities, in result order. */
  readonly ids: ReadonlyChannel<readonly string[]>;
  /** The scope of one modelled row. Unmodelled identities throw. */
  readonly scope: (id: string) => RowScope<TRow>;
  /**
   * Begin observing the row model and the selection; the return value
   * detaches. Construction reads the current model but subscribes to
   * nothing, so a registry whose caller never attaches it — a render React
   * discarded, or a server render — holds no subscription to leak, and
   * re-attaching after a detach is an ordinary second call.
   */
  readonly observe: () => () => void;
};

/** One observed field, paired with the channel it publishes into. */
type FieldSlot = { readonly field: string; readonly channel: Channel<unknown> };

/** A scope with the writable channels its updates go through. */
type ScopeRecord<TRow extends object> = {
  readonly scope: RowScope<TRow>;
  readonly row: Channel<TRow>;
  readonly selected: Channel<boolean>;
  readonly slots: readonly FieldSlot[];
};

const sameOrder = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id, position) => id === b[position]);

/**
 * Create the row-scope registry of one mounted table.
 *
 * One scope is minted per row identity and reused for that row's whole life
 * in the model: every cell of a row shares its channels, so nothing is minted
 * per cell or per render. A replaced record republishes the whole row and
 * only the fields whose values changed; a selection change publishes only to
 * the rows whose membership changed. Scopes for rows that leave the model are
 * released, so retention is bounded by the rows actually modelled.
 *
 * Observation is a separate step: the registry is readable as soon as it is
 * built, and only `observe()` subscribes.
 */
export default function createRowScopes<TRow extends object>(
  config: RowScopesConfig<TRow>,
): RowScopes<TRow> {
  const observed = [...new Set(config.fields)];
  const records = new Map<string, ScopeRecord<TRow>>();
  const ids = createChannel<readonly string[]>(Object.freeze([]), {
    equals: sameOrder,
  });

  const mint = (
    id: string,
    record: TRow,
    selected: boolean,
  ): ScopeRecord<TRow> => {
    const fields: Record<string, Channel<unknown>> = {};
    const slots: FieldSlot[] = [];
    for (const field of observed) {
      const channel = createChannel<unknown>(readField(record, field));
      fields[field] = channel;
      slots.push({ field, channel });
    }
    const row = createChannel<TRow>(record);
    const membership = createChannel(selected);
    return {
      scope: Object.freeze({
        id,
        row,
        fields: Object.freeze(fields),
        selected: membership,
      }),
      row,
      selected: membership,
      slots,
    };
  };

  const reconcile = (): void => {
    const model = config.rows.get();
    const selected = config.selection.state.get().ids;
    const live = new Set<string>();
    for (const entry of model.entries) {
      live.add(entry.id);
      const existing = records.get(entry.id);
      if (existing === undefined) {
        records.set(
          entry.id,
          mint(entry.id, entry.record, selected.has(entry.id)),
        );
        continue;
      }
      if (!existing.row.set(entry.record)) {
        // The model carries the same record object for an unchanged row and
        // records are immutable snapshots, so no field of it can have
        // moved: reconciliation is O(rows) plus the changed rows' fields.
        continue;
      }
      for (const slot of existing.slots) {
        slot.channel.set(readField(entry.record, slot.field));
      }
    }
    for (const id of records.keys()) {
      if (!live.has(id)) {
        records.delete(id);
      }
    }
    ids.set(model.ids);
  };

  const syncSelection = (): void => {
    const selected = config.selection.state.get().ids;
    for (const [id, record] of records) {
      record.selected.set(selected.has(id));
    }
  };

  reconcile();

  return {
    ids,
    scope(id: string): RowScope<TRow> {
      const record = records.get(id);
      if (record === undefined) {
        throw new Error(`row "${id}" is not in the current model`);
      }
      return record.scope;
    },
    observe(): () => void {
      // Re-read before subscribing: whatever the model published between
      // construction and this call would otherwise be missed.
      reconcile();
      syncSelection();
      const unsubscribeRows = config.rows.subscribe(reconcile);
      const unsubscribeSelection =
        config.selection.state.subscribe(syncSelection);
      return () => {
        unsubscribeRows();
        unsubscribeSelection();
      };
    },
  };
}
