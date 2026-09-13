/**
 * Record typing is what a polymorphic collection knows about its types at
 * runtime: which fields apply to which type, and what type each selected
 * identity was displayed as. The declaration itself is the collection's
 * and is tested with it. Every case is mutation-tested — dropping the scope
 * index or the memory's prune fails one.
 */
import { describe, expect, it } from "vitest";
import buildRowModel from "../../../testing/buildRowModel.js";
import { createCollection } from "../collection/index.js";
import { createChannel } from "../observable/index.js";
import { EMPTY_ROW_MODEL, type RowModel } from "../rows/index.js";
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

const byId = (instance: Instance): string => instance.id;

const instances = () =>
  createCollection({
    identify: byId,
    discriminator: "type",
    fields: [
      {
        field: "type",
        kind: "choices",
        options: ["container", "virtual-machine"],
      },
      {
        field: "secureboot",
        kind: "choices",
        options: ["true", "false"],
        appliesTo: ["virtual-machine"],
      },
      { field: "processes", kind: "number", min: 0, appliesTo: ["container"] },
      { field: "name", kind: "flag" },
    ],
  });

const container = (id: string): Container => ({ id, type: "container" });
const machine = (id: string): VirtualMachine => ({
  id,
  type: "virtual-machine",
});

/** One typing over a model and a selection the case drives directly. */
const typing = (model: RowModel<Instance> = EMPTY_ROW_MODEL) => {
  const selection = createSelection();
  const rows = createChannel<RowModel<Instance>>(model);
  const record = createRecordTyping({
    collection: instances(),
    selection,
    rows,
  });
  return { record, rows, selection };
};

const modelOf = (rows: readonly Instance[]): RowModel<Instance> =>
  buildRowModel({ identify: byId, rows });

describe("createRecordTyping", () => {
  it("refuses to build over a monomorphic collection", () => {
    expect(() =>
      createRecordTyping({
        collection: createCollection({ fields: [], identify: byId }),
        selection: createSelection(),
        rows: createChannel<RowModel<Instance>>(EMPTY_ROW_MODEL),
      }),
    ).toThrow("a monomorphic collection has no record typing to build");
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

    it("forgets everything when reset begins the next generation", () => {
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
