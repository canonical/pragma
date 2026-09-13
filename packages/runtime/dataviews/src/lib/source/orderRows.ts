import { collapseSortTerms } from "../query/index.js";
import { readField } from "../rows/index.js";
import {
  type KindOrder,
  type OrderKey,
  resolveFieldKind,
  type Schema,
  type SchemaFieldDefinition,
} from "../schema/index.js";
import type { EffectiveOrdering } from "./types.js";

/**
 * The collator a BCP-47 tag names, or null when none can be honoured.
 *
 * A tag no runtime data backs resolves to the *viewer's* locale, which is
 * the one order a server render could not reproduce, so it is refused here
 * and text falls back to code point — the same order everywhere. Which tags
 * a runtime backs is the runtime's, so a trimmed ICU build orders by code
 * point where a full one collates; the declaration still says what the
 * source meant.
 */
const resolveCollator = (collation: string | null): Intl.Collator | null => {
  if (collation === null) {
    return null;
  }
  try {
    return Intl.Collator.supportedLocalesOf([collation]).length === 0
      ? null
      : new Intl.Collator(collation, { usage: "sort" });
  } catch {
    // Not a well-formed tag, so it names no collation at all.
    return null;
  }
};

/** Collators are expensive to build and a source declares few of them. */
const collators = new Map<string | null, Intl.Collator | null>();

/**
 * The collator a tag names, built once per tag.
 *
 * @note Impure: memoises into the module-level `collators` map, because an
 * `Intl.Collator` is expensive to build and every request would otherwise
 * build one again.
 */
const getCachedCollator = (collation: string | null): Intl.Collator | null => {
  const built = collators.get(collation);
  if (built !== undefined) {
    return built;
  }
  const collator = resolveCollator(collation);
  collators.set(collation, collator);
  return collator;
};

/** One term of the effective ordering, compiled against the schema. */
type CompiledTerm = {
  readonly field: string;
  readonly descending: boolean;
  readonly order: KindOrder;
};

/**
 * Order two keys of one term, empties after every value in both directions
 * — a reader sorting a column is asking for its values, and the direction is
 * about them.
 */
const compareKeys = (
  term: CompiledTerm,
  left: OrderKey | null,
  right: OrderKey | null,
): number => {
  if (left === null) {
    return right === null ? 0 : 1;
  }
  if (right === null) {
    return -1;
  }
  const order =
    Math.sign(left.rank - right.rank) ||
    term.order.compareText(left.text, right.text);
  return term.descending ? -order : order;
};

/** What ordering rows needs: the ordering, the kinds, the collation and field access. */
type OrderRowsConfig = {
  readonly ordering: EffectiveOrdering;
  /** The field kinds. A term naming no field of it orders nothing. */
  readonly schema: Schema<readonly SchemaFieldDefinition[]>;
  /**
   * The BCP-47 tag text compares under, as the source declares it, or null
   * to compare by code point.
   */
  readonly collation: string | null;
};

/**
 * Compile the effective ordering against the schema: every term of it, then
 * the terms of a named tiebreak, exactly as the source appends them. An
 * unnamed tiebreak adds none, leaving equal rows equal. A tiebreak naming a
 * field already ordered is collapsed away, since comparing it twice can
 * only tie.
 */
const compileTerms = (config: OrderRowsConfig): readonly CompiledTerm[] => {
  const { ordering, schema, collation } = config;
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
            order: resolveFieldKind(definition.kind).createOrder(
              definition,
              getCachedCollator(collation),
            ),
          },
        ];
  });
};

/**
 * Order rows by one effective ordering.
 *
 * Each term reads its field through its kind: text through the source's
 * collator, `choices` by declared option index with unknown values after the
 * known ones, dates as instants however the row spells them, flags false
 * before true, numbers numerically. A value the kind has none of — absent,
 * null, an empty string, or outside its domain — orders after every value
 * that has one, in both directions.
 *
 * A term naming no field of the schema orders nothing: a field with no kind
 * cannot be compared meaningfully, and pretending otherwise is how a column
 * comes to sort by code point.
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
    for (const [index, term] of terms.entries()) {
      // Every key list was mapped from `terms`, so each index is in range.
      const order = compareKeys(
        term,
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
