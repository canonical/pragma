import { describe, expect, it } from "vitest";
import createCollection from "./createCollection.js";

type Container = { readonly id: string; readonly type: "container" };
type VirtualMachine = { readonly id: string; readonly type: "virtual-machine" };
type Instance = Container | VirtualMachine;

const byId = (instance: Instance): string => instance.id;

describe("createCollection", () => {
  it("declares the schema, the identity and no types by default", () => {
    const collection = createCollection({
      identify: byId,
      fields: [{ field: "id", kind: "text" }],
    });
    expect(collection.schema.fieldNames).toEqual(["id"]);
    expect(collection.identify({ id: "c-1", type: "container" })).toBe("c-1");
    expect(collection.types).toBeNull();
    expect(Object.isFrozen(collection)).toBe(true);
  });

  it("publishes the discriminator and its names in declaration order", () => {
    const { types } = createCollection({
      identify: byId,
      discriminator: "type",
      fields: [
        {
          field: "type",
          kind: "choices",
          options: ["container", "virtual-machine"],
        },
        { field: "processes", kind: "number", appliesTo: ["container"] },
      ],
    });
    expect(types).toEqual({
      field: "type",
      names: ["container", "virtual-machine"],
    });
    // Handed to every consumer of the collection, so nothing can rewrite
    // the collection's own type list through it.
    expect(Object.isFrozen(types)).toBe(true);
    expect(Object.isFrozen(types?.names)).toBe(true);
  });

  it("refuses a discriminator the schema does not describe", () => {
    expect(() =>
      createCollection({
        identify: byId,
        fields: [{ field: "type", kind: "choices", options: ["container"] }],
        discriminator: "kind" as "type",
      }),
    ).toThrow('unknown discriminator field "kind"');
  });

  it("refuses a discriminator that is not a closed set of names", () => {
    expect(() =>
      createCollection({
        identify: (row: { readonly id: string; readonly name: boolean }) =>
          row.id,
        fields: [
          { field: "type", kind: "choices", options: ["container"] },
          { field: "name", kind: "flag" },
        ],
        discriminator: "name" as never,
      }),
    ).toThrow('discriminator field "name" must be a choices field, not a flag');
  });

  it("refuses a discriminator whose options are not names", () => {
    expect(() =>
      createCollection({
        identify: (row: { readonly id: string; readonly rank: number }) =>
          row.id,
        fields: [{ field: "rank", kind: "choices", options: [1, 2] }],
        discriminator: "rank" as never,
      }),
    ).toThrow('discriminator field "rank" requires string options');
  });

  it("refuses a field scoped to a type the discriminator does not offer", () => {
    expect(() =>
      createCollection({
        identify: byId,
        discriminator: "type",
        fields: [
          { field: "type", kind: "choices", options: ["container"] },
          { field: "secureboot", kind: "flag", appliesTo: ["virtual-machine"] },
        ],
      }),
    ).toThrow(
      'field "secureboot" is scoped to "virtual-machine", which is not a type of "type"',
    );
  });
});
