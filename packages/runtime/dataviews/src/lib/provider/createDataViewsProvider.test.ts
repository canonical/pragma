import { describe, expect, it } from "vitest";
import type { Slice } from "../query/types.js";
import createSchema from "../schema/createSchema.js";
import createDataViewsProvider from "./createDataViewsProvider.js";

const machinesSchema = () =>
  createSchema([
    { field: "status", kind: "choices", options: ["failed", "cancelled"] },
    { field: "cpu", kind: "number", min: 0, max: 64 },
    { field: "owner", kind: "flag" },
    { field: "updated", kind: "date" },
  ]);

const provider = () => createDataViewsProvider({ schema: machinesSchema() });

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
    expect(p.selection.state.ids.size).toBe(0);
    expect(Object.keys(p.fields).sort()).toEqual([
      "cpu",
      "owner",
      "status",
      "updated",
    ]);
    expect(p.fields.cpu.gte).toBeDefined();
    expect(p.fields.cpu.lte).toBeDefined();
    expect(p.fields.status.eq).toBeDefined();
    expect(p.fields.owner.isSet).toBeDefined();
    expect(p.fields.updated.gte).toBeDefined();
  });

  it("routes a valid field edit through the coordinator as a request", () => {
    const p = provider();
    const resultEvents: string[] = [];
    p.result.subscribe(() => {
      resultEvents.push(p.result.get().result.status);
    });
    p.fields.cpu.gte.edit("4");
    expect(p.result.get().result.status).toBe("pending");
    expect(resultEvents).toEqual(["pending"]);
    expect(p.result.get().slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
  });

  it("retains the predicate through an invalid edit", () => {
    const p = provider();
    p.fields.cpu.gte.edit("4");
    p.fields.cpu.gte.edit("four");
    expect(p.fields.cpu.gte.state.get().feedback).toEqual({
      kind: "invalid",
      reason: "not a number",
      retainsPredicate: true,
    });
    expect(p.result.get().slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
  });

  it("sets multi-value operands directly and publishes the applied set", () => {
    const p = provider();
    p.fields.status.eq.set(["failed", "cancelled"]);
    expect(p.result.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed", "cancelled"] },
    ]);
    const applied = p.fields.status.eq.applied.get();
    expect(applied.kind).toBe("value");
    if (applied.kind === "value") {
      expect(applied.value).toEqual(new Set(["failed", "cancelled"]));
    }
  });

  it("publishes the applied value on a valid buffer edit", () => {
    const p = provider();
    p.fields.cpu.gte.edit("4");
    expect(p.fields.cpu.gte.applied.get()).toEqual({ kind: "value", value: 4 });
  });

  it("keeps the applied channel quiet on an unchanged re-edit", () => {
    const p = provider();
    let notifications = 0;
    p.fields.cpu.gte.applied.subscribe(() => {
      notifications += 1;
    });
    p.fields.cpu.gte.edit("4");
    p.fields.cpu.gte.edit("4");
    expect(notifications).toBe(1);
  });
  it("sets a flag field's predicate directly", () => {
    const p = provider();
    p.fields.owner.isSet.set([]);
    expect(p.result.get().slice.filter).toEqual([
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
    expect(p.result.get().slice.filter).toEqual([]);
    expect(p.fields.status.eq.applied.get()).toEqual({ kind: "empty" });
  });

  it("clears a field's predicate explicitly", () => {
    const p = provider();
    p.fields.cpu.gte.edit("4");
    p.fields.cpu.gte.clear();
    expect(p.result.get().slice.filter).toEqual([]);
    expect(p.fields.cpu.gte.applied.get()).toEqual({ kind: "empty" });
    expect(p.fields.cpu.gte.state.get().buffer).toBe("");
  });

  it("navigates the window and replaces sort and search", () => {
    const p = provider();
    p.navigateWindow(2);
    expect(p.result.get().window).toEqual({ page: 2, size: 50 });
    p.setSort([{ field: "updated", direction: "desc" }]);
    expect(p.result.get().slice.sort).toEqual([
      { field: "updated", direction: "desc" },
    ]);
    p.setSearch("yak");
    expect(p.result.get().slice.search).toBe("yak");
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
      group: null,
    };
    const requestId = p.adopt(adopted, { page: 1, size: 50 });
    expect(requestId).not.toBeNull();
    expect(p.fields.status.eq.applied.get()).toEqual({
      kind: "value",
      value: new Set(["failed"]),
    });
    expect(p.fields.cpu.gte.applied.get()).toEqual({ kind: "value", value: 4 });
    expect(p.fields.cpu.gte.state.get().buffer).toBe("4");
    expect(p.fields.cpu.lte.applied.get()).toEqual({ kind: "empty" });
  });

  it("publishes nothing on an idempotent clear", () => {
    const p = provider();
    let notifications = 0;
    p.result.subscribe(() => {
      notifications += 1;
    });
    // The field never had a predicate; clearing must not pretend to change.
    p.fields.cpu.gte.clear();
    expect(notifications).toBe(0);
    expect(p.result.get().slice.filter).toEqual([]);
    expect(p.fields.cpu.gte.applied.get()).toEqual({ kind: "empty" });
  });

  it("completes requests through the coordinator and publishes results", () => {
    const p = provider();
    const requestId = p.refresh();
    if (requestId === null) {
      throw new Error("expected a refresh request");
    }
    expect(
      p.complete(requestId, {
        status: "success",
        rows: [{ id: "machine-1" }],
        count: 1,
      }),
    ).toBe(true);
    expect(p.result.get().result.rows).toEqual([{ id: "machine-1" }]);
    expect(p.result.get().result.status).toBe("ready");
  });

  it("captures the selection revision when invoking an action", () => {
    const p = provider();
    const first = p.invokeAction(["machine-1"]);
    expect(first.state.selectionRevision).toBe(0);
    p.selection.toggle("machine-1");
    const second = p.invokeAction(["machine-1", "machine-2"]);
    expect(second.state.selectionRevision).toBe(1);
  });

  it("resets selection and fields on scope rotation", () => {
    const p = provider();
    p.selection.toggle("machine-1");
    p.fields.cpu.gte.edit("4");
    const scopeBefore = p.result.get().scope;
    p.rotateScope();
    expect(p.selection.state.ids.size).toBe(0);
    expect(p.fields.cpu.gte.applied.get()).toEqual({ kind: "empty" });
    expect(p.result.get().scope).not.toBe(scopeBefore);
    expect(p.result.get().slice.filter).toEqual([]);
  });

  it("ignores completions of requests it never issued", () => {
    const p = provider();
    let notifications = 0;
    p.result.subscribe(() => {
      notifications += 1;
    });
    const published = p.complete("i999:r9", {
      status: "success",
      rows: [{ id: "ghost" }],
      count: 1,
    });
    expect(published).toBe(false);
    expect(notifications).toBe(0);
    expect(p.result.get().result.status).toBe("idle");
  });

  it("dies on dispose", () => {
    const p = provider();
    p.dispose();
    expect(p.result.get().disposed).toBe(true);
    expect(p.refresh()).toBeNull();
    expect(
      p.adopt(
        { filter: [], search: null, sort: [], group: null },
        { page: 1, size: 50 },
      ),
    ).toBeNull();
  });

  it("publishes the shared row model when a request succeeds", () => {
    const p = provider();
    const requestId = refreshRequest(p);
    p.complete(requestId, {
      status: "success",
      rows: [{ id: "m-1" }, { id: "m-2" }],
      count: 2,
    });
    expect(p.rows.get().ids).toEqual(["m-1", "m-2"]);
    expect(p.rows.get().byId("m-2")).toEqual({ id: "m-2" });
  });

  it("carries row entries across a republication of the same records", () => {
    const p = provider();
    const rows = [{ id: "m-1" }];
    p.complete(refreshRequest(p), { status: "success", rows, count: 1 });
    const first = p.rows.get();
    p.complete(refreshRequest(p), {
      status: "success",
      rows: [...rows],
      count: 1,
    });
    expect(p.rows.get()).toBe(first);
  });

  it("rejects the whole completion when a record has no usable identity", () => {
    const p = provider();
    const requestId = refreshRequest(p);
    expect(() =>
      p.complete(requestId, {
        status: "success",
        rows: [{ name: "unidentified" }],
        count: 1,
      }),
    ).toThrow("row record has no non-empty string id");
    expect(p.rows.get().ids).toEqual([]);
    expect(p.result.get().result.status).toBe("refreshing");
  });

  it("identifies records through a declared identifier", () => {
    const p = createDataViewsProvider<
      ReturnType<typeof machinesSchema>["fields"],
      { readonly uuid: string }
    >({
      schema: machinesSchema(),
      identify: (row) => row.uuid,
    });
    p.complete(refreshRequest(p), {
      status: "success",
      rows: [{ uuid: "a" }],
      count: 1,
    });
    expect(p.rows.get().ids).toEqual(["a"]);
  });

  it("retains the row model when a request fails", () => {
    const p = provider();
    p.complete(refreshRequest(p), {
      status: "success",
      rows: [{ id: "m-1" }],
      count: 1,
    });
    const retained = p.rows.get();
    p.complete(refreshRequest(p), { status: "failure", reason: "offline" });
    expect(p.rows.get()).toBe(retained);
    expect(p.result.get().result.lastError).toBe("offline");
  });

  it("discards the row model of a superseded request", () => {
    const p = provider();
    const stale = refreshRequest(p);
    p.setSearch("failed");
    p.complete(stale, { status: "success", rows: [{ id: "m-1" }], count: 1 });
    expect(p.rows.get().ids).toEqual([]);
  });

  it("empties the row model when the scope rotates", () => {
    const p = provider();
    p.complete(refreshRequest(p), {
      status: "success",
      rows: [{ id: "m-1" }],
      count: 1,
    });
    p.rotateScope();
    expect(p.rows.get().ids).toEqual([]);
  });

  it("adopts an identical state without notifying", () => {
    const p = provider();
    let notifications = 0;
    p.result.subscribe(() => {
      notifications += 1;
    });
    const adopted = p.adopt(
      { filter: [], search: null, sort: [], group: null },
      { page: 1, size: 50 },
    );
    expect(adopted).toBeNull();
    expect(notifications).toBe(0);
  });
});
