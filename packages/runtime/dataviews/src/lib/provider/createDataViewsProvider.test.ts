import { describe, expect, it, vi } from "vitest";
import DEFAULT_WINDOW from "../query/defaultWindow.js";
import type { Slice } from "../query/types.js";
import type { Completion } from "../result/types.js";
import createSchema from "../schema/createSchema.js";
import { declaring, sorting } from "../source/capabilities.fixtures.js";
import createDataViewsProvider from "./createDataViewsProvider.js";
import type { RecordTypes } from "./types.js";

const machinesSchema = () =>
  createSchema([
    { field: "status", kind: "choices", options: ["failed", "cancelled"] },
    { field: "cpu", kind: "number", min: 0, max: 64 },
    { field: "owner", kind: "flag" },
    { field: "updated", kind: "date" },
  ]);

const provider = () => createDataViewsProvider({ schema: machinesSchema() });

const EMPTY_SLICE: Slice = { filter: [], search: null, sort: [], group: [] };

const exact = (value: number) => ({ kind: "exact" as const, value });

/** One page delivered, with the exact counts a complete source reports. */
const delivered = <TRow extends object>(
  rows: readonly TRow[],
): Completion<TRow> => ({
  status: "succeeded",
  page: {
    rows,
    groups: null,
    counts: {
      visible: exact(rows.length),
      matched: exact(rows.length),
      total: exact(rows.length),
    },
    more: false,
    cursors: null,
  },
});

const FAILED: Completion = {
  status: "failed",
  failure: { reason: "offline", cause: null, transient: true },
};

const REFUSED: Completion = {
  status: "refused",
  refusals: [
    {
      part: "sort",
      code: "undeclared-field",
      field: "cpu",
      operator: null,
      reason: 'field "cpu" cannot be ordered',
    },
  ],
};

/** Refresh and return the request id, failing loudly rather than casting. */
const refreshRequest = (p: {
  readonly refresh: () => string | null;
}): string => {
  const requestId = p.refresh();
  if (requestId === null) {
    throw new Error("expected a refresh request");
  }
  return requestId;
};

