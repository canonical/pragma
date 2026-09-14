import {
  resolveColumnArrangement,
  spellWidthKey,
  type ViewPresentation,
} from "../presentation/index.js";
import readSizingBounds from "./readSizingBounds.js";
import type {
  ColumnLayout,
  ColumnLayoutConfig,
  ColumnLayoutState,
  ColumnSizing,
  FixedSizing,
} from "./types.js";

/** Whether two override records hold the same fixed widths. */
const areOverridesEqual = (
  a: Readonly<Record<string, FixedSizing>>,
  b: Readonly<Record<string, FixedSizing>>,
): boolean => {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => Object.hasOwn(b, key) && a[key]?.px === b[key]?.px)
  );
};

/**
 * Create the layout record for one table's columns: their declared sizing,
 * with the widths the collection's presentation holds for them applied as
 * fixed overrides, each held to its declared bounds.
 *
 * The presentation is the one authority: the overrides are derived from
 * its arrangement whenever it is read, never kept here, and a resize is
 * written to it — so two tables on one provider never disagree on a width,
 * and a view opened re-layers every table at once. `state` is a read-only
 * channel over that derivation; subscribing to it subscribes to the
 * presentation, and construction subscribes to nothing.
 *
 * @note Impure: keeps the last arrangement it derived from and the snapshot
 * it derived, so a read of an unchanged arrangement answers the same object.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function createColumnLayout(
  config: ColumnLayoutConfig,
): ColumnLayout {
  const { columns, presentation } = config;
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
  // Copied at construction: the layout never answers from the caller's
  // array, which it may still mutate.
  const order: readonly string[] = Object.freeze(
    columns.map((column) => column.id),
  );
  /** The columns as the arrangement resolver takes them, built once. */
  const declaredColumns = order.map((id) => ({ id }));

  /** The declared sizing of one column, which every column has. */
  const readDeclaredSizing = (id: string): ColumnSizing => {
    const sizing = declared.get(id);
    if (sizing === undefined) {
      throw new Error(`unknown column id "${id}"`);
    }
    return sizing;
  };

  /**
   * The fixed widths an arrangement holds, each held to its bounds. What a
   * width is — and what stored under its key is none — is the arrangement
   * resolver's to say, once.
   */
  const deriveOverrides = (
    arrangement: ViewPresentation,
  ): Readonly<Record<string, FixedSizing>> => {
    const overrides: Record<string, FixedSizing> = {};
    // Over the ids copied at construction, never the caller's array.
    for (const { column, width } of resolveColumnArrangement(
      declaredColumns,
      arrangement,
    )) {
      if (width === null) {
        continue;
      }
      const { min, max } = readSizingBounds(readDeclaredSizing(column.id));
      overrides[column.id] = {
        kind: "fixed",
        px: Math.min(max, Math.max(min, width)),
      };
    }
    return Object.freeze(overrides);
  };

  let derivedFrom: ViewPresentation | null = null;
  let snapshot: ColumnLayoutState = Object.freeze({
    declared: initialDeclared,
    overrides: Object.freeze({}),
  });

  /** The layout as the presentation now has it; one object while it is the same. */
  const read = (): ColumnLayoutState => {
    const arrangement = presentation.state.get().presentation;
    if (arrangement !== derivedFrom) {
      derivedFrom = arrangement;
      const overrides = deriveOverrides(arrangement);
      if (!areOverridesEqual(overrides, snapshot.overrides)) {
        snapshot = Object.freeze({ declared: initialDeclared, overrides });
      }
    }
    return snapshot;
  };

  /**
   * The override on one column, or none. An own property only: the
   * overrides are a plain record, and a column named for a prototype
   * member has no override just because the prototype has that member.
   */
  const readOverride = (id: string): FixedSizing | undefined => {
    const { overrides } = read();
    return Object.hasOwn(overrides, id) ? overrides[id] : undefined;
  };

  return {
    state: Object.freeze({
      get: read,
      subscribe(listener) {
        let last = read();
        return presentation.state.subscribe(() => {
          const next = read();
          if (next !== last) {
            last = next;
            listener();
          }
        });
      },
    }),
    readDeclared: readDeclaredSizing,
    effective(id: string): ColumnSizing {
      return readOverride(id) ?? readDeclaredSizing(id);
    },
    setOverride(id: string, sizing: FixedSizing): void {
      readDeclaredSizing(id);
      if (readOverride(id)?.px === sizing.px) {
        return;
      }
      presentation.arrange({ [spellWidthKey(id)]: sizing.px });
    },
    removeOverride(id: string): void {
      if (readOverride(id) === undefined) {
        return;
      }
      // Null rather than absent: it stands over a width the open view was
      // saved with, so the column returns to its declared sizing.
      presentation.arrange({ [spellWidthKey(id)]: null });
    },
    clearOverrides(): void {
      const ids = Object.keys(read().overrides);
      if (ids.length === 0) {
        return;
      }
      presentation.arrange(
        Object.fromEntries(ids.map((id) => [spellWidthKey(id), null])),
      );
    },
  };
}
