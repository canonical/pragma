/**
 * Record typing is the whole of what a polymorphic collection knows about
 * its types: the discriminator checked against the schema, which fields
 * apply to which type, and what type each selected identity was displayed
 * as. Every case is mutation-tested — dropping a guard, the scope index or
 * the memory's prune fails one.
 */
import { describe, expect, it } from "vitest";
import buildRowModel from "../../../testing/buildRowModel.js";
import { createChannel } from "../observable/index.js";
import { EMPTY_ROW_MODEL, type RowModel } from "../rows/index.js";
import { createSchema } from "../schema/index.js";
import { createSelection } from "../selection/index.js";
import createRecordTyping from "./createRecordTyping.js";

type Container = {
  readonly id: string;
  readonly type: "container";
  readonly processes?: number;
};
type VirtualMachine = {
  readonly id: string;
  readonly type: "virtual-machine";
  readonly secureboot?: string;
};
type Instance = Container | VirtualMachine;

const instances = () =>
  createSchema([
    {
      field: "type",
      kind: "choices",
      options: ["container", "virtual-machine"],
    },
    {
      field: "secureboot",
      kind: "choices",
      options: ["true", "false"],
      types: ["virtual-machine"],
    },
    { field: "processes", kind: "number", min: 0, types: ["container"] },
    { field: "name", kind: "flag" },
  ]);

const container = (id: string): Container => ({ id, type: "container" });
const machine = (id: string): VirtualMachine => ({
  id,
  type: "virtual-machine",
});

/** One typing over a model and a selection the case drives directly. */
const typing = (model: RowModel<Instance> = EMPTY_ROW_MODEL) => {
  const selection = createSelection();
  const rows = createChannel<RowModel<Instance>>(model);
  const record = createRecordTyping<
    ReturnType<typeof instances>["fields"],
    Instance
  >({ schema: instances(), field: "type", selection, rows });
  return { record, rows, selection };
};

const modelOf = (rows: readonly Instance[]): RowModel<Instance> =>
  buildRowModel({ rows });

