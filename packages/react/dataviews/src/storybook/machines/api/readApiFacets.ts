import type { Facet } from "@canonical/dataviews-core";
import { STATUS_ORDER } from "./constants.js";
import selectRecords from "./selectRecords.js";
import type { ApiQuery, ApiRecord, ApiTextMatch, FacetValue } from "./types.js";

/** One status counted so far. */
type Tally = { readonly value: string | number; count: number };

/** Where a status lists: its place among the statuses, then after them all. */
const rankStatus = (value: string | number): number => {
  const place = STATUS_ORDER.indexOf(String(value));
  return place === -1 ? STATUS_ORDER.length : place;
};

/** Order two statuses: listed ones in their order, then the rest by code unit. */
const compareTallies = (a: Tally, b: Tally): number => {
  const byRank = rankStatus(a.value) - rankStatus(b.value);
  if (byRank !== 0) {
    return byRank;
  }
  const left = String(a.value);
  const right = String(b.value);
  return left < right ? -1 : left > right ? 1 : 0;
};

/**
 * The facets one query asks for, as the endpoint computes them over every
 * record the query matches — never over a page — each with that field's own
 * predicates lifted: the status facet over the records every other predicate
 * and the search select, whatever their status; the cores facet the same,
 * whatever their cores. So a status filter never hides the other statuses'
 * counts, and a bound never narrows the range it is chosen from.
 *
 * The status facet counts each status a matching record holds — a string or
 * a number — in the order the endpoint lists statuses, then any other by
 * code unit, and leaves out a status no record holds. The cores facet is the
 * least and greatest finite number of cores, null while no record holds one.
 *
 * `matched` is what the query itself selects: a facet whose field the query
 * does not restrict has nothing to lift, so it reads those records rather
 * than selecting them again.
 */
export default function readApiFacets(
  records: readonly ApiRecord[],
  query: ApiQuery,
  matched: readonly ApiRecord[],
  matchText: (
    operator: ApiTextMatch["operator"],
    text: string,
  ) => (value: string) => boolean,
): Readonly<Record<string, Facet>> {
  const facets: Record<string, Facet> = {};
  for (const field of query.facets) {
    switch (field) {
      case "status": {
        const counted =
          query.statuses.isAny.length === 0 &&
          query.statuses.isNone.length === 0
            ? matched
            : selectRecords(
                records,
                { ...query, statuses: { isAny: [], isNone: [] }, sort: null },
                matchText,
              );
        // Keyed by the value itself: a map tells the number 42 from the text "42".
        const tallies = new Map<string | number, Tally>();
        for (const { status } of counted) {
          if (typeof status !== "string" && typeof status !== "number") {
            continue;
          }
          const tally = tallies.get(status);
          if (tally === undefined) {
            tallies.set(status, { value: status, count: 1 });
          } else {
            tally.count += 1;
          }
        }
        facets[field] = {
          kind: "values",
          values: [...tallies.values()].sort(compareTallies).map(
            ({ value, count }): FacetValue => ({
              value,
              count: { kind: "exact", value: count },
            }),
          ),
        };
        break;
      }
      case "cores": {
        const bounded =
          query.cores.gte === null && query.cores.lte === null
            ? matched
            : selectRecords(
                records,
                { ...query, cores: { gte: null, lte: null }, sort: null },
                matchText,
              );
        // Folded one record at a time: spreading every value into Math.min
        // overflows the call stack on a large record set.
        let min: number | null = null;
        let max: number | null = null;
        for (const { cores } of bounded) {
          if (typeof cores !== "number" || !Number.isFinite(cores)) {
            continue;
          }
          if (min === null || cores < min) {
            min = cores;
          }
          if (max === null || cores > max) {
            max = cores;
          }
        }
        facets[field] = { kind: "range", min, max };
        break;
      }
      default: {
        // A facet field the endpoint lists but reads no facet for.
        const unread: never = field;
        throw new Error(`no facet reader for ${JSON.stringify(unread)}`);
      }
    }
  }
  return facets;
}
