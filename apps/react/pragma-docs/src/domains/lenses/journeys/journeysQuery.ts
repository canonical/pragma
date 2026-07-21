/**
 * The Journeys lens's query contract (the `definitionsQuery.ts` sibling):
 * the compiled `JourneysExplorerQuery` operation plus the one variables
 * builder, shared by the server prepare step (`routes.ts` meta), the
 * client prefetch seam (`warmRouteQuery`), and the page's hook —
 * byte-identical variables everywhere. Artifact-only imports: this module
 * rides the server bricks' native import chain; the tag lives in
 * `JourneysExplorer.tsx`.
 *
 * ONE entry serves BOTH routes (`/journeys` and `/journeys/:job`): the
 * job-less index runs the same operation, and the selected job is read
 * from the URL rather than fetched separately — the whole demand model is
 * small enough (52 jobs, 133 pairings) that one operation carries it and
 * selection is pure presentation over data already in the store.
 *
 * THE JOB IS THE ADDRESSABLE THING (P-D7). A journey is a job's path
 * through the surfaces that serve it, so the job — not the coordinate,
 * not the pairing — is what a reader links to, cites and returns to. The
 * coordinate roots the DIAGRAM (ruling R1); the job addresses the VIEW.
 */

import type { JourneysExplorerQuery$variables } from "#relay/__generated__/JourneysExplorerQuery.graphql.js";
import journeysExplorerQueryNode from "#relay/__generated__/JourneysExplorerQuery.graphql.js";
import type { RouteQueryEntry } from "#relay/routeQuery.js";

/** The compiled operation (full text under `params.text`, `id: null`). */
export { journeysExplorerQueryNode };

/**
 * Read the optional `:job` param off a route match. `undefined` on
 * `/journeys` (the index — the diagram with an empty inspector); asserts
 * the shape at the one boundary where params are `unknown`-typed records.
 */
export const readJobParam = (
  params: Readonly<Record<string, unknown>>,
): string | undefined => {
  const job = params.job;
  if (job === undefined) return undefined;
  if (typeof job !== "string" || job.length === 0) {
    throw new Error(
      "journeys :job param must be a non-empty string when present",
    );
  }
  return job;
};

/**
 * The page ceiling the schema enforces. `first:` caps at 100 — asking for
 * 200 silently returns 100, verified against the live backend — and the
 * model holds 133 pairings.
 *
 * THE COVERAGE PROBLEM, and why this is not paginated. A single
 * `first:100` page reaches only 38 of the 51 jobs that have pairings: 13
 * jobs would vanish from the lens with nothing on screen saying so. That
 * is precisely the silent-truncation failure this lens exists to expose,
 * so it cannot be the lens's own bug.
 *
 * THE SOLUTION is a `first:100` + `last:100` UNION in one operation rather
 * than a cursor walk. The two windows overlap by 67 and together cover all
 * 133 pairings and all 51 paired jobs (measured against the live backend,
 * not assumed). The union is taken by URI, so the overlap collapses to
 * nothing. This beats the cursor approach on every axis that matters here:
 * no `endCursor` has to be threaded through the server prepare step and
 * the prefetch seam as a variable, no second round trip exists to fail
 * independently, and the operation stays one operation — the P-2 register
 * holds.
 *
 * It is honest only while the model fits in two windows.
 * `collectJourneys` is handed both windows and merges them; the union's
 * completeness is asserted in the e2e block against the live graph, so the
 * day the model outgrows two windows the lens says so rather than quietly
 * dropping journeys.
 */
export const PAIRING_PAGE_SIZE = 100;

/**
 * The jobs page size. The `jobs` root connection defaults to FIFTY, not to
 * everything — measured live: the default page returns 50 of the 52 jobs
 * with `hasNextPage: true`, and `first: 100` returns all 52 with
 * `hasNextPage: false`. Asking explicitly is therefore load-bearing, not
 * decoration: without it two jobs (and their journeys) would be missing
 * from the diagram for no visible reason.
 */
export const JOB_PAGE_SIZE = 100;

export const journeysExplorerVariables = (
  job: string | undefined,
): JourneysExplorerQuery$variables => ({
  jobs: JOB_PAGE_SIZE,
  pairings: PAIRING_PAGE_SIZE,
  hasJob: job !== undefined,
  uri: job ?? "",
});

/**
 * The one query entry — parked under BOTH `meta` (the P-2 server prepare
 * contract) and `prefetch` (the P-5 warm-up seam) by `routes.ts`, on both
 * journeys routes.
 */
export const journeysRouteEntry: RouteQueryEntry = {
  query: journeysExplorerQueryNode,
  variables: (params) => journeysExplorerVariables(readJobParam(params)),
};
