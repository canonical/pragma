/**
 * Regression: a form's destination follows the open view as well as the
 * query.
 *
 * Before the fix, a destination followed the applied query and the
 * location, never the open view. Back from `view=x&status=failed` to
 * `status=failed` moves the view alone: the query does not move, and the
 * search form and the pagination had heard the location before the provider
 * adopted it, so their hidden fields and links kept `view=x` — a submission
 * or a click without scripts reopened the view the reader had left.
 */

import { createMemoryLocation } from "@canonical/dataviews-core";
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createStandInViewStore } from "../../../testing/createStandInStores.js";
import { createMachineProvider, machine } from "../../../testing/machines.js";
import { DataViews } from "../../lib/_work_in_progress/DataViews/index.js";

describe("regression 0026 — destinations kept a view left behind", () => {
  it("drops the view from the search form and the pagination when the location leaves it", () => {
    const location = createMemoryLocation({
      href: "/machines?view=x&status=failed&page=1&size=50",
    });
    const { provider } = createMachineProvider({
      location,
      rows: [machine("m1", "one"), machine("m2", "two")],
      // The listing still loading: nothing yet says whether the view exists.
      views: createStandInViewStore({ list: () => new Promise(() => {}) }),
    });
    const { container } = render(
      <DataViews provider={provider}>
        <DataViews.Search label="Search machines" />
        <DataViews.Pagination />
      </DataViews>,
    );
    // The search form's hidden view field: any outside the pagination.
    const querySearchView = () =>
      [...container.querySelectorAll('input[type="hidden"][name="view"]')].find(
        (input) => input.closest("nav") === null,
      ) ?? null;
    const queryPaginationView = () =>
      container
        .querySelector("nav")
        ?.querySelector('input[name="view"], a[href*="view=x"]') ?? null;
    expect(querySearchView()).not.toBeNull();
    expect(queryPaginationView()).not.toBeNull();

    act(() => {
      location.write(new URLSearchParams("status=failed&page=1&size=50"));
    });

    expect(querySearchView()).toBeNull();
    expect(queryPaginationView()).toBeNull();
  });
});
