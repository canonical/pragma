/**
 * The status row renders what the core decided and nothing else: the
 * status as `data-status`, a settled outcome as a polite status message and
 * a passing state in silence, and the logical position a virtualized table
 * reports for it.
 */
import type { DisplayStatus } from "@canonical/dataviews-core";
import { DISPLAY_STATUS_PHASES } from "@canonical/dataviews-core/bindings";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { displayStatusOf } from "../../../../../../testing/fixtures.js";
import StatusRow from "./StatusRow.js";

/** The words the table would give a status: here, the status named. */
const describeStatus = (status: DisplayStatus): string =>
  "reason" in status ? `${status.status}: ${status.reason}` : status.status;

describe("StatusRow", () => {
  it("carries the status as data-status on its one cell", () => {
    render(
      <StatusRow
        status={{ status: "stale", reason: "offline" }}
        renderStatus={describeStatus}
      />,
    );
    const cell = screen.getByRole("cell");
    expect(cell).toHaveAttribute("data-status", "stale");
    expect(cell).toHaveClass("ds", "data-table-body-cell", "status");
    expect(cell).toHaveTextContent("stale: offline");
    expect(screen.getByRole("row")).toHaveClass(
      "ds",
      "data-table-row",
      "status",
    );
  });

  it("announces every settled outcome once, and keeps every passing state silent", () => {
    // Every status the core knows, so a status added to the union is
    // classified here or fails here.
    for (const status of Object.keys(
      DISPLAY_STATUS_PHASES,
    ) as DisplayStatus["status"][]) {
      const { unmount } = render(
        <StatusRow
          status={displayStatusOf(status)}
          renderStatus={describeStatus}
        />,
      );
      const announced = screen.queryAllByRole("status");
      expect(announced, status).toHaveLength(
        DISPLAY_STATUS_PHASES[status] === "terminal" ? 1 : 0,
      );
      expect(screen.getByRole("cell"), status).toHaveTextContent(
        describeStatus(displayStatusOf(status)),
      );
      unmount();
    }
  });

  it("reports its logical position only where a virtualized table gives one", () => {
    const { rerender } = render(
      <StatusRow
        status={{ status: "pending" }}
        renderStatus={describeStatus}
      />,
    );
    expect(screen.getByRole("row")).not.toHaveAttribute("aria-rowindex");
    rerender(
      <StatusRow
        status={{ status: "pending" }}
        renderStatus={describeStatus}
        position={2}
      />,
    );
    expect(screen.getByRole("row")).toHaveAttribute("aria-rowindex", "2");
  });
});
