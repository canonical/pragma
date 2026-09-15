/**
 * Regression: the More filters disclosure, opened before scripts take over,
 * holds its controls in place once they do.
 *
 * Before the fix, the disclosure's placement was pinned only when React heard
 * it toggle. A reader who opened it while the page loaded — it needs no
 * script — was left with it open and no pin, so checking a control inside
 * restricted its field, moved the control out of the open disclosure, and
 * dropped focus to the page. An open disclosure with no pin is now pinned
 * once the filters hydrate, as its opening would have pinned it, and the open
 * state the reader chose is not reported as a hydration mismatch.
 */

import {
  createCollection,
  createDataViewsProvider,
  createMemoryLocation,
  declareCapabilities,
} from "@canonical/dataviews-core";
import { act, fireEvent, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import toggleDisclosure from "../../../testing/toggleDisclosure.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Row = { readonly id: string };

const collection = createCollection({
  identify: (row: Row) => row.id,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "ready"] },
    { field: "owner", kind: "flag" },
  ],
});

const capabilities = declareCapabilities(collection, {
  filter: { status: true, owner: true },
});

/** The filters marking status primary, as a server and a client build them. */
const buildFilters = () => (
  <DataViews
    provider={createDataViewsProvider({
      collection,
      source: createManualSource<Row>({ capabilities }).source,
      location: createMemoryLocation({ href: "/machines" }),
    })}
  >
    <DataViews.Filters primary={["status"]} />
  </DataViews>
);

describe("regression 0049 — More filters opened before hydration left unpinned", () => {
  it("keeps a control checked inside where it is, with its focus", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(buildFilters());
    document.body.append(container);
    onTestFinished(() => {
      container.remove();
    });
    const details = container.querySelector("details");
    if (details === null) {
      throw new Error("the server rendered no More filters disclosure");
    }
    // Opened while the page loads: its toggle passes with nothing listening.
    await toggleDisclosure(container, true);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => {
      errors.mockRestore();
    });
    const root = await act(async () => hydrateRoot(container, buildFilters()));
    onTestFinished(() => {
      act(() => {
        root.unmount();
      });
    });
    // The open state a reader chose is not reported as a mismatch.
    expect(errors.mock.calls).toEqual([]);
    const owner = within(container).getByRole("checkbox", { name: "owner" });
    owner.focus();
    fireEvent.click(owner);
    const checked = within(container).getByRole("checkbox", { name: "owner" });
    expect(checked).toBeChecked();
    expect(container.querySelector("details")).toContainElement(checked);
    expect(checked).toHaveFocus();
  });
});
