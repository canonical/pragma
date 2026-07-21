/**
 * THE INTERACTION TEETH — the claim the shape-only suite cannot make.
 *
 * A test that only asserts `onStateChange` fired is worthless: it passes
 * against a component that calls the callback and ignores the result. What
 * the reader actually gets from a sortable table is that the ROWS REORDER
 * and the GROUPS RE-BUCKET, and that is what this file pins — through the
 * real UI, reading the real DOM row order before and after, against a
 * stateful harness wired exactly as the explorer wires it.
 *
 * The pure-model half proves the other side of the determinism contract:
 * `compareRows` and `groupRows` are functions of their arguments alone
 * (byte-equal output for equal input, the `JSON.stringify` argument the
 * definitions lens's `decorateGraph.tests` makes), and the DEFAULT
 * arrangement is applied by that same pure comparator — so the server's
 * first paint and the client's first render cannot disagree.
 *
 * TEETH, verified by hand and the reason this file exists: making
 * `compareRows` return 0 always (or `sortValue` return a constant) freezes
 * the rendered order, and "sorting by pairings reorders the rows" goes RED.
 * Restoring the byte-exact comparator makes it pass.
 */

import { createStaticRouter } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { type ReactElement, useState } from "react";
import { describe, expect, it } from "vitest";
import { appRoutes, middleware, notFoundRoute } from "../../../../routes.js";
import { JOURNEY_MODEL } from "../__fixtures__/journeyModel.js";
import {
  buildJourneyRows,
  compareRows,
  DEFAULT_TABLE_STATE,
  groupRows,
  type JourneyTableState,
} from "../journeyTableModel.js";
import JourneyTable from "./JourneyTable.js";

const JOB_DETAIL = {
  "sem://design-system-docs#job.l3": {
    story: "A reader browses the component catalogue.",
    roles: ["sem://design-system-docs#role.writer"],
  },
} as const;

const ROWS = buildJourneyRows(JOURNEY_MODEL, JOB_DETAIL);

/** The table wired to real `useState`, exactly as `JourneysExplorer` wires
 * it — so a header or group click actually re-renders with the new state,
 * which is the whole point: the callback is not the behaviour, the
 * re-render is. */
const StatefulTable = (): ReactElement => {
  const [state, setState] = useState<JourneyTableState>(DEFAULT_TABLE_STATE);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  return (
    <JourneyTable
      expanded={expanded}
      job={undefined}
      onStateChange={setState}
      onToggleExpanded={(uri) =>
        setExpanded((current) => {
          const next = new Set(current);
          if (next.has(uri)) next.delete(uri);
          else next.add(uri);
          return next;
        })
      }
      rows={ROWS}
      state={state}
    />
  );
};

const renderStateful = (): void => {
  render(
    <RouterProvider
      router={createStaticRouter(appRoutes, "/journeys", {
        middleware: [...middleware],
        notFound: notFoundRoute,
      })}
    >
      <StatefulTable />
    </RouterProvider>,
  );
};

/** The rendered order of the JOB row headers, read from the DOM — never
 * from the model. This is what a sighted reader sees, top to bottom. */
const renderedJobOrder = (): string[] =>
  [...document.querySelectorAll('th[scope="row"].journey-table-job')].map(
    (cell) => cell.querySelector(".journey-table-job-link")?.textContent ?? "",
  );

/** The group header labels, in render order — the grouping structure. */
const renderedGroupLabels = (): string[] =>
  [...document.querySelectorAll(".journey-table-group-header")].map((cell) =>
    (cell.textContent ?? "").trim(),
  );

