/**
 * Regression: a declared option's count is the count of the value it is.
 *
 * Before the fix, the counts were keyed by each value's text, so a facet
 * counting the number 42 and the text "42" apart — as it must, since a set
 * matches an option by type — showed whichever came last beside option 42.
 * With one record holding 42 and two holding "42", the option read 2, and
 * checking it matched 1. A declared option is now counted only from the
 * value it is.
 */

import {
  createArraySource,
  createCollection,
  createDataViewsProvider,
} from "@canonical/dataviews-core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

type Tagged = { readonly id: string; readonly tag: unknown };

const tagged = createCollection({
  identify: (row: Tagged) => row.id,
  fields: [{ field: "tag", kind: "choices", options: [42, 7] }],
});

describe("regression 0047 — declared option counted from its text", () => {
  it("counts option 42 from the records holding the number 42 alone", () => {
    render(
      <DataViews
        provider={createDataViewsProvider({
          collection: tagged,
          source: createArraySource<Tagged>({
            rows: [
              { id: "a", tag: 42 },
              { id: "b", tag: "42" },
              { id: "c", tag: "42" },
            ],
            collection: tagged,
          }),
          facets: ["tag"],
        })}
      >
        <DataViews.Filters />
      </DataViews>,
    );
    expect(
      screen.getByRole("checkbox", { name: "42" }),
    ).toHaveAccessibleDescription("1");
    expect(
      screen.getByRole("checkbox", { name: "7" }),
    ).toHaveAccessibleDescription("0");
  });
});
