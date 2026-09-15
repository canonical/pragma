/**
 * Hiding a column keeps the ordering: a sorted column hidden from the table's
 * settings still orders the rows and still shows its term in the sort panel,
 * the query and its requests are what they were, and exactly one heading —
 * the first term's, where it is shown — carries `aria-sort`, and none while
 * that column is hidden.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it } from "vitest";
import {
  createMachineProvider,
  declareMachineOrdering,
  machine,
} from "../../../testing/machines.js";
import type { DataTableColumn } from "../../lib/_work_in_progress/DataTable/index.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name", sortable: true },
  { id: "status", header: "Status", sortable: true },
  { id: "cores", header: "Cores", sortable: true },
];

/** Choose one item from the table's settings menu. */
const choose = (name: string): void => {
  fireEvent.click(screen.getByRole("button", { name: "Table settings" }));
  fireEvent.click(screen.getByRole("menuitem", { name }));
};

/** The headings carrying `aria-sort`, with the value each carries. */
const listClaims = (): readonly (readonly [string | null, string | null])[] =>
  [...document.querySelectorAll("[role='columnheader'][aria-sort]")].map(
    (header) => [
      header.querySelector(".label")?.textContent ?? null,
      header.getAttribute("aria-sort"),
    ],
  );

/** The terms the sort panel lists, as it states each. */
const listTerms = (): readonly (string | null)[] =>
  [
    ...screen
      .getByRole("region", { name: "Sort" })
      .querySelectorAll("li > span"),
  ].map((term) => term.textContent);

describe("hidden columns keep the ordering", () => {
  it("keeps the query, its requests, the sort panel's terms and one aria-sort as sorted columns are hidden and shown", () => {
    const { provider, source } = createMachineProvider({
      rows: [machine("m-1", "alpha")],
      capabilities: declareMachineOrdering(null),
    });
    render(
      <DataViews provider={provider}>
        <DataViews.SortPanel />
        <DataViews.DataTable
          columns={columns}
          label="Machines"
          settings={<DataViews.Settings />}
        />
      </DataViews>,
    );
    act(() => {
      provider.setSort([
        { field: "status", direction: "desc" },
        { field: "cores", direction: "asc" },
      ]);
    });
    const sort = provider.state.get().slice.sort;
    const requests = source.calls.length;
    expect(listClaims()).toEqual([["Status", "descending"]]);

    // The second term's column hidden: the first term's heading still claims.
    choose("Hide Cores");
    expect(listClaims()).toEqual([["Status", "descending"]]);

    // The first term's column hidden: no heading claims, and no later term's
    // column takes the claim over.
    choose("Hide Status");
    choose("Show Cores");
    expect(listClaims()).toEqual([]);
    expect(listTerms()).toEqual(["status, descending", "cores, ascending"]);

    // Moved and shown again, it claims from wherever it now stands.
    choose("Show Status");
    choose("Move Status left");
    expect(listClaims()).toEqual([["Status", "descending"]]);

    // Nothing of it reached the query or the source.
    expect(provider.state.get().slice.sort).toBe(sort);
    expect(source.calls).toHaveLength(requests);
  });
});
