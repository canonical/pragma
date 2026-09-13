import {
  canonicalizeSlice,
  type Predicate,
  rankOperand,
  type Slice,
} from "../query/index.js";
import { readField } from "../rows/index.js";
import { type FieldKindRules, resolveFieldKind } from "../schema/index.js";
import orderRows from "./orderRows.js";
import resolveEffectiveOrdering from "./resolveEffectiveOrdering.js";
import type { ExecuteSliceConfig } from "./types.js";

/** Absent values never satisfy a predicate. */
const isAbsent = (value: unknown): boolean =>
  value === null || value === undefined;

const nullRank = rankOperand(null);

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
      return rankOperand(value);
    default:
      return value === null ? nullRank : null;
  }
};

/** One predicate compiled to a per-row test, with its operands resolved
 * once instead of once per row. */
type CompiledPredicate = {
  readonly field: string;
  readonly test: (value: unknown) => boolean;
};

/**
 * One predicate compiled against the field's kind: a range test compares
 * through the kind, so a field the schema does not define — and a kind with
 * no range — matches nothing.
 */
const compilePredicate = (
  predicate: Predicate,
  kind: FieldKindRules | null,
): CompiledPredicate => {
  const { field } = predicate;
  switch (predicate.operator) {
    case "isSet":
      return { field, test: (value) => !isAbsent(value) };
    case "eq": {
      const ranks = new Set(predicate.operands.map(rankOperand));
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
      const [bound] = predicate.operands;
      // A range without its operand is not a range, and a range over a
      // field the schema does not describe compares nothing: neither matches.
      if (bound === undefined || kind === null) {
        return { field, test: () => false };
      }
      const atLeast = predicate.operator === "gte";
      return {
        field,
        test: (value) => {
          if (isAbsent(value)) {
            return false;
          }
          const order = kind.compareToBound(value, bound);
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
  row: object,
  needle: string,
  fields: readonly string[],
): boolean => {
  for (const field of fields) {
    const value = readField(row, field);
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

/**
 * Execute a query over complete local input: filter, then search, then
 * order. Windowing stays a separate projection (`applyWindow`), so the
 * caller still holds every matching row and can count it.
 *
 * The ordering applied is the effective one: the query's own terms, or the
 * source's declared default when it states none, then the source's
 * tiebreak. An empty `slice.sort` is therefore the documented default, never
 * "unordered". Nothing here groups: no source declares a groupable field,
 * and a grouped request is refused before it reaches this.
 */
export default function executeSlice<TRow extends object>(
  rows: readonly TRow[],
  slice: Slice,
  config: ExecuteSliceConfig,
): readonly TRow[] {
  const searchFields = config.searchFields ?? [];
  const query = canonicalizeSlice(slice);
  const needle = query.search === null ? null : query.search.toLowerCase();
  const predicates = query.filter.map((predicate) => {
    const definition = config.schema.findField(predicate.field);
    return compilePredicate(
      predicate,
      definition === undefined ? null : resolveFieldKind(definition.kind),
    );
  });

  const matched = rows.filter((row) => {
    for (const predicate of predicates) {
      if (!predicate.test(readField(row, predicate.field))) {
        return false;
      }
    }
    return needle === null || matchesSearch(row, needle, searchFields);
  });

  return orderRows(matched, {
    ordering: resolveEffectiveOrdering(query, config.sort),
    schema: config.schema,
    collation: config.sort.collation,
  });
}
