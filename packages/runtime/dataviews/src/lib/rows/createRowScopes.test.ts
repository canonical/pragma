/**
 * The scope registry is where the per-cell minting hazard would live: one
 * scope per row identity, reused for that row's whole life, with keyed field
 * channels so an unchanged value never notifies its cell. Each case is
 * mutation-tested against that contract.
 */
import { describe, expect, it, vi } from "vitest";
import buildRowModel from "../../../testing/buildRowModel.js";
import { createChannel } from "../observable/index.js";
import { createSelection } from "../selection/index.js";
import createRowScopes from "./createRowScopes.js";
import type { RowModel } from "./types.js";

type Machine = {
  readonly id: string;
  readonly status: string;
  readonly cpu: number;
};

const machine = (id: string, status = "running", cpu = 1): Machine => ({
  id,
  status,
  cpu,
});

/** The identity every machine carries: its own `id`. */
const byId = (row: { readonly id: string }): string => row.id;

const harness = (
  rows: readonly Machine[],
  fields: readonly string[] = ["status", "cpu"],
) => {
  const model = buildRowModel({ identify: byId, rows });
  const channel = createChannel<RowModel<Machine>>(model);
  const selection = createSelection();
  const scopes = createRowScopes({ rows: channel, selection, fields });
  const detach = scopes.observe();
  const publish = (next: readonly Machine[]): void => {
    channel.set(
      buildRowModel({ identify: byId, rows: next, previous: channel.get() }),
    );
  };
  return { channel, selection, scopes, publish, detach };
};

