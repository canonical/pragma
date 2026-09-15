/**
 * Regression: unchecking a server-owned option that is listed only because
 * the set holds it hands focus to the filters, though other options stay.
 *
 * Before the fix, focus was handed on only once the set was emptied with
 * nothing else to list. An option the latest facet did not list — held by a
 * link, while no record matching the other restrictions held it — left the
 * control with its checkbox when unchecked, while the facet's own options
 * stayed, and focus fell to the page. It now goes to the filters' group.
 */

import {
  createCollection,
  createDataViewsProvider,
  createPage,
  DEFAULT_WINDOW,
  declareCapabilities,
  EMPTY_SLICE,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Placed = { readonly id: string };

const places = createCollection({
  identify: (row: Placed) => row.id,
  fields: [{ field: "region", kind: "choices" }],
});

describe("regression 0046 — held server-owned option left with focus inside", () => {
  it.each<[readonly string[], readonly string[]]>([
    [["ap"], []],
    [["eu", "ap"], ["eu"]],
  ])(
    "hands focus to the filters when %o loses ap, which no facet lists",
    (held, kept) => {
      const manual = createManualSource<Placed>({
        capabilities: declareCapabilities(places, {
          filter: { region: true },
          facets: ["region"],
        }),
        answer: () =>
          createPage({
            rows: [],
            facets: {
              region: {
                kind: "values",
                values: [{ value: "eu", count: { kind: "exact", value: 1 } }],
              },
            },
          }),
      });
      const provider = createDataViewsProvider({
        collection: places,
        source: manual.source,
        facets: ["region"],
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
              filter: [{ field: "region", operator: "isAny", operands: held }],
            },
            window: DEFAULT_WINDOW,
          },
          "adopt",
          null,
        );
      });
      const ap = screen.getByRole("checkbox", { name: "ap" });
      ap.focus();
      fireEvent.click(ap);
      expect(screen.queryByRole("checkbox", { name: "ap" })).toBeNull();
      expect(screen.getByRole("checkbox", { name: "eu" })).toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Filters" })).toHaveFocus();
      expect(readProviderHost(provider).state.get().slice.filter).toEqual(
        kept.length === 0
          ? []
          : [{ field: "region", operator: "isAny", operands: kept }],
      );
    },
  );
});
