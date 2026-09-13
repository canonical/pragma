import { collapseSortTerms } from "../query/index.js";
import type { Schema, SchemaFieldDefinition } from "../schema/index.js";
import readInstant from "./readInstant.js";
import type { EffectiveOrdering, FieldReader } from "./types.js";

/**
 * The comparison key of one present value: a rank the kind places it at,
 * then the text that orders values sharing a rank. Numbers, instants, flags
 * and declared options need only the rank; text needs only the text; an
 * option the schema does not list needs both.
 */
type OrderKey = {
  readonly rank: number;
  readonly text: string;
};

const createKey = (rank: number, text = ""): OrderKey => ({ rank, text });

const compareByCodePoint = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

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
 * @note Impure: memoizes into the module-level `collators` map, because an
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

/** How one field's kind reads and compares its ordering keys. */
type KindOrder = {
  /**
   * The key of a row value, or null when the kind has none for it: that
   * value is empty, and orders after every value with a key.
   */
  readonly readKey: (value: unknown) => OrderKey | null;
  /** Order two values sharing a rank. */
  readonly compareText: (a: string, b: string) => number;
};

/** A field the schema does not define: every row is empty under it. */
const NO_ORDER: KindOrder = {
  readKey: () => null,
  compareText: compareByCodePoint,
};

const createChoicesOrder = (
  options: readonly (string | number)[],
): KindOrder => {
  // Keyed by string form, as the schema matches an option to an input:
  // colliding string forms are rejected at construction, so this is exact.
  const ranks = new Map(
    options.map((option, index) => [String(option), index]),
  );
  return {
    readKey: (value) => {
      if (typeof value !== "string" && typeof value !== "number") {
        return null;
      }
      const text = String(value);
      const rank = ranks.get(text);
      // A value the options do not list is still a value: it orders after
      // every declared one rather than disappearing into the empties.
      return rank === undefined ? createKey(ranks.size, text) : createKey(rank);
    },
    compareText: compareByCodePoint,
  };
};

/**
 * Text orders through the source's collator. An empty string carries
 * nothing to order by, so it is empty rather than a value: two blank cells
 * a reader cannot tell apart must not order differently, and one of them
 * must not move with the direction while the other stays last.
 */
const createTextOrder = (collator: Intl.Collator | null): KindOrder => ({
  readKey: (value) =>
    typeof value === "string" && value !== "" ? createKey(0, value) : null,
  compareText: collator === null ? compareByCodePoint : collator.compare,
});

const NUMBER_ORDER: KindOrder = {
  readKey: (value) =>
    typeof value === "number" && Number.isFinite(value)
      ? createKey(value)
      : null,
  compareText: compareByCodePoint,
};

const DATE_ORDER: KindOrder = {
  readKey: (value) => {
    const at = readInstant(value);
    return at === null ? null : createKey(at);
  },
  compareText: compareByCodePoint,
};

/**
 * A flag orders false before true. Its domain is presence — the one thing
 * it filters on — so anything present that is not a boolean counts as set
 * and only an absent value is empty. Ordering and `isSet` then agree about
 * which rows are set.
 */
const FLAG_ORDER: KindOrder = {
  readKey: (value) => {
    if (value === null || value === undefined) {
      return null;
    }
    return createKey(value === false ? 0 : 1);
  },
  compareText: compareByCodePoint,
};

const resolveKindOrder = (
  definition: SchemaFieldDefinition,
  collation: string | null,
): KindOrder => {
  switch (definition.kind) {
    case "choices":
      return createChoicesOrder(definition.options);
    case "number":
      return NUMBER_ORDER;
    case "date":
      return DATE_ORDER;
    case "flag":
      return FLAG_ORDER;
    case "text":
      return createTextOrder(getCachedCollator(collation));
  }
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
  readonly read: FieldReader;
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
  const definitions = new Map(
    schema.fields.map((definition) => [definition.field, definition]),
  );
  return collapseSortTerms([
    ...ordering.terms,
    ...(typeof ordering.tiebreak === "string" ? [] : ordering.tiebreak),
  ]).map((term): CompiledTerm => {
    const definition = definitions.get(term.field);
    return {
      field: term.field,
      descending: term.direction === "desc",
      order:
        definition === undefined
          ? NO_ORDER
          : resolveKindOrder(definition, collation),
    };
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
  const { read } = config;
  const terms = compileTerms(config);
  if (terms.length === 0) {
    return rows;
  }
  const keyed = rows.map((row) => ({
    row,
    keys: terms.map((term) => term.order.readKey(read(row, term.field))),
  }));
  keyed.sort((a, b) => {
    for (const [index, term] of terms.entries()) {
      const order = compareKeys(
        term,
        a.keys.at(index) ?? null,
        b.keys.at(index) ?? null,
      );
      if (order !== 0) {
        return order;
      }
    }
    return 0;
  });
  return keyed.map((entry) => entry.row);
}
