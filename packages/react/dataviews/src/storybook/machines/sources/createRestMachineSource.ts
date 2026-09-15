import {
  createPage,
  createQuerySource,
  declareCapabilities,
  encodeQuery,
  type Source,
} from "@canonical/dataviews-core";
import { QueryClient, QueryObserver } from "@tanstack/query-core";
import type { ApiScenario } from "../api/index.js";
import { type Machine, machineCollection } from "../fixtures.js";

/**
 * What the REST endpoint executes, and so all the parts may offer: the
 * statuses a machine is any or none of, bounds on cores, text the name and
 * the region contain or start with but none in the owner, search over the
 * name and the owner, one ordered term, pages by number and exact counts.
 */
const REST_CAPABILITIES = declareCapabilities(machineCollection, {
  filter: {
    status: ["isAny", "isNone"],
    cores: ["gte", "lte"],
    name: ["contains", "startsWith"],
    region: ["contains", "startsWith"],
  },
  search: ["name", "owner"],
  sort: {
    fields: ["name", "status", "cores", "region", "owner"],
    terms: 1,
    tiebreak: "opaque",
  },
  counts: { pageable: "exact", matched: "exact", total: "exact" },
});

/**
 * A source over the REST machine endpoint of one scenario, through TanStack
 * Query's own client: the query is written to the endpoint's parameters by
 * the same encoder the location uses, and the answer is mapped onto a page.
 * The client, its cache and its retries are the source's own, as an
 * application's would be; failures are not retried, so a story shows them
 * at once. The client is never mounted: a story needs no refetch on window
 * focus or reconnect, and mounting would subscribe to the window for the
 * page's life.
 *
 * @note Impure: the source it returns sends requests.
 */
export default function createRestMachineSource(
  scenario: ApiScenario,
): Source<Machine> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createQuerySource<Machine>({
    capabilities: REST_CAPABILITIES,
    queryKey: ["machines", "rest", scenario],
    fetchPage: async ({ slice, window }) => {
      const params = encodeQuery({
        schema: machineCollection.schema,
        slice,
        window,
      });
      const response = await fetch(
        new URL(
          `/api/${scenario}/machines?${params}`,
          globalThis.location.href,
        ),
      );
      // The answer is read, never trusted: a field of another shape is absent.
      const body: unknown = await response.json().catch(() => null);
      const isObject =
        typeof body === "object" && body !== null && !Array.isArray(body);
      if (!response.ok) {
        const reason = isObject && "reason" in body ? body.reason : undefined;
        // A status text is empty over HTTP/2, so the status stands in for it.
        throw new Error(
          typeof reason === "string"
            ? reason
            : response.statusText || `the endpoint answered ${response.status}`,
        );
      }
      if (!isObject) {
        throw new Error("the endpoint answered without a JSON object");
      }
      if (!("items" in body) || !Array.isArray(body.items)) {
        throw new Error("the endpoint answered without machines");
      }
      return createPage({
        // The endpoint serves machines; its records are read as they come.
        rows: body.items as readonly Machine[],
        matched:
          "matched" in body && typeof body.matched === "number"
            ? body.matched
            : undefined,
        total:
          "total" in body && typeof body.total === "number"
            ? body.total
            : undefined,
      });
    },
    createObserver: (query) => new QueryObserver(client, query),
  });
}
