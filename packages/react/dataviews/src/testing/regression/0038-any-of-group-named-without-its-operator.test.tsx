/**
 * Regression: the any-of group names its operator, as every other filter
 * control does.
 *
 * Before the fix, a choices field's any-of group was named by the field alone
 * — "status" — beside "status is none of", while text and bound controls
 * always carried theirs: "name contains", "cpu from". The any-of group is now
 * "status is any of".
 */

import {
  createCollection,
  createDataViewsProvider,
  createPage,
  declareCapabilities,
} from "@canonical/dataviews-core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Row = { readonly id: string };

const collection = createCollection({
  identify: (row: Row) => row.id,
  fields: [{ field: "status", kind: "choices", options: ["failed", "ready"] }],
});

/** A source filtering and faceting the status. */
const STATUS_FACETED = declareCapabilities(collection, {
  filter: { status: true },
  facets: ["status"],
});

describe("regression 0038 — any-of group named without its operator", () => {
  it("names the any-of group for its operator", () => {
    render(
      <DataViews
        provider={createDataViewsProvider({
          collection,
          source: createManualSource<Row>({
            capabilities: STATUS_FACETED,
            answer: () =>
              createPage({
                rows: [],
                facets: { status: { kind: "values", values: [] } },
              }),
          }).source,
          facets: ["status"],
        })}
      >
        <DataViews.Filters />
      </DataViews>,
    );
    expect(
      screen.getByRole("group", { name: "status is any of" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "status" })).toBeNull();
  });
});
