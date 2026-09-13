import { memo, type ReactElement, type ReactNode, useMemo } from "react";
import { useDataViewsValue } from "../../../DataViews/hooks/index.js";
import {
  CellScopeContext,
  type CellScopeValue,
} from "../../../DataViews/index.js";
import type { BodyCellProps } from "./types.js";

const componentCssClassName = "ds data-table-body-cell";

/** Primitive values render as text; anything else needs the column's `cell`. */
const defaultContent = (value: unknown): ReactNode => {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "bigint":
    case "boolean":
      return String(value);
    default:
      return null;
  }
};

function BodyCell<TRow extends object>({
  provider,
  scope,
  column,
  field,
}: BodyCellProps<TRow>): ReactElement {
  const channel = scope.fields[field];
  if (channel === undefined) {
    // The scopes observe every field the columns read, so a cell without
    // its channel is a table built against another column list.
    throw new Error(`no channel observes the field "${field}"`);
  }
  const value = useDataViewsValue(channel);
  const cellScope = useMemo<CellScopeValue>(
    () => ({
      provider,
      rowId: scope.id,
      columnId: column.id,
      row: scope.row,
      fields: scope.fields,
      selected: scope.selected,
    }),
    [provider, scope, column.id],
  );
  const Content = column.cell;
  return (
    <CellScopeContext value={cellScope}>
      {/* biome-ignore lint/a11y/useSemanticElements: <td> is only valid inside a <table>, and this grid is deliberately not one */}
      <div role="cell" className={componentCssClassName}>
        {Content === undefined ? (
          defaultContent(value)
        ) : (
          <Content value={value} rowId={scope.id} columnId={column.id} />
        )}
      </div>
    </CellScopeContext>
  );
}

/**
 * The body cell is the data cell element that displays content in each row
 * of the data table. It comes in four types: checkbox, text, icon + text,
 * and action. Some cell types support inline editing with multiple edit
 * modes, and the action cell type supports inline action buttons for
 * row-level operations.
 *
 * The body cell is distinct from the header cell. While the header cell
 * handles column-level controls such as sorting, resizing, reordering, and
 * pinning, the body cell is responsible for presenting data values and
 * providing row-level interactions such as inline editing and row actions.
 *
 * That is the design system's description of the block. What this
 * implementation covers: the text cell and a column's own renderer, with
 * no inline editing or row actions yet. One body cell subscribes to its
 * own field's channel, so a record update re-renders only the cells whose
 * values actually changed, and it installs the cell scope its column's own
 * renderer reads.
 *
 * Memoised: without it the claim above would hold for the channel and be
 * undone by the row, which would re-render every cell it has whenever it
 * rendered at all.
 *
 * @implements ds:apps.subcomponent.data_table-body_cell
 */
export default memo(BodyCell) as typeof BodyCell;
