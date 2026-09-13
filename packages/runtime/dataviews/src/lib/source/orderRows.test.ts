import { describe, expect, it } from "vitest";
import type { SortTerm } from "../query/index.js";
import {
  createSchema,
  type Schema,
  type SchemaFieldDefinition,
} from "../schema/index.js";
import { ROOT_NUMERIC_COLLATION } from "./constants.js";
import orderRows from "./orderRows.js";
import readProperty from "./readProperty.js";
import type { EffectiveOrdering, FieldReader } from "./types.js";

const schema = createSchema([
  { field: "name", kind: "text" },
  {
    field: "status",
    kind: "choices",
    options: ["pending", "running", "failed"],
  },
  { field: "cores", kind: "number" },
  { field: "seen", kind: "date" },
  { field: "ready", kind: "flag" },
]);

// Recorded against ICU 75.1; a backend claiming this order is checked against
// the fixtures below.

/** The same fields with a unique identity, for a tiebreak that ties nothing. */
const withId = createSchema([...schema.fields, { field: "id", kind: "text" }]);

const buildAscTerm = (field: string): SortTerm => ({ field, direction: "asc" });
const buildDescTerm = (field: string): SortTerm => ({
  field,
  direction: "desc",
});

type Ordered = {
  readonly schema?: Schema<readonly SchemaFieldDefinition[]>;
  readonly collation?: string | null;
  readonly tiebreak?: EffectiveOrdering["tiebreak"];
  readonly read?: FieldReader;
};

const buildOrderConfig = (
  terms: readonly SortTerm[],
  options: Ordered = {},
) => ({
  ordering: { terms, tiebreak: options.tiebreak ?? "opaque" },
  schema: options.schema ?? schema,
  collation:
    options.collation === undefined
      ? ROOT_NUMERIC_COLLATION
      : options.collation,
  read: options.read ?? readProperty,
});

/** Order rows by one ordering, answering their ids. */
const order = (
  rows: readonly Record<string, unknown>[],
  terms: readonly SortTerm[],
  options: Ordered = {},
): readonly string[] =>
  orderRows(rows, buildOrderConfig(terms, options)).map((row) =>
    String(row.id),
  );