describe("createRowScopes", () => {
  it("hands every channel out read-only at runtime", () => {
    const { scopes } = harness([machine("m-1")]);
    const row = scopes.readRow("m-1");
    for (const channel of [
      scopes.ids,
      row.record,
      row.selected,
      ...Object.values(row.fields),
    ]) {
      expect(Object.isFrozen(channel)).toBe(true);
      expect(channel).not.toHaveProperty("set");
    }
  });

  it("mints one scope per row and reuses it for every read", () => {
    const { scopes } = harness([machine("m-1"), machine("m-2")]);
    expect(scopes.ids.get()).toEqual(["m-1", "m-2"]);
    expect(scopes.readRow("m-1")).toBe(scopes.readRow("m-1"));
    expect(scopes.readRow("m-1")).not.toBe(scopes.readRow("m-2"));
  });

  it("keeps a row's scope across a record replacement", () => {
    const { scopes, publish } = harness([machine("m-1")]);
    const before = scopes.readRow("m-1");
    publish([machine("m-1", "stopped")]);
    expect(scopes.readRow("m-1")).toBe(before);
    expect(before.record.get()).toEqual(machine("m-1", "stopped"));
  });

  it("notifies only the fields whose values changed", () => {
    const { scopes, publish } = harness([machine("m-1", "running", 4)]);
    const scope = scopes.readRow("m-1");
    const status = vi.fn();
    const cpu = vi.fn();
    scope.fields["status"]?.subscribe(status);
    scope.fields["cpu"]?.subscribe(cpu);
    publish([machine("m-1", "stopped", 4)]);
    expect(status).toHaveBeenCalledTimes(1);
    expect(cpu).not.toHaveBeenCalled();
  });

  it("publishes undefined for a field the record does not carry", () => {
    const { scopes } = harness([machine("m-1")], ["absent"]);
    expect(scopes.readRow("m-1").fields["absent"]?.get()).toBeUndefined();
  });

  it("collapses a repeated field name to one channel", () => {
    const { scopes } = harness([machine("m-1")], ["status", "status"]);
    expect(Object.keys(scopes.readRow("m-1").fields)).toEqual(["status"]);
  });

  it("republishes the row identities only when their order changes", () => {
    const { scopes, publish } = harness([machine("m-1"), machine("m-2")]);
    const listener = vi.fn();
    scopes.ids.subscribe(listener);
    publish([machine("m-1", "stopped"), machine("m-2")]);
    expect(listener).not.toHaveBeenCalled();
    publish([machine("m-2"), machine("m-1")]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(scopes.ids.get()).toEqual(["m-2", "m-1"]);
  });

  it("seeds a scope with the row's current selection membership", () => {
    const { selection, scopes, publish } = harness([machine("m-1")]);
    selection.set(["m-2"]);
    publish([machine("m-1"), machine("m-2")]);
    expect(scopes.readRow("m-1").selected.get()).toBe(false);
    expect(scopes.readRow("m-2").selected.get()).toBe(true);
  });

  it("notifies only the rows whose selection membership changed", () => {
    const { selection, scopes } = harness([machine("m-1"), machine("m-2")]);
    const first = vi.fn();
    const second = vi.fn();
    scopes.readRow("m-1").selected.subscribe(first);
    scopes.readRow("m-2").selected.subscribe(second);
    selection.toggle("m-1");
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    expect(scopes.readRow("m-1").selected.get()).toBe(true);
  });

  it("releases the scope of a row that leaves the model", () => {
    const { scopes, publish } = harness([machine("m-1"), machine("m-2")]);
    const before = scopes.readRow("m-1");
    publish([machine("m-2")]);
    expect(() => scopes.readRow("m-1")).toThrow(
      'row "m-1" is not in the current model',
    );
    publish([machine("m-1"), machine("m-2")]);
    expect(scopes.readRow("m-1")).not.toBe(before);
  });

  it("re-reads a row's fields only when its record changes", () => {
    let reads = 0;
    const counted = (status: string) => ({
      id: "m-1",
      get status(): string {
        reads += 1;
        return status;
      },
    });
    const unchanged = counted("running");
    const channel = createChannel(
      buildRowModel({ identify: byId, rows: [unchanged] }),
    );
    const selection = createSelection();
    const scopes = createRowScopes({
      rows: channel,
      selection,
      fields: ["status"],
    });
    scopes.observe();
    const minted = reads;
    // The same record object comes back for an unchanged row, and records
    // are immutable, so nothing is re-read.
    channel.set(
      buildRowModel({
        identify: byId,
        rows: [unchanged],
        previous: channel.get(),
      }),
    );
    expect(reads).toBe(minted);
    // A replaced record is read once per observed field.
    channel.set(
      buildRowModel({
        identify: byId,
        rows: [counted("stopped")],
        previous: channel.get(),
      }),
    );
    expect(reads).toBe(minted + 1);
    expect(scopes.readRow("m-1").fields["status"]?.get()).toBe("stopped");
  });

  it("reads a record's own fields only, never the prototype chain", () => {
    const inherited: readonly string[] = ["constructor", "toString"];
    const { scopes } = harness([machine("m-1")], inherited);
    const scope = scopes.readRow("m-1");
    for (const name of inherited) {
      expect(scope.fields[name]?.get()).toBeUndefined();
    }
  });

  it("stops observing once the observation detaches", () => {
    const { scopes, selection, publish, detach } = harness([machine("m-1")]);
    const before = scopes.readRow("m-1");
    detach();
    publish([machine("m-1", "stopped"), machine("m-2")]);
    selection.set(["m-1"]);
    expect(scopes.ids.get()).toEqual(["m-1"]);
    expect(() => scopes.readRow("m-2")).toThrow("is not in the current model");
    expect(before.record.get()).toEqual(machine("m-1"));
    expect(before.selected.get()).toBe(false);
  });

  it("observes nothing until it is asked to, then catches up", () => {
    const model = buildRowModel({ identify: byId, rows: [machine("m-1")] });
    const channel = createChannel<RowModel<Machine>>(model);
    const selection = createSelection();
    const scopes = createRowScopes({
      rows: channel,
      selection,
      fields: ["status"],
    });
    // A registry nobody attached — a discarded render's, or a server
    // render's — subscribed to nothing, so this publication reaches it only
    // when it starts observing.
    channel.set(
      buildRowModel({ identify: byId, rows: [machine("m-1"), machine("m-2")] }),
    );
    selection.set(["m-1"]);
    expect(scopes.ids.get()).toEqual(["m-1"]);
    scopes.observe();
    expect(scopes.ids.get()).toEqual(["m-1", "m-2"]);
    expect(scopes.readRow("m-1").selected.get()).toBe(true);
  });

  it("re-attaches after a detach without re-minting a scope", () => {
    const { scopes, publish, detach } = harness([machine("m-1")]);
    const before = scopes.readRow("m-1");
    detach();
    scopes.observe();
    publish([machine("m-1", "stopped")]);
    expect(scopes.readRow("m-1")).toBe(before);
    expect(before.record.get()).toEqual(machine("m-1", "stopped"));
  });
});
