import type { ReactElement } from "react";
import type { StatusRowProps } from "./types.js";

const componentCssClassName = "ds data-table-row status";

/**
 * The table's status row: one cell for the whole table, saying why there
 * are no rows or, above rows kept from an earlier query, why they no longer
 * answer the current one.
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
      <div
        role="cell"
        className={`ds data-table-body-cell status ${status.status}`}
      >
        {status.status === "stale" || status.status === "refresh-failed" ? (
          // A polite status message: the rows did not move, so nothing
          // else says so.
          <span role="status">{renderStatus(status)}</span>
        ) : (
          renderStatus(status)
        )}
      </div>
    </div>
  );
}
