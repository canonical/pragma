import type { SortTerm } from "@canonical/dataviews-core";
import type { IconProps } from "@canonical/react-ds-global";
import { Icon } from "@canonical/react-ds-global";
import type { ReactElement } from "react";
import { ResizeHandle } from "../ResizeHandle/index.js";
import type { HeaderCellProps } from "./types.js";

const componentCssClassName = "ds data-table-header-cell";

/** The applied ordering's icon. A column at rest shows none. */
const sortIcon: Readonly<Record<SortTerm["direction"], IconProps["icon"]>> = {
  asc: "chevron-up",
  desc: "chevron-down",
};

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
 * One header cell. `aria-sort` describes the applied ordering, so it is
 * absent on a column that does not offer sorting rather than claiming
 * "none" about an ordering it cannot change. The chevron beside the label
 * repeats it for the eye and is hidden from assistive technology.
 *
 * @implements ds:apps.subcomponent.data_table-header_cell
 */
export default function HeaderCell({
  column,
  field,
  sortable,
  sort,
  setSort,
  interaction,
  resizable,
  bounds,
  width,
  labelId,
}: HeaderCellProps): ReactElement {
  const ariaSort = !sortable
    ? undefined
    : sort === undefined
      ? "none"
      : sort.direction === "asc"
        ? "ascending"
        : "descending";
  return (
    // biome-ignore lint/a11y/useSemanticElements: <th> is only valid inside a <table>, and this grid is deliberately not one
    // biome-ignore lint/a11y/useFocusableInteractive: the header is structure, not a widget — its sort button and resize handle carry the focus
    <div
      role="columnheader"
      className={componentCssClassName}
      aria-sort={ariaSort}
    >
      {sortable ? (
        <button
          type="button"
          id={labelId}
          className="sort"
          onClick={() => {
            setSort(nextSort(field, sort));
          }}
        >
          <span className="label">{column.header}</span>
          {sort === undefined ? null : <Icon icon={sortIcon[sort.direction]} />}
        </button>
      ) : (
        <span id={labelId} className="label">
          {column.header}
        </span>
      )}
      {resizable ? (
        <ResizeHandle
          interaction={interaction}
          columnId={column.id}
          width={width}
          {...bounds}
          labelledBy={labelId}
        />
      ) : null}
    </div>
  );
}
