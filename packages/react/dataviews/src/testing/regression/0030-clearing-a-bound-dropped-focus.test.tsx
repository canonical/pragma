/**
 * Regression: clearing a number or date bound keeps focus on a control.
 *
 * Before the fix, the clear control was shown only while a bound was applied,
 * so pressing it removed the control that had focus, and focus fell to the
 * document; an undeclared bound, shown only for removal, unmounted its whole
 * control. Focus now moves to the input the bound was cleared from while the
 * source declares it, and otherwise to the filters' group.
 */

import {
  createCollection,
  createDataViewsProvider,
  DEFAULT_WINDOW,
  declareCapabilities,
  EMPTY_SLICE,
  type SourceCapabilities,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Row = { readonly id: string; readonly cores: number };

const collection = createCollection({
  identify: (row: Row) => row.id,
  fields: [{ field: "cores", kind: "number", min: 0 }],
});

/** Filters over a source declaring `capabilities`, mounted. */
const mountFilters = (capabilities: SourceCapabilities) => {
  const provider = createDataViewsProvider({
    collection,
    source: createManualSource<Row>({ capabilities }).source,
  });
  render(
    <DataViews provider={provider}>
      <DataViews.Filters />
    </DataViews>,
  );
  return provider;
};

/** Press the clear control of the lower bound, as a keyboard user would. */
const pressClear = (): void => {
  const clear = screen.getByRole("button", { name: "Clear cores from" });
  clear.focus();
  fireEvent.click(clear);
};

describe("regression 0030 — clearing a bound dropped focus", () => {
  it("moves focus to the input the declared bound was cleared from", () => {
    mountFilters(
      declareCapabilities(collection, { filter: { cores: ["gte", "lte"] } }),
    );
    const input = screen.getByLabelText("cores from");
    fireEvent.change(input, { target: { value: "4" } });
    pressClear();
    expect(
      screen.queryByRole("button", { name: "Clear cores from" }),
    ).toBeNull();
    expect(input).toHaveFocus();
  });

  it("moves focus to the filters' group when an undeclared bound leaves", () => {
    const provider = mountFilters(declareCapabilities(collection, {}));
    act(() => {
      readProviderHost(provider).adopt(
        {
          slice: {
            ...EMPTY_SLICE,
            filter: [{ field: "cores", operator: "gte", operands: [4] }],
          },
          window: DEFAULT_WINDOW,
        },
        "adopt",
        null,
      );
    });
    pressClear();
    expect(screen.queryByLabelText("cores from")).toBeNull();
    expect(screen.getByRole("group", { name: "Filters" })).toHaveFocus();
  });
});
