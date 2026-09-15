/**
 * Regression: a restriction on a field its source declares no filter for
 * shows while "More filters" is open.
 *
 * Before the fix, while the disclosure was open a field was placed outside
 * only if it had been shown when the disclosure opened, and inside only if
 * the source declared a filter for it. A restriction arriving on an
 * undeclared field — from Back, a saved view, a link — was placed nowhere:
 * invisible, and not removable, until the disclosure closed.
 */

import {
  createCollection,
  createDataViewsProvider,
  DEFAULT_WINDOW,
  declareCapabilities,
  EMPTY_SLICE,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import toggleDisclosure from "../../../testing/toggleDisclosure.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Row = { readonly id: string };

const collection = createCollection({
  identify: (row: Row) => row.id,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "ready"] },
    { field: "cpu", kind: "number" },
    { field: "spare", kind: "flag" },
  ],
});

/** Filtering status and cpu, and declaring nothing over spare. */
const STATUS_AND_CPU = declareCapabilities(collection, {
  filter: { status: true, cpu: true },
});

describe("regression 0034 — undeclared restriction hidden while More filters open", () => {
  it("shows the restriction's control inside the open disclosure", async () => {
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource<Row>({ capabilities: STATUS_AND_CPU }).source,
    });
    const { container } = render(
      <DataViews provider={provider}>
        <DataViews.Filters primary={["status"]} />
      </DataViews>,
    );
    await toggleDisclosure(container, true);
    act(() => {
      readProviderHost(provider).adopt(
        {
          slice: {
            ...EMPTY_SLICE,
            filter: [{ field: "spare", operator: "isSet", operands: [] }],
          },
          window: DEFAULT_WINDOW,
        },
        "adopt",
        null,
      );
    });
    expect(screen.getByRole("checkbox", { name: "spare" })).toBeVisible();
  });
});
