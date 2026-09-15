/**
 * Regression: marking another field primary while "More filters" is open
 * places its control once.
 *
 * Before the fix, the placement pinned when the disclosure opened outlived a
 * change of the marks: a newly marked field was drawn among the primary
 * controls and again inside the disclosure, so a GET submission sent its
 * bound twice, which the decoder refuses. A pin now holds only under the
 * marks it was placed under, and a marked field is never inside.
 */

import {
  createCollection,
  createDataViewsProvider,
  declareCapabilities,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

describe("regression 0035 — changing primary while open duplicated a control", () => {
  it("draws a newly marked field's control once", async () => {
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource<Row>({ capabilities: STATUS_AND_CPU }).source,
    });
    const { container, rerender } = render(
      <DataViews provider={provider}>
        <DataViews.Filters primary={["status"]} />
      </DataViews>,
    );
    await toggleDisclosure(container, true);
    rerender(
      <DataViews provider={provider}>
        <DataViews.Filters primary={["status", "cpu"]} />
      </DataViews>,
    );
    expect(screen.getAllByLabelText("cpu from")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("cpu from"), {
      target: { value: "4" },
    });
    expect(screen.getAllByLabelText("cpu from")).toHaveLength(1);
    expect(readProviderHost(provider).state.get().slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
  });
});
