import type { ReactElement } from "react";
import { memo } from "react";
import useDataViewsValue from "../../../DataViews/hooks/useDataViewsValue.js";
import { rowStyle } from "../../tableStyles.js";
import { Cell } from "../Cell/index.js";
import { SelectionCell } from "../SelectionCell/index.js";
import type { RowProps } from "./types.js";

const componentCssClassName = "ds data-table-row";

function Row<TRow extends object>({
  provider,
  scope,
  columns,
  fields,
  selectable,
  rowLabel,
}: RowProps<TRow>): ReactElement {
  const selected = useDataViewsValue(scope.selected);
  return (
    // aria-selected is only meaningful where selection is offered, and it
    // must agree with the row's checkbox: both read this one channel.
    // biome-ignore lint/a11y/useSemanticElements: <tr> is only valid inside a <table>, and this grid is deliberately not one
    // biome-ignore lint/a11y/useFocusableInteractive: the row is structure, not a widget — the focusable controls live in its cells
    <div
      role="row"
      className={[componentCssClassName, selected && "selected"]
        .filter(Boolean)
        .join(" ")}
      style={rowStyle}
      aria-selected={selectable ? selected : undefined}
    >
      {selectable ? (
        <SelectionCell
          provider={provider}
          scope={scope}
          selected={selected}
          rowLabel={rowLabel}
        />
      ) : null}
      {columns.map((column, position) => (
        <Cell
          key={column.id}
          provider={provider}
          scope={scope}
          column={column}
          field={fields[position]}
        />
      ))}
    </div>
  );
}

/**
 * One data row. It observes its own selection membership — a selection
 * change reaches only the rows whose membership moved — and consumes the
 * table's shared track list rather than a width per cell.
 *
 * Memoised: every prop it takes is held at a stable reference by the
 * table, so a row re-renders for its own selection channel and for a
 * column model that actually changed, and for nothing else.
 */
export default memo(Row) as typeof Row;
