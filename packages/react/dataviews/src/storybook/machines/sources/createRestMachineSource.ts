import {
  type Count,
  createPage,
  createQuerySource,
  declareCapabilities,
  encodeQuery,
  type Facet,
  type Source,
} from "@canonical/dataviews-core";
import { QueryClient, QueryObserver } from "@tanstack/query-core";
import type { ApiScenario, FacetValue } from "../api/index.js";
import { type Machine, machineCollection } from "../fixtures.js";

/** Whether a value is a count, of a kind the envelope names. */
const isCount = (value: unknown): value is Count =>
  typeof value === "object" &&
  value !== null &&
  "kind" in value &&
  (value.kind === "unknown" ||
    ((value.kind === "exact" || value.kind === "at-least") &&
      "value" in value &&
      typeof value.value === "number"));

/** Whether a value is one value of a values facet, with its count. */
const isFacetValue = (value: unknown): value is FacetValue =>
  typeof value === "object" &&
  value !== null &&
  "value" in value &&
  (typeof value.value === "string" ||
    typeof value.value === "number" ||
    value.value === true) &&
  "count" in value &&
  isCount(value.count);

/** Whether a value is one end of a range facet. */
const isRangeEnd = (value: unknown): value is string | number | null =>
  value === null || typeof value === "string" || typeof value === "number";

/**
 * The facets an answer carries, read rather than trusted: a range with two
 * ends, or values each with a count, and anything else left out.
 */
const readAnsweredFacets = (
  answered: unknown,
): Readonly<Record<string, Facet>> | undefined => {
  if (typeof answered !== "object" || answered === null) {
    return undefined;
  }
  const facets: Record<string, Facet> = {};
  for (const [field, facet] of Object.entries(answered)) {
    if (typeof facet !== "object" || facet === null || !("kind" in facet)) {
      continue;
    }
    if (
      facet.kind === "range" &&
      "min" in facet &&
      "max" in facet &&
      isRangeEnd(facet.min) &&
      isRangeEnd(facet.max)
    ) {
      facets[field] = { kind: "range", min: facet.min, max: facet.max };
    } else if (
      facet.kind === "values" &&
      "values" in facet &&
      Array.isArray(facet.values)
    ) {
      facets[field] = {
        kind: "values",
        values: facet.values.filter(isFacetValue),
      };
    }
  }
  return facets;
};

/**
 * What the REST endpoint executes, and so all the parts may offer: the
 * statuses a machine is any or none of, bounds on cores, text the name and
 * the region contain or start with but none in the owner, search over the
 * name and the owner, one ordered term, pages by number, exact counts, and
 * the facets of the status and the cores.
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
  facets: ["status", "cores"],
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
    fetchPage: async ({ slice, window, facets }) => {
      const params = encodeQuery({
        schema: machineCollection.schema,
        slice,
        window,
      });
      for (const field of facets) {
        params.append("facet", field);
      }
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
        // Each facet read, never trusted: one of another shape is left out.
        facets: "facets" in body ? readAnsweredFacets(body.facets) : undefined,
      });
    },
    createObserver: (query) => new QueryObserver(client, query),
  });
}
