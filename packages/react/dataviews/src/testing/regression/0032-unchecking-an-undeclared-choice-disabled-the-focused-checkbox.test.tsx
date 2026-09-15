/**
 * Regression: unchecking one of several undeclared choices keeps focus on a
 * control.
 *
 * Before the fix, an undeclared set may only shrink, so unchecking one of
 * its options disabled that option's checkbox while it had focus. A browser
 * moves focus off a disabled control, to the document, so a keyboard user
 * who removed one choice was sent back to the top of the page. Focus now
 * moves to the filters' group.
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

type Row = { readonly id: string; readonly status: string };

const collection = createCollection({
  identify: (row: Row) => row.id,
  fields: [{ field: "status", kind: "choices", options: ["ready", "failed"] }],
});

describe("regression 0032 — unchecking an undeclared choice disabled the focused checkbox", () => {
  it("moves focus to the filters' group when the checkbox it leaves is disabled", () => {
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
              {
                field: "status",
                operator: "isAny",
                operands: ["ready", "failed"],
              },
            ],
          },
          window: DEFAULT_WINDOW,
        },
        "adopt",
        null,
      );
    });
    const failed = screen.getByRole("checkbox", { name: "failed" });
    failed.focus();
    fireEvent.click(failed);
    expect(failed).toBeDisabled();
    expect(screen.getByRole("group", { name: "Filters" })).toHaveFocus();
  });
});
