import compareRecords from "./compareRecords.js";
import type { ApiQuery, ApiRecord } from "./types.js";

/** The fields free-text search reads, on either endpoint. */
const SEARCHED_FIELDS: readonly string[] = ["name", "owner"];

/**
 * The records one query matches, in the order it asks for: its statuses, its
 * bounds on cores, the text each text field must contain and its search, all
 * required at once, then its one ordered term, ties kept in input order.
 *
 * Whether a value holds text is the endpoint's own call, so each endpoint
 * executes `contains` its own way over the same records and the same query:
 * `matchText` prepares one operand once per query — folds it, escapes it —
 * and answers whether each string value holds it.
 */
export default function selectRecords(
  records: readonly ApiRecord[],
  query: ApiQuery,
  matchText: (text: string) => (value: string) => boolean,
): readonly ApiRecord[] {
  /** A prepared operand, reading only string values. */
  const prepare = (text: string) => {
    const holds = matchText(text);
    return (value: unknown): boolean =>
      typeof value === "string" && holds(value);
  };
  const contains = Object.entries(query.contains).map(
    ([field, text]) => [field, prepare(text)] as const,
  );
  const searched = query.search === null ? null : prepare(query.search);
  const matched = records.filter((row) => {
    const { status, cores } = row;
    if (
      query.statuses.length > 0 &&
      !(typeof status === "string" && query.statuses.includes(status))
    ) {
      return false;
    }
    if (
      (query.cores.gte !== null || query.cores.lte !== null) &&
      !(
        typeof cores === "number" &&
        (query.cores.gte === null || cores >= query.cores.gte) &&
        (query.cores.lte === null || cores <= query.cores.lte)
      )
    ) {
      return false;
    }
    for (const [field, holds] of contains) {
      if (!holds(row[field])) {
        return false;
      }
    }
    return (
      searched === null || SEARCHED_FIELDS.some((field) => searched(row[field]))
    );
  });
  return query.sort === null
    ? matched
    : [...matched].sort(compareRecords(query.sort));
}
