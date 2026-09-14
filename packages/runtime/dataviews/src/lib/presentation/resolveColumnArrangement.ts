import { HIDDEN_KEY, ORDER_KEY } from "./constants.js";
import spellWidthKey from "./spellWidthKey.js";
import type {
  ArrangedColumn,
  DeclaredColumn,
  JsonValue,
  ViewPresentation,
} from "./types.js";

/** The column ids a stored list names among the known ones, once each. */
const listKnownIds = (
  stored: JsonValue | undefined,
  known: ReadonlySet<string>,
): Set<string> => {
  const ids = new Set<string>();
  if (Array.isArray(stored)) {
    for (const id of stored) {
      if (typeof id === "string" && known.has(id)) {
        ids.add(id);
      }
    }
  }
  return ids;
};

/**
 * The declared columns in the stored order, a column the order does not
 * name placed after the nearest declared column before it that the order
 * does name, or first: one walk over the declaration, each listed column
 * heading the group of unlisted columns that follow it.
 */
const orderColumns = <TColumn extends DeclaredColumn>(
  columns: readonly TColumn[],
  listed: ReadonlySet<string>,
): TColumn[] => {
  if (listed.size === 0) {
    return [...columns];
  }
  const first: TColumn[] = [];
  const groups = new Map<string, TColumn[]>([...listed].map((id) => [id, []]));
  let group = first;
  for (const column of columns) {
    const own = groups.get(column.id);
    if (own === undefined) {
      group.push(column);
    } else {
      own.push(column);
      group = own;
    }
  }
  return [...first, ...[...groups.values()].flat()];
};

/**
 * The width the arrangement holds for a column, or null: a width is a
 * finite, non-negative number, and anything else stored under its key is
 * no width at all.
 */
const readWidth = (
  presentation: ViewPresentation,
  id: string,
): number | null => {
  const width = presentation[spellWidthKey(id)];
  return typeof width === "number" && Number.isFinite(width) && width >= 0
    ? width
    : null;
};

/**
 * Place a renderer's declared columns as the arrangement in force has them.
 *
 * The order is the stored list of column ids: an id naming no declared
 * column is ignored, and a declared column the list does not name takes
 * its declared position — after the nearest declared column before it that
 * the list does name, or first. The hidden columns are the stored list of
 * ids, less the ones the renderer does not declare or declares as not
 * hideable; when every column would be hidden, the first stays visible.
 * Each column is returned as declared, with the width the arrangement holds
 * for it, unbounded: holding it to the declared bounds is the renderer's.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function resolveColumnArrangement<
  TColumn extends DeclaredColumn,
>(
  columns: readonly TColumn[],
  presentation: ViewPresentation,
): readonly ArrangedColumn<TColumn>[] {
  const known = new Set(columns.map((column) => column.id));
  const order = orderColumns(
    columns,
    listKnownIds(presentation[ORDER_KEY], known),
  );
  const hideable = new Set(
    columns
      .filter((column) => column.hideable !== false)
      .map((column) => column.id),
  );
  const hidden = listKnownIds(presentation[HIDDEN_KEY], known);
  for (const id of hidden) {
    if (!hideable.has(id)) {
      hidden.delete(id);
    }
  }
  const first = order.at(0);
  if (first !== undefined && hidden.size === order.length) {
    hidden.delete(first.id);
  }
  return order.map((column) => ({
    column,
    hidden: hidden.has(column.id),
    width: readWidth(presentation, column.id),
  }));
}
