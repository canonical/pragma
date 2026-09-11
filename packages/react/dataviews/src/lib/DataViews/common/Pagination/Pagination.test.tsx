/**
 * The connected pagination part: the pagination bar, bound to the enclosing
 * root's provider. The bar's own behaviour is pinned beside it; this pins the
 * binding.
 */
import type { DataViewsProvider } from "@canonical/dataviews-core";
import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DataViews from "../../Provider.js";
import Pagination from "./Pagination.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "ready"] },
]);

type Fields = typeof schema.fields;

const makeProvider = (): DataViewsProvider<Fields> =>
  createDataViewsProvider<Fields>({ schema, window: { page: 1, size: 2 } });

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
    const provider = makeProvider();
    render(
      <DataViews provider={provider}>
        <Pagination label="Machines pagination" className="footer" />
      </DataViews>,
    );
    const requestId = provider.refresh();
    if (requestId === null) {
      throw new Error("expected a refresh request");
    }
    act(() => {
      provider.complete(requestId, {
        status: "success",
        rows: [{ id: "m1" }, { id: "m2" }],
        count: 5,
      });
    });
    const nav = screen.getByRole("navigation", { name: "Machines pagination" });
    expect(nav).toHaveClass("ds", "data-table-pagination-bar", "footer");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing 1–2 out of 5 items",
    );
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(provider.result.get().window).toEqual({ page: 2, size: 2 });
  });
});
