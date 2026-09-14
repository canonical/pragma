/**
 * Regression: clearing text keeps focus on a control.
 *
 * Before the fix, the clear control was shown only while text was applied,
 * so pressing it removed the control that had focus, and focus fell to the
 * document: a keyboard user who cleared the text was sent back to the top of
 * the page. Focus now moves to the input the text was cleared from.
 */

import {
  createCollection,
  createDataViewsProvider,
  declareCapabilities,
} from "@canonical/dataviews-core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Row = { readonly id: string; readonly name: string };

const collection = createCollection({
  identify: (row: Row) => row.id,
  fields: [{ field: "name", kind: "text" }],
});

describe("regression 0028 — clearing text dropped focus", () => {
  it("moves focus to the input the text was cleared from", () => {
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource<Row>({
        capabilities: declareCapabilities(collection, {
          filter: { name: ["contains"] },
        }),
      }).source,
    });
    render(
      <DataViews provider={provider}>
        <DataViews.Filters />
      </DataViews>,
    );
    const input = screen.getByLabelText("name contains");
    fireEvent.change(input, { target: { value: "web" } });
    const clear = screen.getByRole("button", { name: "Clear name contains" });
    clear.focus();
    fireEvent.click(clear);
    expect(
      screen.queryByRole("button", { name: "Clear name contains" }),
    ).toBeNull();
    expect(input).toHaveFocus();
  });
});
