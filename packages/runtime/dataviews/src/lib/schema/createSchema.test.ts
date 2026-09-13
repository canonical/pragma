import { describe, expect, it } from "vitest";
import createSchema from "./createSchema.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "cancelled"] },
  { field: "cpu", kind: "number", min: 0, max: 64 },
  { field: "memory", kind: "number" },
  { field: "owner", kind: "flag" },
  { field: "updated", kind: "date" },
  { field: "name", kind: "text" },
]);

describe("createSchema", () => {
  it("rejects empty, NUL and duplicate field names at construction", () => {
    expect(() => createSchema([{ field: "", kind: "flag" }])).toThrow(
      "non-empty",
    );
    expect(() => createSchema([{ field: "a\u0000b", kind: "flag" }])).toThrow(
      "NUL",
    );
    expect(() =>
      createSchema([
        { field: "zone", kind: "flag" },
        { field: "zone", kind: "flag" },
      ]),
    ).toThrow("duplicate");
    expect(() =>
      createSchema([
        { field: "zone", kind: "choices", options: ["north"] },
        { field: "zone", kind: "flag" },
      ]),
    ).toThrow("duplicate");
  });

  it("keeps a field's record-type scoping as a frozen copy", () => {
    const types = ["virtual-machine"];
    const scoped = createSchema([
      { field: "type", kind: "choices", options: ["container"], types },
      { field: "secureboot", kind: "flag", types },
    ]);
    types.push("container");
    // The copy answers, not the caller's array: a schema whose scoping
    // could change under it would scope a field one way per read.
    expect(scoped.fields[0].types).toEqual(["virtual-machine"]);
    expect(scoped.fields[1].types).toEqual(["virtual-machine"]);
    expect(Object.isFrozen(scoped.fields[0].types)).toBe(true);
    expect(scoped.fields[0].options).toEqual(["container"]);
  });

  it("leaves an unscoped field with no scoping at all", () => {
    expect(schema.fields[0]).not.toHaveProperty("types");
    expect(schema.fields[1]).not.toHaveProperty("types");
  });

  it("rejects a field scoped to no record type", () => {
    // The names themselves are the provider's to check against the
    // discriminator; an empty list is the one mistake only the schema sees.
    expect(() =>
      createSchema([{ field: "secureboot", kind: "flag", types: [] }]),
    ).toThrow('field "secureboot" is scoped to no record type');
  });

  it("rejects a field name the flat query grammar cannot spell", () => {
    // A field is addressed on the wire by its own name, so a name carrying
    // the operator delimiter or colliding with a reserved parameter is
    // rejected here rather than at the first URL that cannot be read back.
    expect(() =>
      createSchema([{ field: "updated__at", kind: "flag" }]),
    ).toThrow('schema field name "updated__at" must not contain "__"');
    expect(() => createSchema([{ field: "sort", kind: "flag" }])).toThrow(
      'field name "sort" is a reserved query parameter',
    );
    expect(() => createSchema([{ field: "page", kind: "flag" }])).toThrow(
      "reserved query parameter",
    );
  });

  it("rejects choices fields without options, non-finite options or colliding options", () => {
    expect(() =>
      createSchema([{ field: "status", kind: "choices", options: [] }]),
    ).toThrow("at least one option");
    expect(() =>
      createSchema([{ field: "value", kind: "choices", options: [1, "1"] }]),
    ).toThrow("colliding string forms");
    expect(() =>
      createSchema([
        {
          field: "value",
          kind: "choices",
          options: [Number.NaN, 2],
        },
      ]),
    ).toThrow("finite number options");
    expect(() =>
      createSchema([
        { field: "value", kind: "choices", options: [Number.NaN] },
      ]),
    ).toThrow("finite number options");
  });

  it("freezes its field list against caller mutations", () => {
    const schema = createSchema([
      { field: "status", kind: "choices", options: ["failed"] },
    ]);
    const stored = schema.fields as unknown as { push: () => void };
    expect(() => stored.push()).toThrow();
  });

  it("rejects number fields with non-finite or inverted bounds", () => {
    expect(() =>
      createSchema([{ field: "cpu", kind: "number", min: Number.NaN }]),
    ).toThrow("finite bounds");
    expect(() =>
      createSchema([
        { field: "cpu", kind: "number", max: Number.POSITIVE_INFINITY },
      ]),
    ).toThrow("finite bounds");
    expect(() =>
      createSchema([{ field: "cpu", kind: "number", min: 10, max: 0 }]),
    ).toThrow("inverted range");
  });

  it("answers lookups from frozen copies, immune to input mutation", () => {
    const options = ["failed"];
    const input = [{ field: "status", kind: "choices" as const, options }];
    const schema = createSchema(input);
    const numeric = { field: "cpu", kind: "number" as const, min: 0, max: 5 };
    const withBounds = createSchema([numeric]);
    // Caller mutations of the originals change nothing: "deployed" stays a
    // non-option, and the bound copy keeps min 0 / max 5 despite the edit.
    (options as string[]).push("deployed");
    (numeric as { max: number }).max = 10;
    expect(schema.predicateFor("status", "eq", ["deployed"])).toEqual({
      status: "invalid",
      reason: '"deployed" is not an option of "status"',
    });
    expect(withBounds.predicateFor("cpu", "gte", [4])).toEqual({
      status: "valid",
      predicate: { field: "cpu", operator: "gte", operands: [4] },
    });
    expect(withBounds.predicateFor("cpu", "gte", [7])).toEqual({
      status: "invalid",
      reason: "7 is above the maximum of 5",
    });
  });

  it("lists field names in definition order and answers membership", () => {
    expect(schema.fieldNames).toEqual([
      "status",
      "cpu",
      "memory",
      "owner",
      "updated",
      "name",
    ]);
    expect(schema.hasField("cpu")).toBe(true);
    expect(schema.hasField("zone")).toBe(false);
    expect(() =>
      (schema.fieldNames as unknown as { push: () => void }).push(),
    ).toThrow();
  });

  it("names the operators each kind accepts, and none for an unknown field", () => {
    expect(schema.listOperators("status")).toEqual(["eq"]);
    expect(schema.listOperators("cpu")).toEqual(["gte", "lte"]);
    expect(schema.listOperators("updated")).toEqual(["gte", "lte"]);
    expect(schema.listOperators("owner")).toEqual(["isSet"]);
    // Text is ordered: the grammar has no substring operator,
    // so nothing filters it.
    expect(schema.listOperators("name")).toEqual([]);
    expect(schema.listOperators("zone")).toEqual([]);
  });

  it("refuses every predicate over a text field", () => {
    expect(schema.predicateFor("name", "eq", ["alder"])).toEqual({
      status: "invalid",
      reason: 'text field "name" does not accept the eq operator',
    });
    expect(schema.validateInput("name", "alder")).toEqual({
      status: "invalid",
      reason: "text fields are ordered, not filtered",
    });
  });

  it("validates a choices input against the option set", () => {
    expect(schema.validateInput("status", "failed")).toEqual({
      status: "valid",
      operands: ["failed"],
    });
    expect(schema.validateInput("status", "deployed")).toEqual({
      status: "invalid",
      reason: '"deployed" is not an option of "status"',
    });
    expect(schema.validateInput("status", " failed ")).toEqual({
      status: "invalid",
      reason: '" failed " is not an option of "status"',
    });
    expect(schema.validateInput("status", "")).toEqual({
      status: "incomplete",
    });
  });

  it("validates number inputs with range enforcement", () => {
    expect(schema.validateInput("cpu", "4")).toEqual({
      status: "valid",
      operands: [4],
    });
    expect(schema.validateInput("cpu", "0")).toEqual({
      status: "valid",
      operands: [0],
    });
    expect(schema.validateInput("cpu", "64")).toEqual({
      status: "valid",
      operands: [64],
    });
    expect(schema.validateInput("cpu", "4.5")).toEqual({
      status: "valid",
      operands: [4.5],
    });
    expect(schema.validateInput("cpu", "")).toEqual({
      status: "incomplete",
    });
    expect(schema.validateInput("cpu", "-2")).toEqual({
      status: "invalid",
      reason: "-2 is below the minimum of 0",
    });
    expect(schema.validateInput("cpu", "99")).toEqual({
      status: "invalid",
      reason: "99 is above the maximum of 64",
    });
    for (const bad of ["four", "1e3", " 4", "+4"]) {
      expect(schema.validateInput("cpu", bad)).toEqual({
        status: "invalid",
        reason: "not a number",
      });
    }
  });

  it("accepts any finite number for unbounded number fields", () => {
    expect(schema.validateInput("memory", "-1")).toEqual({
      status: "valid",
      operands: [-1],
    });
  });

  it("validates date inputs as ISO-8601 calendar dates", () => {
    expect(schema.validateInput("updated", "2026-01-31")).toEqual({
      status: "valid",
      operands: ["2026-01-31"],
    });
    expect(schema.validateInput("updated", "2024-02-29")).toEqual({
      status: "valid",
      operands: ["2024-02-29"],
    });
    expect(schema.validateInput("updated", "2000-02-29")).toEqual({
      status: "valid",
      operands: ["2000-02-29"],
    });
    expect(schema.validateInput("updated", "")).toEqual({
      status: "incomplete",
    });
    for (const invalid of [
      "2026-02-30",
      "1900-02-29",
      "2026-04-31",
      "2026-06-31",
      "2026-09-31",
      "2026-11-31",
      "2026-13-01",
      "2026-00-15",
      "2026-01-00",
      "yesterday",
    ]) {
      expect(schema.validateInput("updated", invalid)).toEqual({
        status: "invalid",
        reason: `"${invalid}" is not an ISO-8601 calendar date (YYYY-MM-DD)`,
      });
    }
  });

  it("reports unknown fields as invalid", () => {
    expect(schema.validateInput("zone", "north")).toEqual({
      status: "invalid",
      reason: 'unknown field "zone"',
    });
  });

  it("refuses text-input editing for flag fields before other checks", () => {
    expect(schema.validateInput("owner", "1")).toEqual({
      status: "invalid",
      reason: "flag fields edit through direct commands",
    });
    expect(schema.validateInput("owner", "")).toEqual({
      status: "invalid",
      reason: "flag fields edit through direct commands",
    });
  });

  it("builds predicates with the kind's legal operators", () => {
    expect(
      schema.predicateFor("status", "eq", ["failed", "cancelled"]),
    ).toEqual({
      status: "valid",
      predicate: {
        field: "status",
        operator: "eq",
        operands: ["failed", "cancelled"],
      },
    });
    expect(schema.predicateFor("cpu", "gte", [4])).toEqual({
      status: "valid",
      predicate: { field: "cpu", operator: "gte", operands: [4] },
    });
    expect(schema.predicateFor("cpu", "lte", [64])).toEqual({
      status: "valid",
      predicate: { field: "cpu", operator: "lte", operands: [64] },
    });
    expect(schema.predicateFor("updated", "gte", ["2026-01-01"])).toEqual({
      status: "valid",
      predicate: {
        field: "updated",
        operator: "gte",
        operands: ["2026-01-01"],
      },
    });
    expect(schema.predicateFor("updated", "lte", ["2026-12-31"])).toEqual({
      status: "valid",
      predicate: {
        field: "updated",
        operator: "lte",
        operands: ["2026-12-31"],
      },
    });
    expect(schema.predicateFor("owner", "isSet", [])).toEqual({
      status: "valid",
      predicate: { field: "owner", operator: "isSet", operands: [] },
    });
  });

  it("rejects every operator no field kind accepts", () => {
    const cases: [
      string,
      "eq" | "gte" | "lte" | "isSet",
      readonly (string | number)[],
      string,
    ][] = [
      [
        "status",
        "gte",
        ["failed"],
        'choices field "status" does not accept the gte operator',
      ],
      [
        "status",
        "lte",
        ["failed"],
        'choices field "status" does not accept the lte operator',
      ],
      [
        "status",
        "isSet",
        [],
        'choices field "status" does not accept the isSet operator',
      ],
      ["cpu", "eq", [4], 'number field "cpu" does not accept the eq operator'],
      [
        "cpu",
        "isSet",
        [],
        'number field "cpu" does not accept the isSet operator',
      ],
      [
        "updated",
        "eq",
        ["2026-01-01"],
        'date field "updated" does not accept the eq operator',
      ],
      [
        "updated",
        "isSet",
        [],
        'date field "updated" does not accept the isSet operator',
      ],
      [
        "owner",
        "eq",
        ["x"],
        'flag field "owner" does not accept the eq operator',
      ],
      [
        "owner",
        "gte",
        [4],
        'flag field "owner" does not accept the gte operator',
      ],
      [
        "owner",
        "lte",
        [4],
        'flag field "owner" does not accept the lte operator',
      ],
    ];
    for (const [field, operator, operands, reason] of cases) {
      expect(schema.predicateFor(field, operator, operands)).toEqual({
        status: "invalid",
        reason,
      });
    }
  });

  it("rejects operands that violate the operator's grammar arity", () => {
    expect(schema.predicateFor("status", "eq", [])).toEqual({
      status: "invalid",
      reason: "eq predicate needs at least one operand",
    });
    expect(schema.predicateFor("cpu", "gte", [])).toEqual({
      status: "invalid",
      reason: "gte predicate needs exactly one operand",
    });
    expect(schema.predicateFor("cpu", "lte", [4, 8])).toEqual({
      status: "invalid",
      reason: "lte predicate needs exactly one operand",
    });
    expect(schema.predicateFor("owner", "isSet", ["x"])).toEqual({
      status: "invalid",
      reason: "isSet predicate takes no operands",
    });
  });

  it("enforces schema semantics on direct operands", () => {
    expect(schema.predicateFor("status", "eq", ["deployed"])).toEqual({
      status: "invalid",
      reason: '"deployed" is not an option of "status"',
    });
    expect(schema.predicateFor("cpu", "gte", [Number.NaN])).toEqual({
      status: "invalid",
      reason: "NaN is not a finite number",
    });
    expect(
      schema.predicateFor("cpu", "gte", [Number.POSITIVE_INFINITY]),
    ).toEqual({
      status: "invalid",
      reason: "Infinity is not a finite number",
    });
    expect(
      schema.predicateFor("cpu", "lte", [Number.NEGATIVE_INFINITY]),
    ).toEqual({
      status: "invalid",
      reason: "-Infinity is not a finite number",
    });
    expect(schema.predicateFor("cpu", "gte", [0])).toEqual({
      status: "valid",
      predicate: { field: "cpu", operator: "gte", operands: [0] },
    });
    expect(schema.predicateFor("cpu", "lte", [64])).toEqual({
      status: "valid",
      predicate: { field: "cpu", operator: "lte", operands: [64] },
    });
    expect(schema.predicateFor("cpu", "lte", [100])).toEqual({
      status: "invalid",
      reason: "100 is above the maximum of 64",
    });
    expect(schema.predicateFor("owner", "isSet", ["x"])).toEqual({
      status: "invalid",
      reason: "isSet predicate takes no operands",
    });
    expect(schema.predicateFor("updated", "gte", ["2026-13-01"])).toEqual({
      status: "invalid",
      reason: '"2026-13-01" is not an ISO-8601 calendar date (YYYY-MM-DD)',
    });
  });

  it("reports unknown fields from the direct path too", () => {
    expect(schema.predicateFor("zone", "eq", ["north"])).toEqual({
      status: "invalid",
      reason: 'unknown field "zone"',
    });
  });

  it("accepts number options in choices fields", () => {
    const numeric = createSchema([
      { field: "priority", kind: "choices", options: [1, 2, 3] },
    ]);
    expect(numeric.validateInput("priority", "2")).toEqual({
      status: "valid",
      operands: [2],
    });
    expect(numeric.predicateFor("priority", "eq", [2, 3])).toEqual({
      status: "valid",
      predicate: { field: "priority", operator: "eq", operands: [2, 3] },
    });
    // Strict matching: the string "2" is not the number option 2.
    expect(numeric.predicateFor("priority", "eq", ["2"])).toEqual({
      status: "invalid",
      reason: '"2" is not an option of "priority"',
    });
    expect(numeric.validateInput("priority", " 1")).toEqual({
      status: "invalid",
      reason: '" 1" is not an option of "priority"',
    });
  });
});
