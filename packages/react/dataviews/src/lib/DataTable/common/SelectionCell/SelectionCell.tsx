import { CheckboxInput } from "@canonical/react-ds-global-form";
import type { ReactElement } from "react";
import useDataViewsValue from "../../../DataViews/hooks/useDataViewsValue.js";
import type { SelectionCellProps } from "./types.js";

const componentCssClassName = "ds data-table-body-cell selection";

/**
 * One row's selection checkbox: the design system's checkbox backed by the
 * provider's selection, named after the record rather than its position.
 */
export default function SelectionCell<TRow extends object>({
  provider,
  scope,
  selected,
  rowLabel,
}: SelectionCellProps<TRow>): ReactElement {
  const record = useDataViewsValue(scope.row);
  return (
    // biome-ignore lint/a11y/useSemanticElements: <td> is only valid inside a <table>, and this grid is deliberately not one
    <div role="cell" className={componentCssClassName}>
      <CheckboxInput
        checked={selected}
        aria-label={`Select ${rowLabel(record, scope.id)}`}
        onChange={() => {
          provider.selection.toggle(scope.id);
        }}
      />
    </div>
  );
}
