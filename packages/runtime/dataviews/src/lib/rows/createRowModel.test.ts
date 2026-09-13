/**
 * The row model is what keys selection, focus and actions to records rather
 * than to array positions. Every case here is mutation-tested: dropping the
 * identity guards, the entry carry or the whole-model carry fails one.
 */
import { describe, expect, it } from "vitest";
import built from "../../../testing/buildRowModel.js";
import createRowModel from "./createRowModel.js";
import type { RowIdentifier, RowModelConfig, RowRecord } from "./types.js";

type Machine = { readonly id: string; readonly status: string };

const machine = (id: string, status = "running"): Machine => ({ id, status });

/** The identity every case reads: the machine's own `id`. */
const byId = (row: Machine): string => row.id;

/** The reason of a build the case expects to be rejected. */
const rejection = <TRow extends object>(
  config: RowModelConfig<TRow>,
): string => {
  const result = createRowModel(config);
  return result.status === "rejected" ? result.reason : "";
};

describe("createRowModel", () => {
  it("answers with the built model, never the model itself", () => {
    expect(createRowModel({ identify: byId, rows: [machine("m-1")] })).toEqual({
      status: "built",
      model: expect.objectContaining({ ids: ["m-1"] }),
    });
  });

  it("orders entries and identities as the result did", () => {
    const model = built({
      identify: byId,
      rows: [machine("m-2"), machine("m-1")],
    });
    expect(model.ids).toEqual(["m-2", "m-1"]);
    expect(model.entries.map((entry) => entry.id)).toEqual(["m-2", "m-1"]);
  });

  it("addresses records by identity, not position", () => {
    const rows = [machine("m-1"), machine("m-2")];
    const model = built({ identify: byId, rows });
    expect(model.byId("m-2")).toBe(rows[1]);
    expect(model.byId("absent")).toBeUndefined();
  });

  it("freezes the entries, the identities and each entry", () => {
    const model = built({ identify: byId, rows: [machine("m-1")] });
    expect(Object.isFrozen(model.entries)).toBe(true);
    expect(Object.isFrozen(model.ids)).toBe(true);
    expect(Object.isFrozen(model.entries[0])).toBe(true);
  });

  it("rejects a record whose identity is not a non-empty string", () => {
    const reason = "row identity must be a non-empty string";
    expect(
      rejection({
        rows: [{ id: "" }],
        identify: (row: { readonly id: string }) => row.id,
      }),
    ).toBe(reason);
    expect(
      rejection({
        rows: [{ id: 7 }],
        identify: ((row: { readonly id: number }) =>
          row.id) as unknown as RowIdentifier<{ readonly id: number }>,
      }),
    ).toBe(reason);
  });

  it("keys the model by the declared identifier", () => {
    const model = built({
      rows: [{ uuid: "a" }, { uuid: "b" }],
      identify: (row: { readonly uuid: string }) => row.uuid,
    });
    expect(model.ids).toEqual(["a", "b"]);
  });

  it("rejects a declared identifier that answers with a non-string", () => {
    const broken = ((): unknown => 42) as RowIdentifier<RowRecord>;
    expect(rejection({ rows: [{ id: "m-1" }], identify: broken })).toBe(
      "row identity must be a non-empty string",
    );
  });

  it("rejects a declared identifier that answers with an empty string", () => {
    expect(rejection({ rows: [{ id: "m-1" }], identify: () => "" })).toBe(
      "row identity must be a non-empty string",
    );
  });

  it("rejects two records claiming one identity", () => {
    expect(
      rejection({ identify: byId, rows: [machine("m-1"), machine("m-1")] }),
    ).toBe('duplicate row id "m-1"');
  });

  it("returns the previous model whole when nothing moved", () => {
    const rows = [machine("m-1"), machine("m-2")];
    const first = built({ identify: byId, rows });
    expect(built({ identify: byId, rows: [...rows], previous: first })).toBe(
      first,
    );
  });

  it("carries the entries of unchanged records past a replaced one", () => {
    const kept = machine("m-1");
    const first = built({ identify: byId, rows: [kept, machine("m-2")] });
    const second = built({
      identify: byId,
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
    const first = built({ identify: byId, rows: [one, two] });
    const second = built({ identify: byId, rows: [two, one], previous: first });
    expect(second).not.toBe(first);
    expect(second.entries[0]).toBe(first.entries[1]);
    expect(second.entries[1]).toBe(first.entries[0]);
  });

  it("carries surviving entries when the result grows or shrinks", () => {
    const one = machine("m-1");
    const first = built({ identify: byId, rows: [one, machine("m-2")] });
    const shorter = built({ identify: byId, rows: [one], previous: first });
    expect(shorter.entries[0]).toBe(first.entries[0]);
    expect(shorter.ids).toEqual(["m-1"]);
    const longer = built({
      identify: byId,
      rows: [one, machine("m-3")],
      previous: shorter,
    });
    expect(longer.entries[0]).toBe(first.entries[0]);
    expect(longer.ids).toEqual(["m-1", "m-3"]);
  });

  it("builds a fresh model when no predecessor is offered", () => {
    const rows = [machine("m-1")];
    expect(built({ identify: byId, rows })).not.toBe(
      built({ identify: byId, rows }),
    );
  });
});
