import {
  type Channel,
  createChannel,
  protectChannel,
  type ReadonlyChannel,
} from "../observable/index.js";
import readField from "./readField.js";
import type { RowChannels, RowScopes, RowScopesConfig } from "./types.js";

/** One observed field, paired with the channel it publishes into. */
type FieldSlot = { readonly field: string; readonly channel: Channel<unknown> };

/** A row's channels with the writable side its updates go through. */
type ScopeRecord<TRow extends object> = {
  readonly channels: RowChannels<TRow>;
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
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
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
    const fields: Record<string, ReadonlyChannel<unknown>> = {};
    const slots: FieldSlot[] = [];
    for (const field of observed) {
      const channel = createChannel<unknown>(readField(record, field));
      fields[field] = protectChannel(channel);
      slots.push({ field, channel });
    }
    const row = createChannel<TRow>(record);
    const membership = createChannel(selected);
    return {
      channels: Object.freeze({
        id,
        record: protectChannel(row),
        fields: Object.freeze(fields),
        selected: protectChannel(membership),
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
    ids: protectChannel(ids),
    readRow(id: string): RowChannels<TRow> {
      const record = records.get(id);
      if (record === undefined) {
        throw new Error(`row "${id}" is not in the current model`);
      }
      return record.channels;
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
