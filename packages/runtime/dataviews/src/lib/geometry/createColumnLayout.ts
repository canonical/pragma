import { createChannel, protectChannel } from "../observable/index.js";
import areSizingsEqual from "./areSizingsEqual.js";
import type {
  ColumnLayout,
  ColumnLayoutState,
  ColumnSizing,
  ColumnToSize,
} from "./types.js";

/**
 * Create the layout record for one collection's columns: declared
 * sizing plus user-fixed overrides, with a channel published on change.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function createColumnLayout(
  columns: readonly ColumnToSize[],
): ColumnLayout {
  const declared = new Map<string, ColumnSizing>();
  for (const column of columns) {
    if (column.id === "") {
      throw new Error("column id must not be empty");
    }
    if (declared.has(column.id)) {
      throw new Error(`duplicate column id "${column.id}"`);
    }
    declared.set(column.id, column.sizing);
  }
  const initialDeclared = Object.freeze(Object.fromEntries(declared));
  /** The declared sizing of one column, which every column has. */
  const declaredOf = (id: string): ColumnSizing => {
    const sizing = declared.get(id);
    if (sizing === undefined) {
      throw new Error(`unknown column id "${id}"`);
    }
    return sizing;
  };
  /**
   * The override on one column, or none. An own property only: the
   * overrides are a plain record, and a column named for a prototype
   * member has no override just because the prototype has that member.
   */
  const overrideOf = (id: string): ColumnSizing | undefined =>
    Object.hasOwn(overrides, id) ? overrides[id] : undefined;
  // Copied at construction: toColumns() must not answer from the
  // caller's array, which it may still mutate.
  const order: readonly string[] = Object.freeze(
    columns.map((column) => column.id),
  );

  let overrides: Readonly<Record<string, ColumnSizing>> = Object.freeze({});
  const channel = createChannel<ColumnLayoutState>(
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
    state: protectChannel(channel),
    readDeclared: declaredOf,
    effective(id: string): ColumnSizing {
      return overrideOf(id) ?? declaredOf(id);
    },
    setOverride(id: string, sizing: ColumnSizing): void {
      declaredOf(id);
      const current = overrideOf(id);
      if (current !== undefined && areSizingsEqual(current, sizing)) {
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
    resetOverrides(): void {
      if (Object.keys(overrides).length === 0) {
        return;
      }
      publish(Object.freeze({}));
    },
    toColumns(): readonly ColumnToSize[] {
      return order.map((id) => ({
        id,
        sizing: overrideOf(id) ?? declaredOf(id),
      }));
    },
  };
}