describe("createDataViewsProvider", () => {
  it("assembles scope identity, schema, selection and field handles", () => {
    const p = provider();
    expect(p.schema.fieldNames).toEqual(["status", "cpu", "owner", "updated"]);
    expect(p.selection.state.get().ids.size).toBe(0);
    expect(Object.keys(p.fields).sort()).toEqual([
      "cpu",
      "owner",
      "status",
      "updated",
    ]);
    // Exactly the operators each kind admits, and no others: a field that
    // offered one more would offer a predicate the schema refuses.
    expect(Object.keys(p.fields.cpu).sort()).toEqual(["gte", "lte"]);
    expect(Object.keys(p.fields.updated).sort()).toEqual(["gte", "lte"]);
    expect(Object.keys(p.fields.status)).toEqual(["eq"]);
    expect(Object.keys(p.fields.owner)).toEqual(["isSet"]);
  });

  it("routes a valid field edit through the coordinator as a request", () => {
    const p = provider();
    const published: string[] = [];
    p.state.subscribe(() => {
      published.push(p.state.get().result.status);
    });
    p.fields.cpu.gte.edit("4");
    expect(p.state.get().result.status).toBe("pending");
    expect(published).toEqual(["pending"]);
    expect(p.state.get().slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
  });

  it("retains the predicate through an invalid edit", () => {
    const p = provider();
    p.fields.cpu.gte.edit("4");
    p.fields.cpu.gte.edit("four");
    expect(p.fields.cpu.gte.state.get().feedback).toEqual({
      status: "invalid",
      reason: "not a number",
      retainsPredicate: true,
    });
    expect(p.state.get().slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
  });

  it("sets multi-value operands directly and publishes the applied set", () => {
    const p = provider();
    p.fields.status.eq.set(["failed", "cancelled"]);
    expect(p.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed", "cancelled"] },
    ]);
    const applied = p.fields.status.eq.applied.get();
    expect(applied.kind).toBe("value");
    if (applied.kind === "value") {
      expect(applied.value).toEqual(new Set(["failed", "cancelled"]));
    }
  });

  it("publishes the applied value on a valid input edit", () => {
    const p = provider();
    p.fields.cpu.gte.edit("4");
    expect(p.fields.cpu.gte.applied.get()).toEqual({ kind: "value", value: 4 });
    p.fields.updated.lte.edit("2026-02-28");
    expect(p.fields.updated.lte.applied.get()).toEqual({
      kind: "value",
      value: "2026-02-28",
    });
  });

  it("publishes an applied value only when it moves", () => {
    const p = provider();
    let notifications = 0;
    p.fields.cpu.gte.applied.subscribe(() => {
      notifications += 1;
    });
    p.fields.cpu.gte.edit("4");
    p.fields.cpu.gte.edit("4");
    expect(notifications).toBe(1);
    p.fields.cpu.gte.edit("8");
    expect(notifications).toBe(2);
  });

  it("sets a flag field's predicate directly", () => {
    const p = provider();
    p.fields.owner.isSet.set([]);
    expect(p.state.get().slice.filter).toEqual([
      { field: "owner", operator: "isSet", operands: [] },
    ]);
    expect(p.fields.owner.isSet.applied.get()).toEqual({
      kind: "value",
      value: true,
    });
  });

  it("compares applied sets by membership, not reference", () => {
    const p = provider();
    let notifications = 0;
    p.fields.status.eq.applied.subscribe(() => {
      notifications += 1;
    });
    p.fields.status.eq.set(["failed", "cancelled"]);
    // Same members, different Set instance: no notification.
    p.fields.status.eq.set(["cancelled", "failed"]);
    expect(notifications).toBe(1);
    p.fields.status.eq.set(["failed"]);
    expect(notifications).toBe(2);
    // A set containing a non-option is rejected whole; nothing changes.
    p.fields.status.eq.set(["failed", "deployed"]);
    expect(notifications).toBe(2);
    // Same size, different membership: it IS a change.
    p.fields.status.eq.set(["cancelled"]);
    expect(notifications).toBe(3);
  });

  it("drops a direct set that violates schema semantics", () => {
    const p = provider();
    p.fields.status.eq.set(["deployed"]);
    expect(p.state.get().slice.filter).toEqual([]);
    expect(p.fields.status.eq.applied.get()).toEqual({ kind: "empty" });
  });

  it("clears a field's predicate explicitly", () => {
    const p = provider();
    p.fields.cpu.gte.edit("4");
    p.fields.cpu.gte.clear();
    expect(p.state.get().slice.filter).toEqual([]);
    expect(p.fields.cpu.gte.applied.get()).toEqual({ kind: "empty" });
    expect(p.fields.cpu.gte.state.get().input).toBe("");
  });

  it("navigates the window and replaces sort and search", () => {
    const p = provider();
    p.navigateWindow({ page: 2 });
    expect(p.state.get().window).toEqual({ ...DEFAULT_WINDOW, page: 2 });
    p.navigateWindow({ size: 25, cursor: "page-2" });
    expect(p.state.get().window).toEqual({
      ...DEFAULT_WINDOW,
      page: 2,
      size: 25,
      cursor: "page-2",
    });
    p.setSort([{ field: "updated", direction: "desc" }]);
    expect(p.state.get().slice.sort).toEqual([
      { field: "updated", direction: "desc" },
    ]);
    p.setSearch("yak");
    expect(p.state.get().slice.search).toBe("yak");
  });

  it("groups and collapses through the coordinator", () => {
    const p = provider();
    let requests = 0;
    p.state.subscribe(() => {
      requests += 1;
    });
    p.setGroup([{ field: "status" }]);
    expect(p.state.get().slice.group).toEqual([{ field: "status" }]);
    expect(p.state.get().result.status).toBe("pending");
    p.setCollapsed([["failed"]]);
    expect(p.state.get().window.collapsed).toEqual([["failed"]]);
    expect(requests).toBe(2);
    // Restating either is not a change, so neither issues a request.
    p.setGroup([{ field: "status" }]);
    p.setCollapsed([["failed"]]);
    expect(requests).toBe(2);
    // Regrouping leaves no collapsed path that still means what it meant.
    p.setGroup([{ field: "owner" }]);
    expect(p.state.get().window.collapsed).toEqual([]);
    expect(requests).toBe(3);
  });

  it("adopts external query state and syncs every field's applied mirror", () => {
    const p = provider();
    const adopted: Slice = {
      filter: [
        { field: "status", operator: "eq", operands: ["failed"] },
        { field: "cpu", operator: "gte", operands: [4] },
      ],
      search: "yak",
      sort: [],
      group: [],
    };
    const requestId = p.adopt({ slice: adopted, window: DEFAULT_WINDOW });
    expect(requestId).not.toBeNull();
    expect(p.fields.status.eq.applied.get()).toEqual({
      kind: "value",
      value: new Set(["failed"]),
    });
    expect(p.fields.cpu.gte.applied.get()).toEqual({ kind: "value", value: 4 });
    expect(p.fields.cpu.gte.state.get().input).toBe("4");
    expect(p.fields.cpu.lte.applied.get()).toEqual({ kind: "empty" });
  });

  it("publishes nothing on an idempotent clear", () => {
    const p = provider();
    let notifications = 0;
    p.state.subscribe(() => {
      notifications += 1;
    });
    // The field never had a predicate; clearing must not pretend to change.
    p.fields.cpu.gte.clear();
    expect(notifications).toBe(0);
    expect(p.state.get().slice.filter).toEqual([]);
    expect(p.fields.cpu.gte.applied.get()).toEqual({ kind: "empty" });
  });

  it("completes requests through the coordinator and publishes results", () => {
    const p = provider();
    const requestId = refreshRequest(p);
    expect(p.complete(requestId, delivered([{ id: "machine-1" }]))).toBe(true);
    expect(p.state.get().result.rows).toEqual([{ id: "machine-1" }]);
    expect(p.state.get().result.status).toBe("ready");
    expect(p.state.get().result.counts).toEqual({
      visible: exact(1),
      matched: exact(1),
      total: exact(1),
    });
  });

  it("captures the selection revision when invoking an action", () => {
    const p = provider();
    const first = p.invokeAction({ targets: ["machine-1"] });
    expect(first.state.selectionRevision).toBe(0);
    expect(first.state.payload).toBeUndefined();
    p.selection.toggle("machine-1");
    const second = p.invokeAction({
      targets: ["machine-1", "machine-2"],
      payload: { action: "restart" },
    });
    expect(second.state.selectionRevision).toBe(1);
    expect(second.state.payload).toEqual({ action: "restart" });
  });

  it("resets selection and fields on scope rotation", () => {
    const p = provider();
    p.selection.toggle("machine-1");
    p.fields.cpu.gte.edit("4");
    const scopeBefore = p.state.get().scope;
    p.rotateScope();
    expect(p.selection.state.get().ids.size).toBe(0);
    expect(p.fields.cpu.gte.applied.get()).toEqual({ kind: "empty" });
    expect(p.state.get().scope).not.toBe(scopeBefore);
    expect(p.state.get().slice.filter).toEqual([]);
  });

  it("ignores completions of requests it never issued", () => {
    const p = provider();
    let notifications = 0;
    p.state.subscribe(() => {
      notifications += 1;
    });
    expect(p.complete("i999:r9", delivered([{ id: "ghost" }]))).toBe(false);
    expect(notifications).toBe(0);
    expect(p.state.get().result.status).toBe("idle");
  });

  it("dies on dispose", () => {
    const p = provider();
    p.dispose();
    expect(p.state.get().disposed).toBe(true);
    expect(p.refresh()).toBeNull();
    expect(p.adopt({ slice: EMPTY_SLICE, window: DEFAULT_WINDOW })).toBeNull();
  });

  it("publishes the shared row model when a request succeeds", () => {
    const p = provider();
    const requestId = refreshRequest(p);
    p.complete(requestId, delivered([{ id: "m-1" }, { id: "m-2" }]));
    expect(p.rows.get().ids).toEqual(["m-1", "m-2"]);
    expect(p.rows.get().byId("m-2")).toEqual({ id: "m-2" });
  });

  it("carries row entries across a republication of the same records", () => {
    const p = provider();
    const rows = [{ id: "m-1" }];
    p.complete(refreshRequest(p), delivered(rows));
    const first = p.rows.get();
    p.complete(refreshRequest(p), delivered([...rows]));
    expect(p.rows.get()).toBe(first);
  });

  it("fails the whole completion when a record has no usable identity", () => {
    const p = provider();
    const requestId = refreshRequest(p);
    expect(p.complete(requestId, delivered([{ name: "unidentified" }]))).toBe(
      true,
    );
    expect(p.rows.get().ids).toEqual([]);
    const { result } = p.state.get();
    expect(result.status).toBe("failed");
    expect(result.problem).toMatchObject({
      status: "failed",
      failure: {
        reason: "row record has no non-empty string id",
        transient: false,
      },
    });
  });

  it("fails a completion whose records claim one identity", () => {
    const p = provider();
    p.complete(refreshRequest(p), delivered([{ id: "m-1" }]));
    const retained = p.rows.get();
    p.complete(refreshRequest(p), delivered([{ id: "m-2" }, { id: "m-2" }]));
    // The rows still answer the query, so they are kept and the refresh is
    // reported as failed over them — never replaced by rows nothing can key.
    expect(p.rows.get()).toBe(retained);
    expect(p.state.get().result.status).toBe("refreshFailed");
    expect(p.state.get().result.problem).toMatchObject({
      status: "failed",
      failure: { reason: 'duplicate row id "m-2"' },
    });
  });

  it("identifies records through a declared identifier", () => {
    const p = createDataViewsProvider<
      ReturnType<typeof machinesSchema>["fields"],
      { readonly uuid: string }
    >({
      schema: machinesSchema(),
      identify: (row) => row.uuid,
    });
    p.complete(refreshRequest(p), delivered([{ uuid: "a" }]));
    expect(p.rows.get().ids).toEqual(["a"]);
  });

  it("retains the row model when a request fails or is refused", () => {
    const p = provider();
    p.complete(refreshRequest(p), delivered([{ id: "m-1" }]));
    const retained = p.rows.get();
    p.complete(refreshRequest(p), FAILED);
    expect(p.rows.get()).toBe(retained);
    expect(p.state.get().result.status).toBe("refreshFailed");
    expect(p.state.get().result.problem).toEqual({
      status: "failed",
      failure: { reason: "offline", cause: null, transient: true },
    });
    p.complete(refreshRequest(p), REFUSED);
    expect(p.rows.get()).toBe(retained);
    expect(p.state.get().result.problem).toMatchObject({ status: "refused" });
  });

  it("discards the row model of a superseded request", () => {
    const p = provider();
    const stale = refreshRequest(p);
    p.setSearch("failed");
    p.complete(stale, delivered([{ id: "m-1" }]));
    expect(p.rows.get().ids).toEqual([]);
  });

  it("builds nothing for a delivery of a request already settled", () => {
    const identify = vi.fn((row: { readonly id: string }) => row.id);
    const p = createDataViewsProvider<
      ReturnType<typeof machinesSchema>["fields"],
      { readonly id: string }
    >({ schema: machinesSchema(), identify });
    const settled = refreshRequest(p);
    p.complete(settled, delivered([{ id: "m-1" }]));
    identify.mockClear();
    let notifications = 0;
    p.state.subscribe(() => {
      notifications += 1;
    });
    expect(p.complete(settled, delivered([{ id: "m-2" }]))).toBe(false);
    expect(identify).not.toHaveBeenCalled();
    expect(notifications).toBe(0);
    expect(p.rows.get().ids).toEqual(["m-1"]);
  });

  it("empties the row model when the scope rotates", () => {
    const p = provider();
    p.complete(refreshRequest(p), delivered([{ id: "m-1" }]));
    p.rotateScope();
    expect(p.rows.get().ids).toEqual([]);
  });

  it("adopts an identical state without notifying", () => {
    const p = provider();
    let notifications = 0;
    p.state.subscribe(() => {
      notifications += 1;
    });
    expect(p.adopt({ slice: EMPTY_SLICE, window: DEFAULT_WINDOW })).toBeNull();
    expect(notifications).toBe(0);
  });

  it("carries the source's declaration as a frozen copy, or null", () => {
    expect(provider().capabilities).toBeNull();
    const declared = declaring({
      filter: { status: ["eq"] },
      sort: sorting(["cpu"], 1),
    });
    const p = createDataViewsProvider({
      schema: machinesSchema(),
      capabilities: declared,
    });
    expect(p.capabilities).toEqual(declared);
    expect(p.capabilities).not.toBe(declared);
    expect(Object.isFrozen(p.capabilities)).toBe(true);
    expect(Object.isFrozen(p.capabilities?.filter.status)).toBe(true);
  });
});

describe("createDataViewsProvider record types", () => {
  type Container = { readonly id: string; readonly type: "container" };
  type VirtualMachine = {
    readonly id: string;
    readonly type: "virtual-machine";
    readonly secureboot?: string;
  };
  type Instance = Container | VirtualMachine;

  const instancesSchema = () =>
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
    ]);

  const instances = () =>
    createDataViewsProvider<
      ReturnType<typeof instancesSchema>["fields"],
      Instance
    >({ schema: instancesSchema(), types: { field: "type" } });

  const container = (id: string): Container => ({ id, type: "container" });
  const machine = (id: string): VirtualMachine => ({
    id,
    type: "virtual-machine",
  });

  it("publishes the declared types, and null without them", () => {
    const declared = instances().types;
    expect(declared).toEqual({
      field: "type",
      names: ["container", "virtual-machine"],
    });
    expect(Object.isFrozen(declared)).toBe(true);
    expect(provider().types).toBeNull();
  });

  it("takes only a field that can name a record's type", () => {
    type Declaration = RecordTypes<
      ReturnType<typeof instancesSchema>["fields"],
      Instance
    >;
    const legal: Declaration = { field: "type" };
    // @ts-expect-error a choices field, but not the key this row union
    // carries its type in
    const illegal: Declaration = { field: "secureboot" };
    expect([legal.field, illegal.field]).toEqual(["type", "secureboot"]);
  });

  it("refuses a discriminator the types could not see", () => {
    expect(() =>
      createDataViewsProvider({
        schema: machinesSchema(),
        // As a provider whose row type was erased would reach it.
        types: { field: "owner" } as { field: never },
      }),
    ).toThrow('discriminator field "owner" must be a choices field');
  });

  it("answers whether a field applies to a row", () => {
    const p = instances();
    expect(p.applicability("secureboot", machine("v-1"))).toBe("applies");
    expect(p.applicability("secureboot", container("c-1"))).toBe(
      "not-applicable",
    );
  });

  it("fails a completion carrying a row of an undeclared type", () => {
    const p = instances();
    p.complete(refreshRequest(p), delivered([machine("v-1")]));
    const retained = p.rows.get();
    const rogue = { id: "x-1", type: "sandbox" } as unknown as Instance;
    expect(p.complete(refreshRequest(p), delivered([rogue]))).toBe(true);
    // Never displayed: the rows already on screen stay, and the refresh is
    // reported as failed over them.
    expect(p.rows.get()).toBe(retained);
    expect(p.state.get().result.status).toBe("refreshFailed");
    expect(p.state.get().result.problem).toMatchObject({
      status: "failed",
      failure: {
        reason: 'record type "sandbox" of row "x-1" is not declared',
        transient: false,
      },
    });
  });

  it("reads no row for a type when the same records come back", () => {
    let reads = 0;
    const counted = new Proxy(
      { id: "v-1", type: "virtual-machine" },
      {
        get(target, key) {
          if (key === "type") {
            reads += 1;
          }
          return Reflect.get(target, key);
        },
      },
    ) as Instance;
    const p = instances();
    p.complete(refreshRequest(p), delivered([counted]));
    const checked = reads;
    expect(checked).toBeGreaterThan(0);
    p.complete(refreshRequest(p), delivered([counted]));
    // The model came back whole, so its rows were checked once and are not
    // read again: they were already accepted and have not changed since.
    expect(reads).toBe(checked);
  });

  it("remembers the type of a record selected on an earlier page", () => {
    const p = instances();
    p.complete(
      refreshRequest(p),
      delivered([machine("v-1"), container("c-1")]),
    );
    p.selection.set(["v-1", "c-1"]);
    p.complete(refreshRequest(p), delivered([machine("v-2")]));
    expect(p.rows.get().byId("v-1")).toBeUndefined();
    expect(p.recordType("v-1")).toBe("virtual-machine");
    expect(p.recordType("c-1")).toBe("container");
  });

  it("knows no type for a selection restored over rows it never saw", () => {
    const p = instances();
    p.selection.set(["unseen"]);
    expect(p.recordType("unseen")).toBeNull();
  });

  it("forgets every remembered type when the scope rotates", () => {
    const p = instances();
    p.complete(refreshRequest(p), delivered([machine("v-1")]));
    p.selection.set(["v-1"]);
    p.complete(refreshRequest(p), delivered([]));
    expect(p.recordType("v-1")).toBe("virtual-machine");
    p.rotateScope();
    p.selection.set(["v-1"]);
    expect(p.recordType("v-1")).toBeNull();
  });
});

