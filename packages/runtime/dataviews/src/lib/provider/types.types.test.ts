/**
 * The discriminator's whole job is to refuse: a field that cannot name a
 * record's type must not compile as one. Every rejection below is pinned
 * with `@ts-expect-error`, which fails the build if the type starts
 * accepting the case.
 */
import { describe, expect, it } from "vitest";
import type { RowRecord } from "../rows/index.js";
import { createSchema } from "../schema/index.js";
import type { DiscriminatorField } from "./types.js";

const instances = createSchema([
  { field: "type", kind: "choices", options: ["container", "virtual-machine"] },
  { field: "rank", kind: "choices", options: [1, 2] },
  { field: "status", kind: "flag" },
]);

type Fields = typeof instances.fields;
type Discriminator<TRow extends object> = DiscriminatorField<Fields, TRow>;

type Container = { readonly id: string; readonly type: "container" };
type VirtualMachine = { readonly id: string; readonly type: "virtual-machine" };

describe("DiscriminatorField", () => {
  it("names a choices field the row carries with a matching value", () => {
    const precise: Discriminator<Container | VirtualMachine> = "type";
    // An adapter typing the key wider still carries the options.
    const wide: Discriminator<{ readonly type: string }> = "type";
    // The default row shape says nothing about its values, so it carries
    // any of them.
    const loose: Discriminator<RowRecord> = "type";
    expect([precise, wide, loose]).toEqual(["type", "type", "type"]);
  });

  it("refuses a field the row does not carry", () => {
    // @ts-expect-error the row has no "type" key to read a type from
    const absent: Discriminator<{ readonly id: string }> = "type";
    expect(absent).toBe("type");
  });

  it("refuses a key the row may not have", () => {
    // A row that may carry no value at the key carries no type, and would
    // fail every completion at runtime.
    // @ts-expect-error "type" is optional on this row
    const optional: Discriminator<{ readonly type?: "container" }> = "type";
    expect(optional).toBe("type");
  });

  it("refuses a value outside the field's options", () => {
    // @ts-expect-error "sandbox" is not one of the field's options
    const outside: Discriminator<{ readonly type: "sandbox" }> = "type";
    expect(outside).toBe("type");
  });

  it("refuses a field that is not a closed set of names", () => {
    // @ts-expect-error a flag field has no options to name types with
    const flag: Discriminator<{ readonly status: boolean }> = "status";
    // @ts-expect-error a choices field of numbers names no types
    const numeric: Discriminator<{ readonly rank: 1 | 2 }> = "rank";
    expect([flag, numeric]).toEqual(["status", "rank"]);
  });
});