describe("JourneyTable sort interaction", () => {
  it("REORDERS the rendered rows when a sortable header is pressed", () => {
    renderStateful();

    // The default order, grouped by coordinate, jobs alphabetical: the
    // wildcard coordinate's job.b2 leads, then the maker coordinate.
    const before = renderedJobOrder();
    expect(before).toEqual(["job.b2", "job.l3", "job.orphan"]);

    // Sort by pairings DESCENDING (one click on Pairings takes it over at
    // ascending; a second toggles to descending). job.orphan has zero
    // pairings, job.l3 has two — descending floats the most-paired up.
    const pairings = screen.getByRole("columnheader", { name: /Pairings/ });
    fireEvent.click(pairings.querySelector("button") as HTMLButtonElement);
    fireEvent.click(pairings.querySelector("button") as HTMLButtonElement);

    const after = renderedJobOrder();
    // The order genuinely CHANGED — this is the assertion a "callback fired"
    // test cannot make.
    expect(after).not.toEqual(before);
    // And it changed to the RIGHT order. Grouping is still by coordinate,
    // so within the maker coordinate job.l3 (2 pairings) now precedes
    // job.orphan (0); and the maker group leads because its first row now
    // outranks the wildcard coordinate's single-pairing job.b2.
    expect(after).toEqual(["job.l3", "job.orphan", "job.b2"]);
    // The most-paired job floats to the very top; the unpaired one sinks
    // below it within its own group.
    expect(after.at(0)).toBe("job.l3");
    expect(after.indexOf("job.l3")).toBeLessThan(after.indexOf("job.orphan"));
  });

  it("mirrors the order when the active header is toggled to descending", () => {
    renderStateful();
    const job = screen.getByRole("columnheader", { name: /Job/ });
    // Job is already the active ascending column; one click flips it.
    fireEvent.click(job.querySelector("button") as HTMLButtonElement);
    expect(renderedJobOrder()).toEqual(["job.orphan", "job.l3", "job.b2"]);
  });
});

describe("JourneyTable group interaction", () => {
  it("RE-BUCKETS the rows when the group control changes", () => {
    renderStateful();

    // Default: grouped by coordinate — two coordinate headers.
    const byCoordinate = renderedGroupLabels();
    expect(byCoordinate.length).toBe(2);
    expect(byCoordinate.some((label) => label.includes("writer"))).toBe(true);

    // Group by STATE instead — the structure changes to Served / Unserved.
    // Scoped to the group control: "State" is also a sortable column header.
    const groupControl = screen.getByRole("group", { name: "Group by" });
    fireEvent.click(within(groupControl).getByRole("button", { name: "State" }));
    const byState = renderedGroupLabels();
    expect(byState).not.toEqual(byCoordinate);
    expect(byState.some((label) => label.startsWith("Served"))).toBe(true);
    expect(byState.some((label) => label.startsWith("Unserved"))).toBe(true);

    // Group FLAT — the header rows disappear entirely.
    fireEvent.click(within(groupControl).getByRole("button", { name: "Flat" }));
    expect(renderedGroupLabels().length).toBe(0);
    // But every job is still present — flattening never drops rows.
    expect(renderedJobOrder().length).toBe(ROWS.length);
  });
});

describe("the model is pure — the SSR determinism contract", () => {
  it("compareRows gives byte-equal output for byte-equal input", () => {
    const sortOnce = [...ROWS].sort(compareRows("pairings", "descending"));
    const sortTwice = [...ROWS].sort(compareRows("pairings", "descending"));
    expect(JSON.stringify(sortTwice)).toBe(JSON.stringify(sortOnce));
  });

  it("groupRows gives byte-equal output for byte-equal input", () => {
    const once = groupRows(ROWS, DEFAULT_TABLE_STATE);
    const twice = groupRows(ROWS, DEFAULT_TABLE_STATE);
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });

  it("the DEFAULT arrangement is a pure comparator, so first paint is fixed", () => {
    // The exact value the server renders and the client's first render must
    // reproduce. Recomputing it from the same rows is byte-identical — there
    // is nothing for the two sides to disagree about.
    const server = groupRows(ROWS, DEFAULT_TABLE_STATE);
    const clientFirstPaint = groupRows(ROWS, DEFAULT_TABLE_STATE);
    expect(JSON.stringify(clientFirstPaint)).toBe(JSON.stringify(server));
    // Concretely: job.b2's group leads, job.orphan's row trails.
    const order = server.flatMap((group) =>
      group.rows.map((row) => row.label),
    );
    expect(order).toEqual(["job.b2", "job.l3", "job.orphan"]);
  });

  it("a DIFFERENT arrangement is byte-DIFFERENT — order is load-bearing", () => {
    const byDefault = groupRows(ROWS, DEFAULT_TABLE_STATE);
    const byState = groupRows(ROWS, {
      sort: "job",
      direction: "ascending",
      group: "served",
    });
    expect(JSON.stringify(byState)).not.toBe(JSON.stringify(byDefault));
  });
});
