/**
 * Regression: clearing undeclared text keeps focus on a control.
 *
 * Before the fix, text a source does not declare `contains` on was shown
 * only while it stood, for removal, so clearing it unmounted the whole
 * control — the input and its clear button together — and focus fell to the
 * document. Focus now moves to the filters' group.
 */

import {
  createCollection,
  createDataViewsProvider,
  DEFAULT_WINDOW,
  declareCapabilities,
  EMPTY_SLICE,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Row = { readonly id: string; readonly name: string };

const collection = createCollection({
  identify: (row: Row) => row.id,
  fields: [{ field: "name", kind: "text" }],
});

describe("regression 0029 — clearing undeclared text dropped focus", () => {
  it("moves focus to the filters' group when the control leaves", () => {
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource<Row>({
        capabilities: declareCapabilities(collection, {}),
      }).source,
    });
    render(
      <DataViews provider={provider}>
        <DataViews.Filters />
      </DataViews>,
    );
    act(() => {
      readProviderHost(provider).adopt(
        {
          slice: {
            ...EMPTY_SLICE,
            filter: [
              { field: "name", operator: "contains", operands: ["web"] },
            ],
          },
          window: DEFAULT_WINDOW,
        },
        "adopt",
        null,
      );
    });
    const clear = screen.getByRole("button", { name: "Clear name contains" });
    clear.focus();
    fireEvent.click(clear);
    expect(screen.queryByLabelText("name contains")).toBeNull();
    expect(screen.getByRole("group", { name: "Filters" })).toHaveFocus();
  });
});