describe("createRecordTyping", () => {
  it("publishes the discriminator and its names in declaration order", () => {
    const { declared } = typing().record;
    expect(declared).toEqual({
      field: "type",
      names: ["container", "virtual-machine"],
    });
    // Handed to every consumer of the provider, so nothing can rewrite the
    // collection's own type list through it.
    expect(Object.isFrozen(declared)).toBe(true);
    expect(Object.isFrozen(declared.names)).toBe(true);
  });

  it("refuses a discriminator the schema does not describe", () => {
    const schema = instances();
    expect(() =>
      createRecordTyping({
        schema,
        field: "kind",
        selection: createSelection(),
        rows: createChannel<RowModel<Instance>>(EMPTY_ROW_MODEL),
      }),
    ).toThrow('unknown discriminator field "kind"');
  });

  it("refuses a discriminator that is not a closed set of names", () => {
    expect(() =>
      createRecordTyping({
        schema: instances(),
        field: "name",
        selection: createSelection(),
        rows: createChannel<RowModel<Instance>>(EMPTY_ROW_MODEL),
      }),
    ).toThrow('discriminator field "name" must be a choices field, not a flag');
  });

  it("refuses a discriminator whose options are not names", () => {
    expect(() =>
      createRecordTyping({
        schema: createSchema([
          { field: "type", kind: "choices", options: [1] },
        ]),
        field: "type",
        selection: createSelection(),
        rows: createChannel<RowModel<object>>(EMPTY_ROW_MODEL),
      }),
    ).toThrow('discriminator field "type" requires string options');
  });

  it("refuses a field scoped to a type the discriminator does not offer", () => {
    expect(() =>
      createRecordTyping({
        schema: createSchema([
          { field: "type", kind: "choices", options: ["container"] },
          { field: "secureboot", kind: "flag", types: ["virtual-machine"] },
        ]),
        field: "type",
        selection: createSelection(),
        rows: createChannel<RowModel<object>>(EMPTY_ROW_MODEL),
      }),
    ).toThrow(
      'field "secureboot" is scoped to "virtual-machine", which is not a type of "type"',
    );
  });

  describe("applicability", () => {
    it("applies an unscoped field to every type", () => {
      const { record } = typing();
      expect(record.applicability("type", container("c-1"))).toBe("applies");
      expect(record.applicability("type", machine("v-1"))).toBe("applies");
    });

    it("applies a field the schema does not describe at all", () => {
      // A column showing something outside the schema has no scoping, and
      // absent scoping is every type.
      expect(typing().record.applicability("uptime", container("c-1"))).toBe(
        "applies",
      );
    });

    it("withholds a scoped field from a row of another type", () => {
      const { record } = typing();
      expect(record.applicability("secureboot", machine("v-1"))).toBe(
        "applies",
      );
      expect(record.applicability("secureboot", container("c-1"))).toBe(
        "not-applicable",
      );
      expect(record.applicability("processes", container("c-1"))).toBe(
        "applies",
      );
      expect(record.applicability("processes", machine("v-1"))).toBe(
        "not-applicable",
      );
    });

    it("withholds a scoped field from a row carrying no declared type", () => {
      const { record } = typing();
      const untyped = { id: "x", type: "sandbox" } as unknown as Instance;
      expect(record.applicability("secureboot", untyped)).toBe(
        "not-applicable",
      );
    });
  });

  describe("rejectionOf", () => {
    it("accepts a model whose every row carries a declared type", () => {
      const { record } = typing();
      expect(record.rejectionOf(modelOf([container("c-1"), machine("v-1")]))) //
        .toBeNull();
    });

    it("names the row and the value a model cannot be displayed for", () => {
      const { record } = typing();
      const rogue = { id: "x-1", type: "sandbox" } as unknown as Instance;
      expect(record.rejectionOf(modelOf([container("c-1"), rogue]))).toBe(
        'record type "sandbox" of row "x-1" is not declared',
      );
    });

    it("names a row carrying no discriminator value at all", () => {
      const { record } = typing();
      const rogue = { id: "x-1" } as unknown as Instance;
      expect(record.rejectionOf(modelOf([rogue]))).toBe(
        'record type undefined of row "x-1" is not declared',
      );
    });
  });

  describe("type memory", () => {
    it("reads a selected row's type from the rows on display", () => {
      const { record, selection } = typing(modelOf([machine("v-1")]));
      selection.set(["v-1"]);
      expect(record.recordType("v-1")).toBe("virtual-machine");
    });

    it("knows no type for an identity that is not selected", () => {
      const { record } = typing(modelOf([machine("v-1")]));
      expect(record.recordType("v-1")).toBeNull();
    });

    it("knows no type for a selected identity it never modelled", () => {
      // A selection a host restored over rows this provider has not seen:
      // "not loaded", never a type assumed from nothing.
      const displayed = modelOf([machine("v-1")]);
      const { record, rows, selection } = typing(displayed);
      selection.set(["gone", "v-1"]);
      record.remember(displayed);
      rows.set(EMPTY_ROW_MODEL);
      expect(record.recordType("gone")).toBeNull();
      expect(record.recordType("v-1")).toBe("virtual-machine");
    });

    it("keeps a selected row's type once its page is replaced", () => {
      const first = modelOf([machine("v-1"), container("c-1")]);
      const { record, rows, selection } = typing(first);
      selection.set(["v-1", "c-1"]);
      record.remember(first);
      rows.set(modelOf([machine("v-2")]));
      expect(record.recordType("v-1")).toBe("virtual-machine");
      expect(record.recordType("c-1")).toBe("container");
    });

    it("takes the type of a row selected on the page being left", () => {
      const first = modelOf([machine("v-1")]);
      const { record, rows, selection } = typing(first);
      selection.set(["v-1"]);
      // No read while it was displayed: the memory is taken on the way out.
      record.remember(first);
      rows.set(EMPTY_ROW_MODEL);
      expect(record.recordType("v-1")).toBe("virtual-machine");
    });

    it("answers from the row on display, never from an older memory", () => {
      const first = modelOf([machine("v-1")]);
      const { record, rows, selection } = typing(first);
      selection.set(["v-1"]);
      record.remember(first);
      // The identity comes back as a record of another type. Memory is for
      // the rows that are not displayed; it never overrules one that is.
      rows.set(modelOf([container("v-1")]));
      expect(record.recordType("v-1")).toBe("container");
    });

    it("re-takes the memory from the row displayed now", () => {
      const first = modelOf([machine("v-1")]);
      const { record, rows, selection } = typing(first);
      selection.set(["v-1"]);
      record.remember(first);
      const second = modelOf([container("v-1")]);
      rows.set(second);
      record.remember(second);
      rows.set(EMPTY_ROW_MODEL);
      expect(record.recordType("v-1")).toBe("container");
    });

    it("carries a remembered type through the pages that follow", () => {
      const first = modelOf([machine("v-1")]);
      const { record, rows, selection } = typing(first);
      selection.set(["v-1"]);
      record.remember(first);
      const second = modelOf([container("c-1")]);
      rows.set(second);
      // A second page the row is not on: the memory is not re-taken from a
      // model that never held it, it is carried.
      record.remember(second);
      rows.set(EMPTY_ROW_MODEL);
      expect(record.recordType("v-1")).toBe("virtual-machine");
    });

    it("drops the type of an identity that left the selection", () => {
      const first = modelOf([machine("v-1")]);
      const { record, rows, selection } = typing(first);
      selection.set(["v-1"]);
      record.remember(first);
      rows.set(EMPTY_ROW_MODEL);
      selection.remove(["v-1"]);
      expect(record.recordType("v-1")).toBeNull();
      // And the deselected identity is not carried into the next memory.
      record.remember(EMPTY_ROW_MODEL);
      selection.set(["v-1"]);
      expect(record.recordType("v-1")).toBeNull();
    });

    it("remembers nothing for a row whose type is not declared", () => {
      const rogue = { id: "x-1", type: "sandbox" } as unknown as Instance;
      const first = modelOf([rogue]);
      const { record, rows, selection } = typing(first);
      selection.set(["x-1"]);
      record.remember(first);
      rows.set(EMPTY_ROW_MODEL);
      expect(record.recordType("x-1")).toBeNull();
    });

    it("forgets everything when the scope rotates", () => {
      const first = modelOf([machine("v-1")]);
      const { record, rows, selection } = typing(first);
      selection.set(["v-1"]);
      record.remember(first);
      rows.set(EMPTY_ROW_MODEL);
      record.forget();
      expect(record.recordType("v-1")).toBeNull();
    });
  });
});
