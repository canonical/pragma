import type { SortDirection } from "@canonical/dataviews-core";
import { Icon, type IconProps } from "@canonical/react-ds-global";
import {
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
  useRef,
} from "react";
import { useHydrationFocusHandoff } from "../../../../hooks/index.js";
import { HeaderMenu } from "../HeaderMenu/index.js";
import { ResizeHandle } from "../ResizeHandle/index.js";
import describeSortPrecedence from "./describeSortPrecedence.js";
import isFocusWithinOwnColumn from "./isFocusWithinOwnColumn.js";
import type { HeaderCellProps } from "./types.js";

const componentCssClassName = "ds data-table-header-cell";

/** The ordering's icon. A column the ordering does not name shows none. */
const sortIcon = {
  asc: "chevron-up",
  desc: "chevron-down",
} as const satisfies Readonly<Record<SortDirection, IconProps["icon"]>>;

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
 * implementation covers: sorting and resizing, and hiding and moving the
 * column from its menu; no drag reordering and no pinning.
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
 * and says why, politely. Once scripts run, a menu beside the control
 * carries the same sort for a reader who uses neither a precise pointer
 * nor a modifier key, and hides the column or moves it past the column
 * beside it; a column that can be neither sorted, hidden nor moved has no
 * menu.
 *
 * @implements ds:apps.subcomponent.data_table-header_cell
 */
export default function HeaderCell({
  column,
  sortable,
  precedence,
  primary,
  destination,
  hydrated,
  reason,
  onSort,
  removable,
  onPlace,
  onRemoveFromSort,
  offers,
  onChangeColumn,
  onClearRefusal,
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
  // The link a server rendered and the button replacing it: the button takes
  // the link's focus, or the reader who tabbed to the header before
  // hydration is left on nothing.
  const { link, button } = useHydrationFocusHandoff({ hydrated });
  const descriptionId = `${labelId}-sort`;
  const describedBy = precedence === null ? undefined : descriptionId;
  const indicator =
    precedence === null ? null : (
      <>
        <Icon icon={sortIcon[precedence.direction]} />
        {precedence.count > 1 ? (
          <span className="precedence" aria-hidden="true">
            {precedence.position}
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
      // Named by its label alone: a reader hears a column's name on every
      // cell, and the menu's button, the resize handle and a refusal's
      // message would otherwise be read into it each time.
      aria-labelledby={labelId}
      aria-sort={
        primary && precedence !== null
          ? ariaSort[precedence.direction]
          : undefined
      }
      // A header with no control of its own is described itself.
      aria-describedby={interactive ? undefined : describedBy}
      // A refusal's reason stands while focus is in the header or in this
      // column's own menu, whose surface is portalled outside it, and goes
      // once focus leaves both: a choice from the menu settles it through the
      // ordering instead. Opening the menu mounts it and fires no blur at
      // all, so keeping its surface keeps every open alike. Another
      // column's menu is not this header's, and ends it.
      onBlur={(event: FocusEvent<HTMLDivElement>) => {
        // The window losing focus, not the column: the reader comes back to
        // the same control, and the reason with it.
        if (!event.currentTarget.ownerDocument.hasFocus()) {
          return;
        }
        const next = event.relatedTarget;
        if (
          !(
            next instanceof Element &&
            isFocusWithinOwnColumn(event.currentTarget, next)
          )
        ) {
          onClearRefusal();
        }
      }}
    >
      {sortable && hydrated ? (
        <button
          ref={button}
          type="button"
          id={labelId}
          className="sort"
          aria-describedby={describedBy}
          onKeyDown={(event) => {
            if (isActivationKey(event)) {
              shiftedKey.current = event.shiftKey;
            }
          }}
          // Enter clicks on its keydown, so its keyup ends it; Space clicks
          // after its keyup, so its click ends it, or leaving the control.
          onKeyUp={(event) => {
            if (event.key === "Enter") {
              shiftedKey.current = false;
            }
          }}
          onBlur={() => {
            shiftedKey.current = false;
          }}
          onClick={(event) => {
            const additive =
              event.shiftKey || (event.detail === 0 && shiftedKey.current);
            shiftedKey.current = false;
            onSort(column.id, additive);
          }}
        >
          {label}
          {indicator}
        </button>
      ) : sortable && destination !== null ? (
        <a
          ref={link}
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
      {precedence === null ? null : (
        <span id={descriptionId} hidden>
          {describeSortPrecedence(precedence)}
        </span>
      )}
      {sortable && hydrated ? (
        // A live region rather than a status role: it is polite, it exists
        // before it speaks, and it leaves the table's one status alone. Its
        // text is shown beside the control while it stands.
        <span aria-live="polite" aria-atomic="true" className="sort-reason">
          {reason}
        </span>
      ) : null}
      {/* Offered once scripts run, wherever the menu has something to do. */}
      {hydrated &&
      (sortable ||
        offers.hide ||
        offers["move-left"] ||
        offers["move-right"]) ? (
        <HeaderMenu
          columnId={column.id}
          header={column.header}
          sortable={sortable}
          removable={removable}
          hideable={column.hideable !== false}
          offers={offers}
          onPlace={onPlace}
          onRemoveFromSort={onRemoveFromSort}
          onChangeColumn={onChangeColumn}
        />
      ) : null}
      {/* A focusable handle whose keys resize only once scripts run: none
          before then, so nothing is offered that does not work. */}
      {resizable && hydrated ? (
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
