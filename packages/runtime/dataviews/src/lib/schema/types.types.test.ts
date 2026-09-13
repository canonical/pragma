import { describe, expect, expectTypeOf, it } from "vitest";
import createSchema from "./createSchema.js";
import type { AppliedValues } from "./types.js";

const machines = createSchema([
  { field: "status", kind: "choices", options: ["failed", "cancelled"] },
  { field: "cpu", kind: "number" },
  { field: "owner", kind: "flag" },
  { field: "name", kind: "text" },
]);

type MachinesFields = AppliedValues<typeof machines.fields>;

describe("schema type inference", () => {
  it("infers literal field names from the construction", () => {
    const names: (keyof MachinesFields)[] = ["status", "cpu", "owner"];
    expect(names.sort()).toEqual(["cpu", "owner", "status"]);
  });

  it("infers the applied semantic type per kind", () => {
    const status: MachinesFields["status"] = new Set(["failed"]);
    const cpu: MachinesFields["cpu"] = 4;
    const owner: MachinesFields["owner"] = true;
    expect(status.has("failed")).toBe(true);
    expect(cpu).toBe(4);
    expect(owner).toBe(true);
  });

  it("maps no applied value for a text field, which carries no predicate", () => {
    expectTypeOf<keyof MachinesFields>().toEqualTypeOf<
      "status" | "cpu" | "owner"
    >();
  });
});