describe("a monomorphic collection", () => {
  // Nothing in the record-type work reaches a collection that declares no
  // discriminator: no row is read for a type, no memory is kept, and every
  // field applies to every row.
  it("declares no types, remembers nothing and applies every field", () => {
    const p = provider();
    expect(p.types).toBeNull();
    p.complete(refreshRequest(p), delivered([{ id: "m-1" }]));
    p.selection.set(["m-1"]);
    expect(p.recordType("m-1")).toBeNull();
    expect(p.applicability("status", { id: "m-1" })).toBe("applies");
    expect(p.applicability("anything", { id: "m-1" })).toBe("applies");
  });

  it("leaves a scoped field applying to every row", () => {
    const scoped = createDataViewsProvider({
      schema: createSchema([
        { field: "type", kind: "choices", options: ["container"] },
        { field: "secureboot", kind: "flag", types: ["container"] },
      ]),
    });
    // No discriminator: there is one record type, so a field scoped to it
    // has nothing to exclude and the scoping never fires.
    expect(scoped.types).toBeNull();
    expect(scoped.applicability("secureboot", { id: "m-1" })).toBe("applies");
  });

  it("never reads a row for a type", () => {
    // The discriminator is the only reason a provider reads a row for
    // anything but its identity. A record that answers to no read at all
    // still completes, so nothing here touches it.
    const p = createDataViewsProvider<
      ReturnType<typeof machinesSchema>["fields"],
      { readonly uuid: string }
    >({ schema: machinesSchema(), identify: (row) => row.uuid });
    const record = new Proxy(
      // The record carries a key that looks like a discriminator, so a
      // provider that read one would reach the trap rather than an absent
      // key, which no read of any kind can be told from.
      { uuid: "m-1", type: "container" },
      {
        get(target, key) {
          if (key !== "uuid") {
            throw new Error(`read of ${String(key)} on a monomorphic row`);
          }
          return Reflect.get(target, key);
        },
      },
    );
    expect(p.complete(refreshRequest(p), delivered([record]))).toBe(true);
    expect(p.state.get().result.status).toBe("ready");
    p.selection.set(["m-1"]);
    expect(p.recordType("m-1")).toBeNull();
  });
});
