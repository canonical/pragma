/**
 * Regression: rows an earlier query produced are reported stale, and a
 * sort the source never declared is never offered.
 *
 * Before the fix, one click on a sortable header whose field the source
 * had not declared put a refused term in the query for good; the table
 * kept rendering the last rows that worked while reporting them ready, so
 * nothing told the reader those rows no longer answered what they asked.
 *
 * The staleness is driven here through a request the source fails rather
 * than one it refuses: a refused ordering is never offered now, and the
 * table's reading of a result that no longer answers the query is the same
 * for both — the rows stay, and the status row says why they are stale.
 */

import { declareCapabilities } from "@canonical/dataviews-core";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { pageOf } from "../../../testing/fixtures.js";
import {
  createMachineProvider,
  machine,
  machines,
} from "../../../testing/machines.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";

const columns = [
  { id: "name", header: "Name", sortable: true },
  { id: "status", header: "Status", sortable: true },
] as const;

/** A source that orders by `name` alone, answered by hand. */
const sortableByName = () =>
  createMachineProvider({
    capabilities: declareCapabilities(machines, {
      sort: { fields: ["name"], terms: 1 },
    }),
  });

afterEach(cleanup);

describe("regression 0002 — stale rows reported ready", () => {
  it("keeps the rows in view and says they are stale, and why", () => {
    const { provider, source } = sortableByName();
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );
    act(() => {
      source.latest().deliver({
        status: "succeeded",
        page: pageOf([machine("m-1", "alpha")]),
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    // The ordering issued a second request, which the source fails.
    expect(source.calls).toHaveLength(2);
    act(() => {
      source.latest().deliver({
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
      within(table).getByRole("cell", { name: "alpha" }),
    ).toBeInTheDocument();
  });

  it("offers sorting only on the fields the source declares", () => {
    const { provider } = sortableByName();
    render(
      <DataTable provider={provider} columns={columns} label="Machines" />,
    );
    expect(screen.getByRole("button", { name: "Name" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Status" })).toBeNull();
  });
});
