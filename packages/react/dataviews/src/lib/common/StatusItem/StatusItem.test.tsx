import type { DisplayStatus } from "@canonical/dataviews-core";
import { DISPLAY_STATUS_PHASES } from "@canonical/dataviews-core/bindings";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { displayStatusOf } from "../../../../testing/fixtures.js";
import StatusItem from "./StatusItem.js";

/** The status's own name, as a test's renderer shows it. */
const spellStatus = (status: DisplayStatus): string => `said ${status.status}`;

describe("StatusItem", () => {
  it("says a settled outcome as a polite status, carrying it as data-status", () => {
    const { container } = render(
      <StatusItem
        status={{ status: "failed", reason: "offline" }}
        renderStatus={spellStatus}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("said failed");
    expect(container.firstElementChild).toHaveAttribute(
      "data-status",
      "failed",
    );
  });

  it("shows a passing state silently", () => {
    const { container } = render(
      <StatusItem status={{ status: "pending" }} renderStatus={spellStatus} />,
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(container.firstElementChild).toHaveTextContent("said pending");
    expect(container.firstElementChild).toHaveAttribute(
      "data-status",
      "pending",
    );
  });

  it("speaks for every terminal status the core names, and for no transient one", () => {
    // Read from the core's own table, so a status added there is checked here
    // rather than quietly left out.
    for (const [name, phase] of Object.entries(DISPLAY_STATUS_PHASES)) {
      const status = displayStatusOf(name as DisplayStatus["status"]);
      const { unmount } = render(
        <StatusItem status={status} renderStatus={spellStatus} />,
      );
      if (phase === "terminal") {
        expect(screen.getByRole("status"), name).toHaveTextContent(
          `said ${name}`,
        );
      } else {
        expect(screen.queryByRole("status"), name).toBeNull();
      }
      unmount();
    }
  });
});
