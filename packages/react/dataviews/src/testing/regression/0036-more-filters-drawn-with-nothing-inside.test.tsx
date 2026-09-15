/**
 * Regression: "More filters" is not drawn with nothing to disclose.
 *
 * Before the fix, a field counted as having a control whenever its source
 * declared a filter, so a choice whose options are the server's — which
 * draws nothing while no facet lists them — opened onto an empty disclosure
 * before the first page, or while a request was pending.
 */

import {
  createCollection,
  createDataViewsProvider,
  declareCapabilities,
} from "@canonical/dataviews-core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Placed = { readonly id: string };

const places = createCollection({
  identify: (row: Placed) => row.id,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "ready"] },
    { field: "region", kind: "choices" },
  ],
});

describe("regression 0036 — More filters drawn with nothing inside", () => {
  it("draws no disclosure while nothing lists the server's options", () => {
    const provider = createDataViewsProvider({
      collection: places,
      source: createManualSource<Placed>({
        capabilities: declareCapabilities(places, {
          filter: { status: true, region: true },
          facets: ["region"],
        }),
      }).source,
      // Asked for, and not yet answered: nothing lists the options.
      facets: ["region"],
    });
    const { container } = render(
      <DataViews provider={provider}>
        <DataViews.Filters primary={["status"]} />
      </DataViews>,
    );
    expect(container.querySelector("details")).toBeNull();
    expect(
      screen.getByRole("group", { name: "status is any of" }),
    ).toBeVisible();
  });
});
