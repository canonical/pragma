import { createPage, type Facet } from "@canonical/dataviews-core";
import { act } from "@testing-library/react";
import { type Machine, machine } from "./machines.js";
import type { ManualSource } from "./types.js";

/**
 * Answer a manual source's latest request with one machine and these facets:
 * what a chart reads when a test decides the counts itself.
 *
 * @note Impure: delivers into the source, inside `act`.
 */
export default function deliverFacets(
  source: ManualSource<Machine>,
  facets: Readonly<Record<string, Facet>>,
): void {
  act(() => {
    source.latest().deliver({
      status: "succeeded",
      page: createPage({
        rows: [machine("m-1", "alpha")],
        matched: 1,
        total: 1,
        facets,
      }),
    });
  });
}
