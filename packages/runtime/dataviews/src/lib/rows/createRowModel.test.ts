/**
 * The row model is what keys selection, focus and actions to records rather
 * than to array positions. Every case here is mutation-tested: dropping the
 * identity guards, the entry carry or the whole-model carry fails one.
 */
import { describe, expect, it } from "vitest";
import createRowModel from "./createRowModel.js";
import type { RowIdentifier, RowRecord } from "./types.js";

type Machine = { readonly id: string; readonly status: string };

const machine = (id: string, status = "running"): Machine => ({ id, status });

describe("createRowModel", () => {
  it("orders entries and identities as the result did", () => {
    const model = createRowModel({ rows: [machine("m-2"), machine("m-1")] });
    expect(model.ids).toEqual(["m-2", "m-1"]);
    expect(model.entries.map((entry) => entry.id)).toEqual(["m-2", "m-1"]);
  });

  it("addresses records by identity, not position", () => {
    const rows = [machine("m-1"), machine("m-2")];
    const model = createRowModel({ rows });
    expect(model.byId("m-2")).toBe(rows[1]);
    expect(model.byId("absent")).toBeUndefined();
  });

  it("freezes the entries, the identities and each entry", () => {
    const model = createRowModel({ rows: [machine("m-1")] });
    expect(Object.isFrozen(model.entries)).toBe(true);
    expect(Object.isFrozen(model.ids)).toBe(true);
    expect(Object.isFrozen(model.entries[0])).toBe(true);
  });

  it("rejects a record with no usable default identity", () => {
    expect(() => createRowModel({ rows: [{ name: "no id" }] })).toThrow(
      "row record has no non-empty string id",
    );
    expect(() => createRowModel({ rows: [{ id: "" }] })).toThrow(
      "row record has no non-empty string id",
    );
    expect(() => createRowModel({ rows: [{ id: 7 }] })).toThrow(
      "row record has no non-empty string id",
    );
  });

  it("uses a declared identifier instead of the record's id", () => {
    const model = createRowModel({
      rows: [{ uuid: "a" }, { uuid: "b" }],
      identify: (row: { readonly uuid: string }) => row.uuid,
    });
    expect(model.ids).toEqual(["a", "b"]);
  });

  it("rejects a declared identifier that answers with a non-string", () => {
    const broken = ((): unknown => 42) as RowIdentifier<RowRecord>;
    expect(() =>
      createRowModel({ rows: [{ id: "m-1" }], identify: broken }),
    ).toThrow("row identity must be a non-empty string");
  });

  it("rejects a declared identifier that answers with an empty string", () => {
    expect(() =>
      createRowModel({ rows: [{ id: "m-1" }], identify: () => "" }),
    ).toThrow("row identity must be a non-empty string");
  });

  it("rejects two records claiming one identity", () => {
    expect(() =>
      createRowModel({ rows: [machine("m-1"), machine("m-1")] }),
    ).toThrow('duplicate row id "m-1"');
  });

  it("returns the previous model whole when nothing moved", () => {
    const rows = [machine("m-1"), machine("m-2")];
    const first = createRowModel({ rows });
    expect(createRowModel({ rows: [...rows], previous: first })).toBe(first);
  });

  it("carries the entries of unchanged records past a replaced one", () => {
    const kept = machine("m-1");
    const first = createRowModel({ rows: [kept, machine("m-2")] });
    const second = createRowModel({
      rows: [kept, machine("m-2", "stopped")],
      previous: first,
    });
    expect(second).not.toBe(first);
    expect(second.entries[0]).toBe(first.entries[0]);
    expect(second.entries[1]).not.toBe(first.entries[1]);
  });

  it("carries entries across a reorder, keying by identity", () => {
    const one = machine("m-1");
    const two = machine("m-2");
    const first = createRowModel({ rows: [one, two] });
    const second = createRowModel({ rows: [two, one], previous: first });
    expect(second).not.toBe(first);
    expect(second.entries[0]).toBe(first.entries[1]);
    expect(second.entries[1]).toBe(first.entries[0]);
  });

  it("carries surviving entries when the result grows or shrinks", () => {
    const one = machine("m-1");
    const first = createRowModel({ rows: [one, machine("m-2")] });
    const shorter = createRowModel({ rows: [one], previous: first });
    expect(shorter.entries[0]).toBe(first.entries[0]);
    expect(shorter.ids).toEqual(["m-1"]);
    const longer = createRowModel({
      rows: [one, machine("m-3")],
      previous: shorter,
    });
    expect(longer.entries[0]).toBe(first.entries[0]);
    expect(longer.ids).toEqual(["m-1", "m-3"]);
  });

  it("builds a fresh model when no predecessor is offered", () => {
    const rows = [machine("m-1")];
    expect(createRowModel({ rows })).not.toBe(createRowModel({ rows }));
  });
});
