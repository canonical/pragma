import createChannel from "../observable/createChannel.js";
import sizingEquals from "./sizingEquals.js";
import type { ColumnSizing, ColumnToSize } from "./types.js";

/** Immutable presentation snapshot: declared sizing plus user overrides. */
export type PresentationState = {
  /** The declared sizing per column id. */
  readonly declared: Readonly<Record<string, ColumnSizing>>;
  /** User-fixed sizing overrides per column id. */
  readonly overrides: Readonly<Record<string, ColumnSizing>>;
  /** Bumped on every accepted presentation change. */
  readonly revision: number;
};

/** Handle of one presentation record. */
export type Presentation = {
  readonly state: PresentationState;
  /** Observe presentation changes; snapshots are immutable between sets. */
  readonly subscribe: (listener: () => void) => () => void;
  /** The effective sizing of one column: its override, else its declared sizing. */
  readonly effective: (id: string) => ColumnSizing;
  /** Record a user-fixed sizing override (a resize commit). */
  readonly setOverride: (id: string, sizing: ColumnSizing) => void;
  /** Drop one column's override, restoring its declared sizing. */
  readonly resetOverride: (id: string) => void;
  /** Drop every override, restoring all declared sizing. */
  readonly reset: () => void;
  /** The columns to size: declared sizing with overrides applied. */
  readonly toColumns: () => readonly ColumnToSize[];
};

/**
 * Create the presentation record for one collection's columns: declared
 * sizing plus user-fixed overrides, with a channel published on change.
 */
export default function createPresentation(
  columns: readonly ColumnToSize[],
): Presentation {
  const declared: Record<string, ColumnSizing> = {};
  for (const column of columns) {
    if (column.id === "") {
      throw new Error("column id must not be empty");
    }
    if (Object.hasOwn(declared, column.id)) {
      throw new Error(`duplicate column id "${column.id}"`);
    }
    declared[column.id] = column.sizing;
  }
  const initialDeclared = Object.freeze({ ...declared });
  // Copied at construction: toColumns() must not answer from the
  // caller's array, which it may still mutate.
  const order: readonly string[] = Object.freeze(
    columns.map((column) => column.id),
  );

  let overrides: Readonly<Record<string, ColumnSizing>> = Object.freeze({});
  const channel = createChannel<PresentationState>(
    Object.freeze({
      declared: initialDeclared,
      overrides,
      revision: 0,
    }),
  );

  const publish = (next: Readonly<Record<string, ColumnSizing>>): void => {
    overrides = next;
    channel.set(
      Object.freeze({
        declared: initialDeclared,
        overrides,
        revision: channel.get().revision + 1,
      }),
    );
  };

  return {
    get state(): PresentationState {
      return channel.get();
    },
    subscribe: (listener: () => void) => channel.subscribe(listener),
    effective(id: string): ColumnSizing {
      if (!Object.hasOwn(initialDeclared, id)) {
        throw new Error(`unknown column id "${id}"`);
      }
      return overrides[id] ?? initialDeclared[id];
    },
    setOverride(id: string, sizing: ColumnSizing): void {
      if (!Object.hasOwn(initialDeclared, id)) {
        throw new Error(`unknown column id "${id}"`);
      }
      const current = overrides[id];
      if (current !== undefined && sizingEquals(current, sizing)) {
        return;
      }
      publish(Object.freeze({ ...overrides, [id]: sizing }));
    },
    resetOverride(id: string): void {
      if (!Object.hasOwn(overrides, id)) {
        return;
      }
      const next = { ...overrides };
      delete next[id];
      publish(Object.freeze(next));
    },
    reset(): void {
      if (Object.keys(overrides).length === 0) {
        return;
      }
      publish(Object.freeze({}));
    },
    toColumns(): readonly ColumnToSize[] {
      return order.map((id) => ({
        id,
        sizing: overrides[id] ?? initialDeclared[id],
      }));
    },
  };
}
