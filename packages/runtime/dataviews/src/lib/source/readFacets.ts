import type { Slice } from "../query/index.js";
import type { Facet, FacetValue } from "../result/index.js";
import { readField } from "../rows/index.js";
import {
  compareByCodeUnit,
  type FieldKind,
  type OrderKey,
  resolveFieldKind,
  type SchemaFieldDefinition,
} from "../schema/index.js";
import selectRows from "./selectRows.js";
import type { ExecuteSliceConfig } from "./types.js";

/** One distinct value counted so far, with the key it orders by. */
type Tally = {
  readonly value: string | number;
  readonly key: OrderKey;
  count: number;
};

/** Order two tallies as the field orders their values. */
const compareTallies = (a: Tally, b: Tally): number =>
  a.key.rank === b.key.rank
    ? compareByCodeUnit(a.key.text, b.key.text)
    : a.key.rank - b.key.rank;

/** How one kind's facet is read from the rows matching the query, or null for a kind with none. */
const FACET_READERS: {
  readonly [TKind in FieldKind]:
    | ((
        rows: readonly object[],
        definition: Extract<SchemaFieldDefinition, { readonly kind: TKind }>,
      ) => Facet)
    | null;
} = {
  choices: (rows, definition) => {
    const order = resolveFieldKind("choices").createOrder(
      definition,
      compareByCodeUnit,
    );
    // The server's options are text: a value is counted and listed as its
    // text, as the wire spells it and a filter matches it.
    const isText = definition.options === undefined;
    // Keyed by the value itself: a map tells the number 42 from the text "42".
    const tallies = new Map<string | number, Tally>();
    for (const row of rows) {
      const held = readField(row, definition.field);
      // The order keys a string or a number, as `isAny` reads a choice value,
      // and nothing else: a value it cannot key is no choice value.
      const key = order.readKey(held);
      if (key === null) {
        continue;
      }
      // Keyed, so a string or a number.
      const value = isText ? String(held) : (held as string | number);
      const tally = tallies.get(value);
      if (tally === undefined) {
        tallies.set(value, { value, key, count: 1 });
      } else {
        tally.count += 1;
      }
    }
    return {
      kind: "values",
      values: [...tallies.values()].sort(compareTallies).map(
        ({ value, count }): FacetValue => ({
          value,
          count: { kind: "exact", value: count },
        }),
      ),
    };
  },
  flag: (rows, definition) => {
    // Set as `isSet` reads it: any value that is neither absent nor null.
    const set = rows.filter((row) => {
      const value = readField(row, definition.field);
      return value !== null && value !== undefined;
    }).length;
    return {
      kind: "values",
      values:
        set === 0
          ? []
          : [{ value: true, count: { kind: "exact", value: set } }],
    };
  },
  number: (rows, definition) =>
    readRange(
      rows,
      definition,
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
      (a, b) => a - b,
    ),
  // A date bound compares a record's text with the calendar date given, by
  // code unit, so the range is the text the records hold, compared the same
  // way: every value it offers is one a bound can reach.
  date: (rows, definition) =>
    readRange(
      rows,
      definition,
      (value): value is string => typeof value === "string",
      compareByCodeUnit,
    ),
  text: null,
};

/**
 * The least and greatest value the rows hold for one field, among the values
 * `accepts`, ordered by `compare`; a value it does not accept is left out.
 */
const readRange = <TValue extends string | number>(
  rows: readonly object[],
  definition: SchemaFieldDefinition,
  accepts: (value: unknown) => value is TValue,
  compare: (a: TValue, b: TValue) => number,
): Facet => {
  let least: TValue | null = null;
  let greatest: TValue | null = null;
  for (const row of rows) {
    const value = readField(row, definition.field);
    if (!accepts(value)) {
      continue;
    }
    if (least === null || compare(value, least) < 0) {
      least = value;
    }
    if (greatest === null || compare(value, greatest) > 0) {
      greatest = value;
    }
  }
  return { kind: "range", min: least, max: greatest };
};

/**
 * Compute the facets of the given fields over complete local input: each
 * over the rows the query's filter and search select with that field's own
 * predicates lifted, so a restriction on a field never hides the other
 * values of that field or narrows its own range. Each field must be one the
 * schema defines with a kind that has a facet.
 *
 * `selected` is what the query selects with nothing lifted: a field the query
 * does not restrict has nothing to lift, so its facet reads those rows rather
 * than selecting them again, and only a restricted field costs a pass.
 */
export default function readFacets(
  rows: readonly object[],
  slice: Slice,
  definitions: readonly SchemaFieldDefinition[],
  config: Pick<ExecuteSliceConfig, "schema" | "searchFields">,
  selected: readonly object[],
): Readonly<Record<string, Facet>> {
  const restricted = new Set(slice.filter.map(({ field }) => field));
  const facets: Record<string, Facet> = {};
  for (const definition of definitions) {
    const read = FACET_READERS[definition.kind] as
      | ((rows: readonly object[], definition: SchemaFieldDefinition) => Facet)
      | null;
    if (read === null) {
      throw new Error(`text field "${definition.field}" has no facet`);
    }
    facets[definition.field] = read(
      restricted.has(definition.field)
        ? selectRows(rows, slice, config, definition.field)
        : selected,
      definition,
    );
  }
  return facets;
}
