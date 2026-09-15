import compareRecords from "./compareRecords.js";
import type { ApiQuery, ApiRecord, ApiTextMatch } from "./types.js";

/** The fields free-text search reads, on either endpoint. */
const SEARCHED_FIELDS: readonly string[] = ["name", "owner"];

/**
 * The records one query matches, in the order it asks for: the statuses it
 * is any and none of, its bounds on cores, the text each text field must
 * contain or start with and its search, all required at once, then its one
 * ordered term, ties kept in input order. A status is any or none of a list
 * only when it is a string or a number: an absent, null or other value is
 * neither.
 *
 * Whether a value holds text is the endpoint's own call, so each endpoint
 * executes `contains` and `startsWith` its own way over the same records and
 * the same query: `matchText` prepares one operand once per query — folds
 * it, escapes it — and answers whether each string value holds it.
 */
export default function selectRecords(
  records: readonly ApiRecord[],
  query: ApiQuery,
  matchText: (
    operator: ApiTextMatch["operator"],
    text: string,
  ) => (value: string) => boolean,
): readonly ApiRecord[] {
  /** A prepared operand, reading only string values. */
  const prepare = (operator: ApiTextMatch["operator"], text: string) => {
    const holds = matchText(operator, text);
    return (value: unknown): boolean =>
      typeof value === "string" && holds(value);
  };
  const texts = query.text.map(
    ({ field, operator, text }) => [field, prepare(operator, text)] as const,
  );
  const searched =
    query.search === null ? null : prepare("contains", query.search);
  const { isAny, isNone } = query.statuses;
  const matched = records.filter((row) => {
    const { status, cores } = row;
    const isChoice = typeof status === "string" || typeof status === "number";
    if (
      isAny.length > 0 &&
      !(isChoice && isAny.some((listed) => listed === status))
    ) {
      return false;
    }
    if (
      isNone.length > 0 &&
      !(isChoice && isNone.every((listed) => listed !== status))
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
    for (const [field, holds] of texts) {
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
