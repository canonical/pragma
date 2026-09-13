import { DISPLAY_STATUS_PHASES } from "@canonical/dataviews-core/bindings";
import type { ReactElement } from "react";
import type { StatusRowProps } from "./types.js";

const componentCssClassName = "ds data-table-row status";

/** The one cell of the status row shares the body cell's box. */
const cellCssClassName = "ds data-table-body-cell status";

/**
 * The table's status row: one cell for the whole table, saying why there
 * are no rows or, above rows kept in view, what stands over them. The cell
 * carries the status as `data-status`, which the stylesheet reads. A
 * settled outcome is a polite status message — nothing on screen moves
 * when rows are kept, so nothing else would say so — and a passing state
 * is silent.
 */
export default function StatusRow({
  status,
  renderStatus,
  position,
  ref,
}: StatusRowProps): ReactElement {
  return (
    // biome-ignore lint/a11y/useSemanticElements: <tr> is only valid inside a <table>, and this grid is deliberately not one
    // biome-ignore lint/a11y/useFocusableInteractive: the row is structure, not a widget — the focusable controls live in its cells
    <div
      ref={ref}
      role="row"
      className={componentCssClassName}
      aria-rowindex={position}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: <td> is only valid inside a <table>, and this grid is deliberately not one */}
      <div role="cell" className={cellCssClassName} data-status={status.status}>
        {DISPLAY_STATUS_PHASES[status.status] === "terminal" ? (
          <span role="status">{renderStatus(status)}</span>
        ) : (
          renderStatus(status)
        )}
      </div>
    </div>
  );
}
