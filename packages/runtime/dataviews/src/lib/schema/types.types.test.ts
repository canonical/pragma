import { describe, expect, expectTypeOf, it } from "vitest";
import createSchema from "./createSchema.js";
import type { AppliedOf } from "./types.js";

const machines = createSchema([
  { field: "status", kind: "choices", options: ["failed", "cancelled"] },
  { field: "cpu", kind: "number" },
  { field: "owner", kind: "flag" },
  { field: "name", kind: "text" },
]);

/** The definition of one field, by its literal name. */
type FieldOf<TName extends string> = Extract<
  (typeof machines.fields)[number],
  { readonly field: TName }
>;

describe("schema type inference", () => {
  it("infers literal field names from the construction", () => {
    expectTypeOf<(typeof machines.fields)[number]["field"]>().toEqualTypeOf<
      "status" | "cpu" | "owner" | "name"
    >();
    expect(machines.fieldNames).toEqual(["status", "cpu", "owner", "name"]);
  });

  it("infers the applied semantic type per kind", () => {
    const status: AppliedOf<FieldOf<"status">> = new Set(["failed"]);
    const cpu: AppliedOf<FieldOf<"cpu">> = 4;
    const owner: AppliedOf<FieldOf<"owner">> = true;
    expect(status.has("failed")).toBe(true);
    expect(cpu).toBe(4);
    expect(owner).toBe(true);
  });

  it("applies no value for a text field, which carries no predicate", () => {
    expectTypeOf<AppliedOf<FieldOf<"name">>>().toEqualTypeOf<never>();
  });
});
