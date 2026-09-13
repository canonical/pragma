/**
 * Regression: rows an earlier query produced are reported stale, and a
 * sort the source never declared is never offered.
 *
 * Before the fix, one click on a sortable header whose field the source
 * had not declared put a refused term in the query for good; the table
 * kept rendering the last rows that worked while reporting them ready, so
 * nothing told the reader those rows no longer answered what they asked.
 *
 * The staleness is driven here through a request that fails rather than
 * one that is refused: refusal needs a bound source, and the table's
 * reading of a result that no longer answers the query is the same for
 * both — the rows stay, and the status row says why they are stale.
 */

import {
  createDataViewsProvider,
  createSchema,
  declareCapabilities,
} from "@canonical/dataviews-core";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { deliverRows } from "../../../testing/fixtures.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";

const schema = createSchema([
  { field: "name", kind: "text" },
  { field: "status", kind: "choices", options: ["running"] },
]);
type Machine = { readonly id: string; readonly name: string };

const columns = [
  { id: "name", header: "Name", sortable: true },
  { id: "status", header: "Status", sortable: true },
] as const;

afterEach(cleanup);

describe("regression 0002 — stale rows reported ready", () => {
  it("keeps the rows in view and says they are stale, and why", () => {
    const provider = createDataViewsProvider<typeof schema.fields, Machine>({
      schema,
      capabilities: declareCapabilities(schema, {
        sort: { fields: ["name"], terms: 1 },
      }),
    });
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );
    const first = provider.refresh();
    if (first === null) {
      throw new Error("expected a refresh request");
    }
    act(() => {
      provider.complete(first, deliverRows([{ id: "m-1", name: "alpha" }]));
    });
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    const second = provider.state.get().pendingRequestId;
    if (second === null) {
      throw new Error("expected the sort to issue a request");
    }
    act(() => {
      provider.complete(second, {
        status: "failed",
        failure: {
          reason: "the inventory is unreachable",
          cause: null,
          transient: null,
        },
      });
    });
    const table = screen.getByRole("table", { name: "Machines" });
    expect(within(table).getByRole("status")).toHaveTextContent(
      "These rows do not match the current query: the inventory is unreachable",
    );
    expect(
      within(table)
        .getAllByRole("row")
        .map((row) => row.textContent),
    ).toContain("alpha");
  });

  it("offers sorting only on the fields the source declares", () => {
    const provider = createDataViewsProvider<typeof schema.fields, Machine>({
      schema,
      capabilities: declareCapabilities(schema, {
        sort: { fields: ["name"], terms: 1 },
      }),
    });
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );
    expect(screen.getByRole("button", { name: "Name" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Status" })).toBeNull();
  });
});
