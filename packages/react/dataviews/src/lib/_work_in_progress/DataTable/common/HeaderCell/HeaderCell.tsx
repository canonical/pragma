import type { SortDirection } from "@canonical/dataviews-core";
import { Icon, type IconProps } from "@canonical/react-ds-global";
import { type KeyboardEvent, type ReactElement, useRef } from "react";
import { ResizeHandle } from "../ResizeHandle/index.js";
import describeSortPlacement from "./describeSortPrecedence.js";
import type { HeaderCellProps } from "./types.js";

const componentCssClassName = "ds data-table-header-cell";

/** The ordering's icon. A column the ordering does not name shows none. */
const sortIcon: Readonly<Record<SortDirection, IconProps["icon"]>> = {
  asc: "chevron-up",
  desc: "chevron-down",
};

/** The value `aria-sort` takes for each direction. */
const ariaSort = {
  asc: "ascending",
  desc: "descending",
} as const satisfies Readonly<Record<SortDirection, string>>;

/** Whether a key press activates a button: Enter, or Space. */
const isActivationKey = (event: KeyboardEvent<HTMLButtonElement>): boolean =>
  event.key === "Enter" || event.key === " ";

/**
 * The header cell is the interactive column header element within a data
 * table. It handles sorting, resizing, reordering, and pinning for its
 * column. It is a sub-component and cannot function outside of a data
 * table.
 *
 * The header cell is distinct from the body cell. While the body cell
 * displays data values and provides row-level interactions such as inline
 * editing and row actions, the header cell is responsible for column-level
 * controls that affect how the entire column behaves.
 *
 * That is the design system's description of the block. What this
 * implementation covers: sorting and resizing, with no reordering or
 * pinning yet.
 *
 * A sortable header is a real link to the next ordering until scripts take
 * over, and a button after: activating it sorts by this column alone,
 * cycling ascending, descending and back to the source's own order, and
 * Shift with a click, Enter or Space adds or cycles it as a further term.
 * Focus stays on the header through the change. A column the ordering
 * names shows its direction as a chevron, and its precedence as a numeral
 * once there are two terms; its control is described by both, as
 * "descending, 2nd of 3". Only the header of the ordering's first term
 * carries `aria-sort`. An activation the source refuses changes nothing
 * and says why, politely.
 *
 * @implements ds:apps.subcomponent.data_table-header_cell
 */
export default function HeaderCell({
  column,
  sortable,
  placement,
  primary,
  destination,
  hydrated,
  reason,
  onSort,
  interaction,
  resizable,
  bounds,
  width,
  labelId,
}: HeaderCellProps): ReactElement {
  // Whether Shift was held when a key began activating the button: a click
  // a key produces carries `detail` 0, and not every browser copies the
  // modifier onto it.
  const shiftedKey = useRef(false);
  const descriptionId = `${labelId}-sort`;
  const describedBy = placement === null ? undefined : descriptionId;
  const indicator =
    placement === null ? null : (
      <>
        <Icon icon={sortIcon[placement.direction]} />
        {placement.count > 1 ? (
          <span className="precedence" aria-hidden="true">
            {placement.position}
          </span>
        ) : null}
      </>
    );
  const label = <span className="label">{column.header}</span>;
  const interactive = sortable && (hydrated || destination !== null);

  return (
    // biome-ignore lint/a11y/useSemanticElements: <th> is only valid inside a <table>, and this grid is deliberately not one
    // biome-ignore lint/a11y/useFocusableInteractive: the header is structure, not a widget — its sort control and resize handle carry the focus
    <div
      role="columnheader"
      className={componentCssClassName}
      aria-sort={
        primary && placement !== null
          ? ariaSort[placement.direction]
          : undefined
      }
      // A header with no control of its own is described itself.
      aria-describedby={interactive ? undefined : describedBy}
    >
      {sortable && hydrated ? (
        <button
          type="button"
          id={labelId}
          className="sort"
          aria-describedby={describedBy}
          onKeyDown={(event) => {
            if (isActivationKey(event)) {
              shiftedKey.current = event.shiftKey;
            }
          }}
          onClick={(event) => {
            const additive =
              event.shiftKey || (event.detail === 0 && shiftedKey.current);
            shiftedKey.current = false;
            onSort(additive);
          }}
        >
          {label}
          {indicator}
        </button>
      ) : sortable && destination !== null ? (
        <a
          href={destination}
          id={labelId}
          className="sort"
          aria-describedby={describedBy}
        >
          {label}
          {indicator}
        </a>
      ) : (
        <>
          <span id={labelId} className="label">
            {column.header}
          </span>
          {indicator}
        </>
      )}
      {placement === null ? null : (
        <span id={descriptionId} hidden>
          {describeSortPlacement(placement)}
        </span>
      )}
      {sortable && hydrated ? (
        // A live region rather than a status role: it is polite, it exists
        // before it speaks, and it leaves the table's one status alone.
        <span aria-live="polite" aria-atomic="true" className="sort-status">
          {reason ?? ""}
        </span>
      ) : null}
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
