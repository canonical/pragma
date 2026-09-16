import { DISPLAY_STATUS_PHASES } from "@canonical/dataviews-core/bindings";
import type { ReactElement } from "react";
import type { StatusItemProps } from "./types.js";

const componentCssClassName = "status";

/**
 * A renderer's status: why there is nothing to draw or, above what is kept
 * in view, what stands over it. It carries the status as `data-status`, the
 * attribute a renderer's own stylesheet selects it by. A settled outcome is
 * a polite status message — nothing on screen moves when what is drawn is
 * kept, so nothing else would say so — and a passing state is silent. The same policy the table's status row follows,
 * for the cards and the charts.
 */
export default function StatusItem({
  status,
  renderStatus,
}: StatusItemProps): ReactElement {
  return (
    <div className={componentCssClassName} data-status={status.status}>
      {DISPLAY_STATUS_PHASES[status.status] === "terminal" ? (
        <span role="status">{renderStatus(status)}</span>
      ) : (
        renderStatus(status)
      )}
    </div>
  );
}
