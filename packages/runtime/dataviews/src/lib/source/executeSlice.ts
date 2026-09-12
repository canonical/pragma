import canonicalSlice, { operandRankOf } from "../query/canonicalSlice.js";
import type { Predicate, PredicateOperand, Slice } from "../query/types.js";
import type { FieldReader } from "./types.js";

/** Own-property read: the default field access for plain record rows. */
export const readProperty: FieldReader = (row, field) =>
  typeof row === "object" && row !== null && Object.hasOwn(row, field)
    ? (row as Record<string, unknown>)[field]
    : undefined;

/** Absent values never satisfy a predicate and always sort last. */
const isAbsent = (value: unknown): boolean =>
  value === null || value === undefined;

const nullRank = operandRankOf(null);

/**
 * The operand rank of a row value, or null when the value is outside the
 * operand domain. Ranks are the same total order canonical slices use, so
 * equality here agrees with query canonicalization exactly.
 */
const rankOf = (value: unknown): string | null => {
  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
      return operandRankOf(value);
    default:
      return value === null ? nullRank : null;
  }
};

/**
 * Order two values of one type: numbers, strings by code point, booleans
 * false before true. Values of different types, and `NaN`, are
 * incomparable and return null — the source never invents an order across
 * types, and never reports a `NaN` as within a range.
 */
const compareValues = (a: unknown, b: unknown): number | null => {
  if (typeof a === "number" && typeof b === "number") {
    return Number.isNaN(a) || Number.isNaN(b)
      ? null
      : a < b
        ? -1
        : a > b
          ? 1
          : 0;
  }
  if (typeof a === "string" && typeof b === "string") {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  if (typeof a === "boolean" && typeof b === "boolean") {
    return a === b ? 0 : a ? 1 : -1;
  }
  return null;
};

/**
 * The sort bucket of an incomparable value: its type name, with `NaN` in a
 * bucket of its own. Ordering buckets before values keeps the comparator a
 * total order, so a mixed-type column still sorts the same way everywhere.
 */
const bucketOf = (value: unknown): string =>
  typeof value === "number" && Number.isNaN(value)
    ? "number:nan"
    : typeof value;

/** A total order over row values: within a type by value, across types by
 * bucket name. */
const compareForSort = (a: unknown, b: unknown): number => {
  const order = compareValues(a, b);
  if (order !== null) {
    return order;
  }
  const left = bucketOf(a);
  const right = bucketOf(b);
  return left < right ? -1 : left > right ? 1 : 0;
};

/** One predicate compiled to a per-row test, with its operands resolved
 * once instead of once per row. */
type CompiledPredicate = {
  readonly field: string;
  readonly test: (value: unknown) => boolean;
};

const compilePredicate = (predicate: Predicate): CompiledPredicate => {
  const { field } = predicate;
  switch (predicate.operator) {
    case "isSet":
      return { field, test: (value) => !isAbsent(value) };
    case "eq": {
      const ranks = new Set(predicate.operands.map(operandRankOf));
      return {
        field,
        test: (value) => {
          const rank = rankOf(value);
          return rank !== null && ranks.has(rank);
        },
      };
    }
    case "gte":
    case "lte": {
      const bound: PredicateOperand | undefined = predicate.operands.at(0);
      if (bound === undefined) {
        // A range without its operand is not a range; it matches nothing.
        return { field, test: () => false };
      }
      const atLeast = predicate.operator === "gte";
      return {
        field,
        test: (value) => {
          if (isAbsent(value)) {
            return false;
          }
          const order = compareValues(value, bound);
          if (order === null) {
            return false;
          }
          return atLeast ? order >= 0 : order <= 0;
        },
      };
    }
  }
};

/**
 * Case-insensitive substring search over the declared fields. Text and
 * numeric values are searched; every other value, absent fields included,
 * never matches.
 */
const matchesSearch = (
  row: unknown,
  needle: string,
  fields: readonly string[],
  read: FieldReader,
): boolean => {
  for (const field of fields) {
    const value = read(row, field);
    if (typeof value !== "string" && typeof value !== "number") {
      continue;
    }
    const text = typeof value === "string" ? value : String(value);
    if (text.toLowerCase().includes(needle)) {
      return true;
    }
  }
  return false;
};

/** How a local execution reads rows and what free text searches. */
export type ExecuteSliceConfig = {
  /** Field access; own-property lookup by default. */
  readonly read?: FieldReader;
  /** Fields free-text search reads; none by default. */
  readonly searchFields?: readonly string[];
};

/**
 * Execute a query over complete local input: filter, then search, then
 * sort. Windowing stays a separate projection (`applyWindow`), so the
 * caller still holds every matching row and can count it. The sort is
 * stable over a total order, so the input order is the effective default
 * ordering and the tiebreak of every term.
 *
 * Seam for the grouping unit: group levels order before the sort terms and
 * produce the summaries of one page. Nothing here groups, because no source
 * declares a groupable field and a grouped request is refused.
 */
export default function executeSlice<TRow extends object>(
  rows: readonly TRow[],
  slice: Slice,
  config: ExecuteSliceConfig = {},
): readonly TRow[] {
  const read = config.read ?? readProperty;
  const searchFields = config.searchFields ?? [];
  const query = canonicalSlice(slice);
  const needle = query.search === null ? null : query.search.toLowerCase();
  const predicates = query.filter.map(compilePredicate);

  const matched = rows.filter((row) => {
    for (const predicate of predicates) {
      if (!predicate.test(read(row, predicate.field))) {
        return false;
      }
    }
    return needle === null || matchesSearch(row, needle, searchFields, read);
  });

  const terms = query.sort;
  if (terms.length === 0) {
    return matched;
  }
  // Read each sort key once per row rather than once per comparison.
  const keyed = matched.map((row) => ({
    row,
    keys: terms.map((term) => read(row, term.field)),
  }));
  keyed.sort((a, b) => {
    for (let index = 0; index < terms.length; index += 1) {
      const left = a.keys[index];
      const right = b.keys[index];
      const leftAbsent = isAbsent(left);
      const rightAbsent = isAbsent(right);
      if (leftAbsent || rightAbsent) {
        if (leftAbsent && rightAbsent) {
          continue;
        }
        // Absent values sort last in both directions.
        return leftAbsent ? 1 : -1;
      }
      const order = compareForSort(left, right);
      if (order === 0) {
        continue;
      }
      return terms[index].direction === "asc" ? order : -order;
    }
    return 0;
  });
  return keyed.map((entry) => entry.row);
}
