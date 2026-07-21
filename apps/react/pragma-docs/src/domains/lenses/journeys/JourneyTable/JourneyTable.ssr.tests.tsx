/**
 * The table's SSR posture: the whole demand index — caption, column
 * headers, every job's `<th scope="row">` cell — renders to a string, AND
 * it renders in the DEFAULT arrangement, so the first paint a reader sees
 * is the one the pure constant `DEFAULT_TABLE_STATE` names. The default is
 * grouped by coordinate, jobs alphabetical within: the group whose first
 * job sorts first leads, so the wildcard coordinate (holding `job.b2`)
 * precedes the maker coordinate (holding `job.l3`). Asserting the ORDER in
 * the server HTML is the determinism contract — the client's first render
 * must match this byte for byte.
 */

import { createStaticRouter } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { appRoutes, middleware, notFoundRoute } from "../../../../routes.js";
import { JOURNEY_MODEL } from "../__fixtures__/journeyModel.js";
import { buildJourneyRows, DEFAULT_TABLE_STATE } from "../journeyTableModel.js";
import JourneyTable from "./JourneyTable.js";

const JOB_DETAIL = {
  "sem://design-system-docs#job.l3": {
    story: "A reader browses the component catalogue.",
    roles: ["sem://design-system-docs#role.writer"],
  },
} as const;

const ROWS = buildJourneyRows(JOURNEY_MODEL, JOB_DETAIL);

const renderServer = (): string =>
  renderToString(
    <RouterProvider
      router={createStaticRouter(appRoutes, "/journeys", {
        middleware: [...middleware],
        notFound: notFoundRoute,
      })}
    >
      <JourneyTable
        expanded={new Set<string>()}
        job={undefined}
        onStateChange={() => {}}
        onToggleExpanded={() => {}}
        rows={ROWS}
        state={DEFAULT_TABLE_STATE}
      />
    </RouterProvider>,
  );

describe("JourneyTable SSR", () => {
  it("renders the table shell — caption, row headers — as static markup", () => {
    const html = renderServer();
    expect(html).toContain('data-slot="journeys-table"');
    expect(html).toContain("<table");
    expect(html).toContain("<caption");
    expect(html).toContain('scope="row"');
    // Every job is present in the server HTML.
    expect(html).toContain("job.l3");
    expect(html).toContain("job.orphan");
    expect(html).toContain("job.b2");
  });

  it("renders in the DEFAULT sort/group order — the byte-for-byte contract", () => {
    const html = renderServer();
    // Grouped by coordinate: the group led by the alphabetically-first job
    // comes first, so `job.b2` (wildcard coordinate) precedes `job.l3`
    // (maker coordinate) in the served-side output.
    expect(html.indexOf("job.b2")).toBeGreaterThan(-1);
    expect(html.indexOf("job.b2")).toBeLessThan(html.indexOf("job.l3"));
    // And within the maker coordinate, `job.l3` precedes `job.orphan`.
    expect(html.indexOf("job.l3")).toBeLessThan(html.indexOf("job.orphan"));
  });
});
