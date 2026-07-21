/**
 * The table's STRUCTURE is its accessibility, so the structure is what this
 * suite asserts: a real `<table>` with a `<caption>`, `<th scope="col">`
 * for every column and `<th scope="row">` for the job cell, one data row
 * per model job, and the story surfaced as secondary text right in the
 * primary surface. The INTERACTION teeth — that a header click reorders the
 * rendered rows and a group control re-buckets them — live in
 * `journeyTableInteraction.tests.tsx`; this file pins the shape.
 */

import { createStaticRouter } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { appRoutes, middleware, notFoundRoute } from "../../../../routes.js";
import { JOURNEY_MODEL } from "../__fixtures__/journeyModel.js";
import {
  buildJourneyRows,
  DEFAULT_TABLE_STATE,
  type JourneyTableState,
} from "../journeyTableModel.js";
import JourneyTable from "./JourneyTable.js";

/** The job detail the explorer projects from the query, matched to the
 * fixture model: one job carries a story so the secondary-text path is
 * exercised. */
const JOB_DETAIL = {
  "sem://design-system-docs#job.l3": {
    story: "A reader browses the component catalogue.",
    acceptances: ["Every component is listed."],
    roles: ["sem://design-system-docs#role.writer"],
  },
} as const;

const ROWS = buildJourneyRows(JOURNEY_MODEL, JOB_DETAIL);

const renderTable = (
  state: JourneyTableState = DEFAULT_TABLE_STATE,
): { onStateChange: ReturnType<typeof vi.fn> } => {
  const onStateChange = vi.fn();
  const tree: ReactElement = (
    <RouterProvider
      router={createStaticRouter(appRoutes, "/journeys", {
        middleware: [...middleware],
        notFound: notFoundRoute,
      })}
    >
      <JourneyTable
        expanded={new Set<string>()}
        job={undefined}
        onStateChange={onStateChange}
        onToggleExpanded={() => {}}
        rows={ROWS}
        state={state}
      />
    </RouterProvider>
  );
  render(tree);
  return { onStateChange };
};

describe("JourneyTable", () => {
  it("is a real table with a caption stating its live counts", () => {
    renderTable();
    const table = screen.getByRole("table");
    const caption = within(table).getByText(/Every job in the demand model/);
    // Three jobs in the fixture, one of them served by nothing.
    expect(caption).toHaveTextContent(`${ROWS.length} jobs, 1 unserved`);
  });

  it("has a scope=col header for every sortable column plus the expander", () => {
    renderTable();
    for (const label of [
      "Job",
      "Coordinate",
      "Role",
      "Fluency",
      "Pairings",
      "Surface",
      "State",
    ]) {
      const header = screen.getByRole("columnheader", {
        name: new RegExp(label),
      });
      expect(header).toHaveAttribute("scope", "col");
    }
    // The expander column is named for screen readers, hidden visually.
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("renders one data row per job, each headed by a scope=row job cell", () => {
    renderTable();
    // The job is the row's header cell, not a plain <td>.
    for (const name of ["job.l3", "job.orphan", "job.b2"]) {
      const cell = screen.getByRole("rowheader", { name: new RegExp(name) });
      expect(cell).toHaveAttribute("scope", "row");
    }
  });

  it("surfaces the job's story as secondary text in the primary surface", () => {
    renderTable();
    // The story appears in the row's secondary text AND (hidden until
    // expanded) in the detail blockquote — both are always in the DOM.
    const [secondary] = screen.getAllByText(
      "A reader browses the component catalogue.",
    );
    expect(secondary).toHaveClass("journey-table-story");
  });

  it("names the unserved job's state rather than leaving it blank", () => {
    renderTable();
    // job.orphan is served by nothing; the state cell says so.
    expect(screen.getAllByText("Unserved").length).toBeGreaterThan(0);
  });

  it("marks the ACTIVE column with aria-sort and no other", () => {
    renderTable();
    const active = screen.getByRole("columnheader", { name: /Job/ });
    expect(active).toHaveAttribute("aria-sort", "ascending");
    const inactive = screen.getByRole("columnheader", { name: /Coordinate/ });
    expect(inactive).toHaveAttribute("aria-sort", "none");
  });
});
