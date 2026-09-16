/**
 * Regression: the page size select is named without a colon.
 *
 * Before the fix the bar's label was "Items per page:", so a screen reader
 * read the colon as part of the control's name, and the bar counted items
 * where the table counts rows.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMachineProvider } from "../../../testing/machines.js";
import { PaginationBar } from "../../lib/_work_in_progress/PaginationBar/index.js";

describe("regression 0060 — a colon was read into the page size name", () => {
  it("names the page size select by its words alone", () => {
    const { provider } = createMachineProvider();
    render(<PaginationBar provider={provider} />);
    const size = screen.getByRole<HTMLSelectElement>("combobox", {
      name: "Rows per page",
    });
    expect(size).toHaveAccessibleName("Rows per page");
    // The label's own words: what a reader hears is the name above, and a
    // colon anywhere else in the bar is not this case's business.
    expect(size.labels?.[0]?.textContent ?? "").not.toContain(":");
  });
});
