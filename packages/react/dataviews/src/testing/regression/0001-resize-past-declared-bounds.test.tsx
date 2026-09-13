/**
 * Regression: a resize is held to the declared bounds every time, and the
 * table's trailing edge carries no resize control.
 *
 * Before the fix, a resize committed a fixed-width override and every
 * later resize was clamped against that override rather than the declared
 * sizing, so a second arrow key could take a column past its maximum; and
 * the last column carried a control on the table's own edge, with nothing
 * beyond it to trade width with.
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
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { deliverRows } from "../../../testing/fixtures.js";
import { DataTable } from "../../lib/_work_in_progress/DataTable/index.js";

const schema = createSchema([
  { field: "name", kind: "text" },
  { field: "status", kind: "choices", options: ["running"] },
]);
type Machine = { readonly id: string; readonly name: string };

afterEach(cleanup);

/** A table over one loaded row, with the given columns. */
const mountTable = (columns: Parameters<typeof DataTable>[0]["columns"]) => {
  const provider = createDataViewsProvider<typeof schema.fields, Machine>({
    schema,
    capabilities: declareCapabilities(schema, {}),
  });
  render(<DataTable provider={provider} columns={columns} label="Machines" />);
  const requestId = provider.refresh();
  if (requestId === null) {
    throw new Error("expected a refresh request");
  }
  act(() => {
    provider.complete(requestId, deliverRows([{ id: "m-1", name: "alpha" }]));
  });
  return provider;
};

describe("regression 0001 — a resize past the declared bounds", () => {
  it("stops a second step at the declared maximum, after an override", () => {
    mountTable([
      {
        id: "name",
        header: "Name",
        resizable: true,
        sizing: { kind: "flex", weight: 1, minPx: 50, maxPx: 80 },
      },
      { id: "status", header: "Status" },
    ]);
    const handle = screen.getByRole("separator");
    const tracks = (): string =>
      screen
        .getByRole("table", { name: "Machines" })
        .style.getPropertyValue("--data-table-columns");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(tracks()).toBe("80px 96px");
    expect(handle).toHaveAttribute("aria-valuenow", "80");
  });

  it("offers no resize control on the last column", () => {
    mountTable([
      { id: "name", header: "Name", resizable: true },
      { id: "status", header: "Status", resizable: true },
    ]);
    expect(screen.getAllByRole("separator")).toHaveLength(1);
    expect(screen.getByRole("separator")).toHaveAccessibleName("Name");
  });
});
