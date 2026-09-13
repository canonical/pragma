import {
  canonicalSlice,
  operandRankOf,
  type Predicate,
  type PredicateOperand,
  type Slice,
} from "../query/index.js";
import type { Schema, SchemaFieldDefinition } from "../schema/index.js";
import orderRows from "./orderRows.js";
import readProperty from "./readProperty.js";
import resolveEffectiveOrdering from "./resolveEffectiveOrdering.js";
import type { FieldReader, SortCapabilities } from "./types.js";

/** Absent values never satisfy a predicate. */
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
 * Order two values of one type for a range test: numbers, strings by code
 * point, booleans false before true. Values of different types, and `NaN`,
 * are incomparable and return null — the source never invents an order
 * across types, and never reports a `NaN` as within a range. Row ordering
 * lives in `orderRows`, which reads each field through its declared kind.
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

/** What a local execution needs beyond the rows and the query. */
export type ExecuteSliceConfig = {
  /**
   * The field kinds every ordered term is compared through.
   *
   * @experimental Newly required: ordering now goes through the schema, and
   * the filter path may follow it for date values.
   */
  readonly schema: Schema<readonly SchemaFieldDefinition[]>;
  /**
   * What the source declares about ordering: the default, the tiebreak and
   * the collation. A term — a tiebreak's included — naming no field of the
   * schema orders nothing, so an identity tiebreak needs its field there.
   *
   * @experimental Newly required; may narrow to the three members it reads.
   */
  readonly sort: SortCapabilities;
  /** Field access; own-property lookup by default. */
  readonly read?: FieldReader;
  /** Fields free-text search reads; none by default. */
  readonly searchFields?: readonly string[];
};

/**
 * Execute a query over complete local input: filter, then search, then
 * order. Windowing stays a separate projection (`applyWindow`), so the
 * caller still holds every matching row and can count it.
 *
 * The ordering applied is the effective one: the query's own terms, or the
 * source's declared default when it states none, then the source's
 * tiebreak. An empty `slice.sort` is therefore the documented default, never
 * "unordered".
 *
 * Seam for the grouping unit: group levels already order before the sort
 * terms, and the summaries of one page are still owed. Nothing here groups,
 * because no source declares a groupable field and a grouped request is
 * refused.
 */
export default function executeSlice<TRow extends object>(
  rows: readonly TRow[],
  slice: Slice,
  config: ExecuteSliceConfig,
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

  return orderRows(matched, {
    ordering: resolveEffectiveOrdering(query, config.sort),
    schema: config.schema,
    collation: config.sort.collation,
    read,
  });
}
