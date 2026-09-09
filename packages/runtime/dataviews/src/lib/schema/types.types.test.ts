import { describe, expect, it } from "vitest";
import createSchema from "./createSchema.js";
import type { SchemaFields } from "./types.js";

const machines = createSchema([
  { field: "status", kind: "choices", options: ["failed", "cancelled"] },
  { field: "cpu", kind: "number" },
  { field: "owner", kind: "flag" },
]);

type MachinesFields = SchemaFields<typeof machines.fields>;

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
});
