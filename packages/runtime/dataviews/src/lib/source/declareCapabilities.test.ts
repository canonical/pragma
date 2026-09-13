import { describe, expect, expectTypeOf, it } from "vitest";
import { byId } from "../../../testing/fixtures.js";
import { createCollection } from "../collection/index.js";
import declareCapabilities from "./declareCapabilities.js";
import type { CapabilityDeclaration } from "./types.js";

const machines = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "ready"] },
    { field: "cpu", kind: "number" },
    { field: "owner", kind: "flag" },
    { field: "name", kind: "text" },
  ],
});

type Declaration = CapabilityDeclaration<typeof machines.schema.fields>;

describe("declareCapabilities", () => {
  it("refuses everything an author does not declare", () => {
    expect(declareCapabilities(machines, {})).toEqual({
      filter: {},
      search: null,
      sort: {
        fields: [],
        terms: 0,
        default: [],
        tiebreak: "none",
        collation: null,
      },
      group: { fields: [], levels: 0, summaries: "none", collapse: false },
      counts: { pageable: "unknown", matched: "unknown", total: "unknown" },
      pagination: { kind: "offset" },
      selection: { scope: "explicit" },
      actions: {},
    });
  });

  it("builds the complete record from what is declared", () => {
    const declared = declareCapabilities(machines, {
      filter: { status: ["eq"], cpu: true },
      search: ["name", "note"],
      sort: {
        fields: ["cpu", "name"],
        terms: 2,
        default: [{ field: "name", direction: "asc" }],
        tiebreak: "opaque",
        collation: "en-u-kn-true",
      },
      counts: { pageable: "exact", matched: "at-least", total: "unknown" },
      pagination: { kind: "cursor", backward: false, durable: true },
      actions: { stop: { targets: "explicit", limit: 10 } },
    });
    expect(declared).toEqual({
      filter: { status: ["eq"], cpu: ["gte", "lte"] },
      search: { fields: ["name", "note"] },
      sort: {
        fields: ["cpu", "name"],
        terms: 2,
        default: [{ field: "name", direction: "asc" }],
        tiebreak: "opaque",
        collation: "en-u-kn-true",
      },
      group: { fields: [], levels: 0, summaries: "none", collapse: false },
      counts: { pageable: "exact", matched: "at-least", total: "unknown" },
      pagination: { kind: "cursor", backward: false, durable: true },
      selection: { scope: "explicit" },
      actions: { stop: { targets: "explicit", limit: 10 } },
    });
    expect(Object.isFrozen(declared)).toBe(true);
    expect(Object.isFrozen(declared.filter)).toBe(true);
  });

  it("declares sortable fields with the term limit the source states", () => {
    expect(
      declareCapabilities(machines, { sort: { fields: ["cpu"], terms: null } })
        .sort,
    ).toEqual({
      fields: ["cpu"],
      terms: null,
      default: [],
      tiebreak: "none",
      collation: null,
    });
  });

  it("leaves a field declared with no operator, an empty search and an undefined entry out", () => {
    // A JavaScript author may still spell an entry `undefined`.
    const declared = declareCapabilities(machines, {
      filter: { status: [], cpu: undefined },
      search: [],
    } as unknown as Declaration);
    expect(declared.filter).toEqual({});
    expect(declared.search).toBeNull();
  });

  it("refuses a field the schema does not have, or an operator its kind does not accept", () => {
    // Each of these is a compile error for a TypeScript author; a
    // JavaScript author meets the same refusal at construction.
    expect(() =>
      declareCapabilities(machines, {
        filter: { zone: ["eq"] },
      } as unknown as Declaration),
    ).toThrow('the schema has no field "zone" to filter');
    expect(() =>
      declareCapabilities(machines, {
        filter: { status: ["gte"] },
      } as unknown as Declaration),
    ).toThrow('field "status" cannot be filtered with gte');
    expect(() =>
      declareCapabilities(machines, {
        sort: { fields: ["zone"], terms: null },
      } as unknown as Declaration),
    ).toThrow('the schema has no field "zone" to sort by');
    expect(() =>
      declareCapabilities(machines, {
        sort: {
          fields: ["cpu"],
          terms: null,
          default: [{ field: "name", direction: "asc" }],
        },
      }),
    ).toThrow('the default ordering names "name", which is not sortable');
  });

  it("checks the declaration against the schema at compile time", () => {
    expectTypeOf<NonNullable<Declaration["filter"]>>().toEqualTypeOf<{
      readonly status?: readonly "eq"[] | true;
      readonly cpu?: readonly ("gte" | "lte")[] | true;
      readonly owner?: readonly "isSet"[] | true;
    }>();
    expectTypeOf<
      NonNullable<Declaration["sort"]>["fields"][number]
    >().toEqualTypeOf<"status" | "cpu" | "owner" | "name">();
    // Not declarable: no shipped source can execute either, so the record
    // refuses both and an author has nothing to spell.
    expectTypeOf<Declaration>().not.toHaveProperty("group");
    expectTypeOf<Declaration>().not.toHaveProperty("selection");
  });
});