describe("orderRows", () => {
  it("collates text at the declared locale, numerically and case-aware", () => {
    const rows = [
      { id: "item10", name: "item10" },
      { id: "item2", name: "item2" },
      { id: "Zebra", name: "Zebra" },
      { id: "apple", name: "apple" },
      { id: "e-acute", name: "éclair" },
      { id: "eclair", name: "eclair" },
    ];
    expect(order(rows, [buildAscTerm("name")])).toEqual([
      "apple",
      "eclair",
      "e-acute",
      "item2",
      "item10",
      "Zebra",
    ]);
  });

  it("orders a blank cell with the empties, not before every name", () => {
    // Two blank cells a reader cannot tell apart must not order
    // differently, nor one of them move with the direction.
    const rows = [
      { id: "named", name: "a" },
      { id: "blank", name: "" },
      { id: "absent" },
    ];
    expect(order(rows, [buildAscTerm("name")])).toEqual([
      "named",
      "blank",
      "absent",
    ]);
    expect(order(rows, [buildDescTerm("name")])).toEqual([
      "named",
      "blank",
      "absent",
    ]);
  });

  it("compares text by code point when the source names no collation", () => {
    const rows = [
      { id: "z", name: "Zebra" },
      { id: "a", name: "apple" },
    ];
    expect(order(rows, [buildAscTerm("name")], { collation: null })).toEqual([
      "z",
      "a",
    ]);
  });

  it("compares by code point rather than the viewer's locale for a tag no runtime backs", () => {
    // "und" and "zxx" are well-formed and backed by no collation data, so
    // honouring either would silently hand the order to whoever is looking.
    const rows = [
      { id: "z", name: "Zebra" },
      { id: "a", name: "apple" },
    ];
    expect(order(rows, [buildAscTerm("name")], { collation: "und" })).toEqual([
      "z",
      "a",
    ]);
    expect(order(rows, [buildAscTerm("name")], { collation: "zxx" })).toEqual([
      "z",
      "a",
    ]);
    expect(
      order(rows, [buildAscTerm("name")], { collation: "not a tag" }),
    ).toEqual(["z", "a"]);
  });

  it("orders choices by declared option index, not by label", () => {
    const rows = [
      { id: "f", status: "failed" },
      { id: "p", status: "pending" },
      { id: "r", status: "running" },
    ];
    expect(order(rows, [buildAscTerm("status")])).toEqual(["p", "r", "f"]);
    expect(order(rows, [buildDescTerm("status")])).toEqual(["f", "r", "p"]);
  });

  it("orders an option the schema does not list after every one it does", () => {
    const rows = [
      { id: "x", status: "zzz" },
      { id: "f", status: "failed" },
      { id: "y", status: "aaa" },
    ];
    expect(order(rows, [buildAscTerm("status")])).toEqual(["f", "y", "x"]);
    // Unlisted is still a value, so the direction reverses it with the rest.
    expect(order(rows, [buildDescTerm("status")])).toEqual(["x", "y", "f"]);
  });

  it("matches an option by its string form, as the schema does", () => {
    const numbered = createSchema([
      { field: "tier", kind: "choices", options: [10, 2] },
    ]);
    // "1" is listed nowhere, so it follows both declared options; a "10"
    // matched only by type would follow them too, after "1".
    const rows = [
      { id: "one", tier: "1" },
      { id: "two", tier: 2 },
      { id: "ten", tier: "10" },
    ];
    expect(order(rows, [buildAscTerm("tier")], { schema: numbered })).toEqual([
      "ten",
      "two",
      "one",
    ]);
  });

  it("compares dates as instants across every spelling of one", () => {
    const rows = [
      { id: "epoch", seen: Date.UTC(2026, 0, 2, 12) },
      { id: "date", seen: "2026-01-02" },
      { id: "offset", seen: "2026-01-02T23:00:00-05:00" },
      { id: "object", seen: new Date(Date.UTC(2026, 0, 1)) },
      { id: "zulu", seen: "2026-01-02T06:00:00Z" },
    ];
    expect(order(rows, [buildAscTerm("seen")])).toEqual([
      "object",
      "date",
      "zulu",
      "epoch",
      "offset",
    ]);
  });

  it("orders flags false before true, and anything present as set", () => {
    // Presence, as `isSet` reads it: a falsy value that is not `false` is
    // still set.
    const rows = [
      { id: "t", ready: true },
      { id: "f", ready: false },
      { id: "other", ready: "yes" },
      { id: "zero", ready: 0 },
      { id: "blank", ready: "" },
    ];
    expect(order(rows, [buildAscTerm("ready")])).toEqual([
      "f",
      "t",
      "other",
      "zero",
      "blank",
    ]);
    expect(order(rows, [buildDescTerm("ready")])).toEqual([
      "t",
      "other",
      "zero",
      "blank",
      "f",
    ]);
  });

  it("orders numbers numerically, with -0 equal to 0", () => {
    const rows = [
      { id: "b", cores: 12 },
      { id: "a", cores: 4 },
      { id: "zero", cores: 0 },
      { id: "minus", cores: -0 },
    ];
    expect(order(rows, [buildAscTerm("cores")])).toEqual([
      "zero",
      "minus",
      "a",
      "b",
    ]);
  });

  it("orders every empty value last, in both directions", () => {
    const rows = [
      { id: "absent" },
      { id: "null", cores: null },
      { id: "nan", cores: Number.NaN },
      { id: "infinite", cores: Number.POSITIVE_INFINITY },
      { id: "text", cores: "8" },
      { id: "two", cores: 2 },
      { id: "one", cores: 1 },
    ];
    const empties = ["absent", "null", "nan", "infinite", "text"];
    expect(order(rows, [buildAscTerm("cores")])).toEqual([
      "one",
      "two",
      ...empties,
    ]);
    expect(order(rows, [buildDescTerm("cores")])).toEqual([
      "two",
      "one",
      ...empties,
    ]);
  });

  it("orders an unparseable or local-time date as empty", () => {
    const rows = [
      { id: "local", seen: "2026-01-02T06:00:00" },
      { id: "nonsense", seen: "yesterday" },
      { id: "rolled", seen: "2026-02-30" },
      { id: "invalid", seen: new Date(Number.NaN) },
      { id: "real", seen: "2026-01-02" },
    ];
    const empties = ["local", "nonsense", "rolled", "invalid"];
    expect(order(rows, [buildAscTerm("seen")])).toEqual(["real", ...empties]);
    expect(order(rows, [buildDescTerm("seen")])).toEqual(["real", ...empties]);
  });

  it("orders nothing by a term naming no field of the schema", () => {
    const rows = [
      { id: "b", region: "z" },
      { id: "a", region: "a" },
    ];
    expect(order(rows, [buildAscTerm("region")])).toEqual(["b", "a"]);
  });

  it("falls through to the next term on a tie", () => {
    const rows = [
      { id: "x", name: "same", cores: 8 },
      { id: "y", name: "same", cores: 2 },
      { id: "z", name: "same", cores: 5 },
    ];
    expect(order(rows, [buildAscTerm("name"), buildAscTerm("cores")])).toEqual([
      "y",
      "z",
      "x",
    ]);
  });

  it("falls through to the next term while both values are empty", () => {
    const rows = [
      { id: "x", cores: 8 },
      { id: "y", cores: 2 },
    ];
    expect(order(rows, [buildAscTerm("seen"), buildAscTerm("cores")])).toEqual([
      "y",
      "x",
    ]);
  });

  it("reads a field once per row when the tiebreak repeats it", () => {
    // Comparing one field twice can only tie, so the second key is never
    // read rather than read and discarded.
    const rows = [
      { id: "a", cores: 2 },
      { id: "b", cores: 1 },
    ];
    let reads = 0;
    const read: FieldReader = (row, field) => {
      reads += 1;
      return readProperty(row, field);
    };
    expect(
      order(rows, [buildAscTerm("cores")], {
        tiebreak: [buildDescTerm("cores")],
        read,
      }),
    ).toEqual(["b", "a"]);
    expect(reads).toBe(rows.length);
  });

  it("compares the source's named tiebreak after the ordering's own terms", () => {
    const rows = [
      { id: "x", name: "same", cores: 2 },
      { id: "y", name: "same", cores: 8 },
    ];
    expect(
      order(rows, [buildAscTerm("name")], {
        tiebreak: [buildDescTerm("cores")],
      }),
    ).toEqual(["y", "x"]);
  });

  it("leaves rows equal under an unnamed tiebreak in the order they came", () => {
    const rows = [
      { id: "b", name: "same" },
      { id: "a", name: "same" },
    ];
    expect(order(rows, [buildAscTerm("name")], { tiebreak: "none" })).toEqual([
      "b",
      "a",
    ]);
  });

  it("reads fields through a caller-supplied accessor", () => {
    const rows = [
      { id: "two", record: { cores: 2 } },
      { id: "one", record: { cores: 1 } },
    ];
    expect(
      order(rows, [buildAscTerm("cores")], {
        read: (row, field) =>
          (row as { record: Record<string, unknown> }).record[field],
      }),
    ).toEqual(["one", "two"]);
  });

  it("agrees with the declared collator over an adversarial list, in either arrival order", () => {
    const values = [
      "item10",
      "item2",
      "ITEM2",
      "eclair",
      "\u00e9clair",
      `e${String.fromCharCode(0x301)}clair`,
      " ",
      "Zebra",
      "apple",
      "Apple",
    ];
    const collator = new Intl.Collator(ROOT_NUMERIC_COLLATION, {
      usage: "sort",
    });
    for (const arrival of [values, [...values].reverse()]) {
      const rows = arrival.map((name) => ({ name }));
      expect(
        orderRows(rows, buildOrderConfig([buildAscTerm("name")])).map(
          (row) => row.name,
        ),
      ).toEqual([...arrival].sort(collator.compare));
    }
  });

  it("orders one way whatever order the rows arrive in, under a named tiebreak", () => {
    // The tiebreak orders inside the empty bucket too, so the rows with no
    // value for the term are as stably placed as the rows with one.
    const rows = [
      { id: "a", name: "a", cores: 2 },
      { id: "b", name: "b", cores: 2 },
      { id: "c", name: "c" },
      { id: "d", name: "d", cores: 1 },
      { id: "e", name: "e" },
    ];
    const byTiebreak = { tiebreak: [buildAscTerm("name")] };
    const straight = order(rows, [buildAscTerm("cores")], byTiebreak);
    const reversed = order(
      [...rows].reverse(),
      [buildAscTerm("cores")],
      byTiebreak,
    );
    expect(straight).toEqual(["d", "a", "b", "c", "e"]);
    expect(reversed).toEqual(straight);
  });

  it("orders one way whatever order the rows arrive in, over every kind at once", () => {
    // A comparison that was not a total order would place some permutation
    // of these rows differently; the tiebreak makes every row distinct.
    const rows = [
      {
        id: "a",
        name: "apple",
        status: "failed",
        cores: 4,
        seen: "2026-01-02",
        ready: true,
      },
      {
        id: "b",
        name: "Apple",
        status: "pending",
        cores: 4,
        seen: 0,
        ready: false,
      },
      {
        id: "c",
        name: "item2",
        status: "unknown",
        cores: Number.NaN,
        ready: null,
      },
      { id: "d", name: null, status: null, cores: 1, seen: new Date(0) },
      {
        id: "e",
        name: "item10",
        status: "running",
        cores: -3,
        seen: "2026-01-02T00:00:00Z",
      },
      { id: "f" },
    ];
    const terms = [
      buildAscTerm("ready"),
      buildDescTerm("status"),
      buildAscTerm("cores"),
      buildDescTerm("seen"),
    ];
    const byId = { schema: withId, tiebreak: [buildAscTerm("id")] };
    const listPermutations = (
      list: readonly (typeof rows)[number][],
    ): (typeof rows)[number][][] =>
      list.length <= 1
        ? [[...list]]
        : list.flatMap((row, index) =>
            listPermutations([
              ...list.slice(0, index),
              ...list.slice(index + 1),
            ]).map((rest) => [row, ...rest]),
          );
    const expected = order(rows, terms, byId);
    for (const arrival of listPermutations(rows)) {
      expect(order(arrival, terms, byId)).toEqual(expected);
    }
  });
});
