import { collapseSortTerms } from "../query/index.js";
import { readField } from "../rows/index.js";
import {
  compareByCodeUnit,
  type KindOrder,
  type OrderKey,
  resolveFieldKind,
  type Schema,
  type SchemaFieldDefinition,
} from "../schema/index.js";
import compareDigitRuns from "./compareDigitRuns.js";
import type { EffectiveOrdering, EmptyPlacement } from "./types.js";

/**
 * How text compares under a BCP-47 tag.
 *
 * No tag, or one that is not well formed, names no collation, and text
 * compares by code unit. A well-formed tag the runtime has no data for —
 * most tags on a small-ICU build — would resolve to the *viewer's* locale,
 * the one order a server render could not reproduce, so it compares by
 * digit runs instead: numbers order numerically whatever the tag, as the
 * default collation promises, and case and accents order by code point
 * everywhere alike. A runtime with no collator at all is the same case, and
 * orders the same.
 */
const resolveTextComparison = (
  collation: string | null,
): ((a: string, b: string) => number) => {
  if (collation === null) {
    return compareByCodeUnit;
  }
  try {
    return Intl.Collator.supportedLocalesOf([collation]).length === 0
      ? compareDigitRuns
      : new Intl.Collator(collation, { usage: "sort" }).compare;
  } catch (error) {
    // A RangeError is a tag that is not well formed, so it names no
    // collation at all. Anything else is a runtime that cannot collate —
    // no `Intl`, or no `Intl.Collator`, throws here too.
    return error instanceof RangeError ? compareByCodeUnit : compareDigitRuns;
  }
};

/** Collators are expensive to build and a source declares few of them. */
const comparisons = new Map<string | null, (a: string, b: string) => number>();

/**
 * How text compares under a tag, resolved once per tag.
 *
 * @note Impure: memoises into the module-level `comparisons` map, because an
 * `Intl.Collator` is expensive to build and every request would otherwise
 * build one again.
 */
const getCachedTextComparison = (
  collation: string | null,
): ((a: string, b: string) => number) => {
  const resolved = comparisons.get(collation);
  if (resolved !== undefined) {
    return resolved;
  }
  const comparison = resolveTextComparison(collation);
  comparisons.set(collation, comparison);
  return comparison;
};

/** One term of the effective ordering, compiled against the schema. */
type CompiledTerm = {
  readonly field: string;
  readonly descending: boolean;
  /** Whether this field's empty values order before its values. */
  readonly emptiesFirst: boolean;
  readonly order: KindOrder;
};

/**
 * Order two keys of one term. Empties sit after every value unless the
 * source places them first, in both directions either way — a reader
 * sorting a column is asking for its values, and the direction is about
 * them.
 */
const compareKeys = (
  term: CompiledTerm,
  left: OrderKey | null,
  right: OrderKey | null,
): number => {
  const empty = term.emptiesFirst ? -1 : 1;
  if (left === null) {
    return right === null ? 0 : empty;
  }
  if (right === null) {
    return -empty;
  }
  const order =
    Math.sign(left.rank - right.rank) ||
    term.order.compareText(left.text, right.text);
  return term.descending ? -order : order;
};

/** What ordering rows needs: the ordering, the kinds, the collation and where empties go. */
type OrderRowsConfig = {
  readonly ordering: EffectiveOrdering;
  /** The field kinds. A term naming no field of it orders nothing. */
  readonly schema: Schema<readonly SchemaFieldDefinition[]>;
  /**
   * The BCP-47 tag text compares under, as the source declares it, or null
   * to compare by code unit.
   */
  readonly collation: string | null;
  /** Where each placed field's empty values order; last for every other. */
  readonly empties: Readonly<Record<string, EmptyPlacement>>;
};

/**
 * Compile the effective ordering against the schema: every term of it, then
 * the terms of a named tiebreak, exactly as the source appends them. An
 * unnamed tiebreak adds none, leaving equal rows equal. A tiebreak naming a
 * field already ordered is collapsed away, since comparing it twice can
 * only tie.
 */
const compileTerms = (config: OrderRowsConfig): readonly CompiledTerm[] => {
  const { ordering, schema, collation, empties } = config;
  return collapseSortTerms([
    ...ordering.terms,
    ...(typeof ordering.tiebreak === "string" ? [] : ordering.tiebreak),
  ]).flatMap((term): CompiledTerm[] => {
    const definition = schema.findField(term.field);
    // A field the schema does not define orders nothing: every row is
    // empty under it, so the term is left out rather than compared.
    return definition === undefined
      ? []
      : [
          {
            field: term.field,
            descending: term.direction === "desc",
            // Own keys only: a field named for an `Object.prototype`
            // member is placed only where the source placed it.
            emptiesFirst:
              Object.hasOwn(empties, term.field) &&
              empties[term.field] === "first",
            order: resolveFieldKind(definition.kind).createOrder(
              definition,
              getCachedTextComparison(collation),
            ),
          },
        ];
  });
};

/**
 * Order rows by one effective ordering.
 *
 * Each term reads its field through its kind: text through the source's
 * collation, or by digit runs where the runtime has no data for it,
 * `choices` by declared option index with unknown values after the known
 * ones, dates as instants however the row spells them, flags false before
 * true, numbers numerically. A value the kind has none of — absent, null, an
 * empty string, or outside its domain — orders after every value that has
 * one in both directions, or before every one in both directions where the
 * source places that field's empties first.
 *
 * A term naming no field of the schema orders nothing: a field with no kind
 * cannot be compared meaningfully, and pretending otherwise is how a column
 * comes to sort by code unit.
 *
 * Each row's keys are read once rather than once per comparison. The sort
 * is stable, so rows the ordering leaves equal keep their input order —
 * which is what a source declaring an unnamed tiebreak over complete local
 * input means by it.
 */
export default function orderRows<TRow extends object>(
  rows: readonly TRow[],
  config: OrderRowsConfig,
): readonly TRow[] {
  const terms = compileTerms(config);
  if (terms.length === 0) {
    return rows;
  }
  const keyed = rows.map((row) => ({
    row,
    keys: terms.map((term) => term.order.readKey(readField(row, term.field))),
  }));
  keyed.sort((a, b) => {
    // An index loop: a sort calls this for every comparison, and an entries
    // iterator would allocate an iterator and a pair per term each time.
    for (let index = 0; index < terms.length; index += 1) {
      // Every key list was mapped from `terms`, so each index is in range.
      const order = compareKeys(
        terms[index] as CompiledTerm,
        a.keys[index] as OrderKey | null,
        b.keys[index] as OrderKey | null,
      );
      if (order !== 0) {
        return order;
      }
    }
    return 0;
  });
  return keyed.map((entry) => entry.row);
}
