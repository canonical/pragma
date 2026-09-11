import type { SortTerm } from "@canonical/dataviews-core";
import type { ReactElement } from "react";
import { ResizeHandle } from "../ResizeHandle/index.js";
import type { HeaderCellProps } from "./types.js";

const componentCssClassName = "ds data-table-column-header";

/**
 * The next ordering for one column: unsorted becomes ascending, ascending
 * becomes descending, and descending clears the ordering. Enabling sort
 * never lands on descending by accident.
 */
const nextSort = (
  field: string,
  current: SortTerm | undefined,
): readonly SortTerm[] => {
  if (current === undefined) {
    return [{ field, direction: "asc" }];
  }
  if (current.direction === "asc") {
    return [{ field, direction: "desc" }];
  }
  return [];
};

/**
 * One column header. `aria-sort` describes the applied ordering, so it is
 * absent on a column that does not offer sorting rather than claiming
 * "none" about an ordering it cannot change.
 */
export default function HeaderCell({
  column,
  field,
  sort,
  setSort,
  interaction,
  width,
  labelId,
}: HeaderCellProps): ReactElement {
  const ariaSort =
    column.sortable !== true
      ? undefined
      : sort === undefined
        ? "none"
        : sort.direction === "asc"
          ? "ascending"
          : "descending";
  return (
    // biome-ignore lint/a11y/useSemanticElements: <th> is only valid inside a <table>, and this grid is deliberately not one
    // biome-ignore lint/a11y/useFocusableInteractive: the header is structure, not a widget — its sort button and resize control carry the focus
    <div
      role="columnheader"
      className={componentCssClassName}
      aria-sort={ariaSort}
    >
      {column.sortable === true ? (
        <button
          type="button"
          id={labelId}
          className="sort"
          onClick={() => {
            setSort(nextSort(field, sort));
          }}
        >
          <span className="label">{column.header}</span>
        </button>
      ) : (
        <span id={labelId} className="label">
          {column.header}
        </span>
      )}
      {column.resizable === true ? (
        <ResizeHandle
          interaction={interaction}
          columnId={column.id}
          width={width}
          labelledBy={labelId}
        />
      ) : null}
    </div>
  );
}
