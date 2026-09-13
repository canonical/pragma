/**
 * The connected pagination part: the pagination bar, bound to the enclosing
 * root's provider. The bar's own behaviour is pinned beside it; this pins the
 * binding.
 */
import { createPage, DEFAULT_WINDOW } from "@canonical/dataviews-core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createMachineProvider,
  machine,
} from "../../../../../../testing/machines.js";
import DataViews from "../../Provider.js";
import Pagination from "./Pagination.js";

const firstOfTwo = { ...DEFAULT_WINDOW, page: 1, size: 2 };

describe("DataViews.Pagination", () => {
  it("is reachable as the composition's Pagination part", () => {
    expect(DataViews.Pagination).toBe(Pagination);
  });

  it("fails clearly outside a DataViews root", () => {
    expect(() => render(<Pagination />)).toThrow(
      "DataViews.Pagination must be used inside a DataViews root",
    );
  });

  it("pages the root's provider and takes the bar's props", () => {
    const { provider, source } = createMachineProvider({
      seed: { window: firstOfTwo },
    });
    render(
      <DataViews provider={provider}>
        <Pagination label="Machines pagination" className="footer" />
      </DataViews>,
    );
    // The root observed the provider, which asked for the seeded window.
    expect(source.latest().request.window).toEqual(firstOfTwo);
    act(() => {
      source.latest().deliver({
        status: "succeeded",
        page: createPage({
          rows: [machine("m1", "alpha"), machine("m2", "beta")],
          matched: 5,
          total: 5,
        }),
      });
    });
    const nav = screen.getByRole("navigation", { name: "Machines pagination" });
    expect(nav).toHaveClass("ds", "data-table-pagination-bar", "footer");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing 1–2 out of 5 items",
    );
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(provider.state.get().window).toEqual({
      ...firstOfTwo,
      page: 2,
    });
    // The bar inside the root observes too; one run answers both.
    expect(source.latest().request.window).toEqual({ ...firstOfTwo, page: 2 });
    expect(source.calls).toHaveLength(2);
  });
});
