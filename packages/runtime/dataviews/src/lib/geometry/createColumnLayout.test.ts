import { describe, expect, it } from "vitest";
import createColumnLayout from "./createColumnLayout.js";
import type { ColumnToSize } from "./types.js";

const columns = (): readonly ColumnToSize[] => [
  { id: "name", sizing: { kind: "flex", weight: 2, minPx: 120 } },
  { id: "status", sizing: { kind: "fixed", px: 120 } },
  { id: "zone", sizing: { kind: "flex", weight: 1, minPx: 100, maxPx: 300 } },
];

describe("createColumnLayout", () => {
  it("declares sizing per column and rejects empty or duplicate ids", () => {
    const layout = createColumnLayout(columns());
    expect(layout.effective("name")).toEqual({
      kind: "flex",
      weight: 2,
      minPx: 120,
    });
    expect(layout.effective("status")).toEqual({
      kind: "fixed",
      px: 120,
    });
    expect(() =>
      createColumnLayout([{ id: "", sizing: { kind: "fixed", px: 1 } }]),
    ).toThrow("must not be empty");
    expect(() =>
      createColumnLayout([
        { id: "name", sizing: { kind: "fixed", px: 1 } },
        { id: "name", sizing: { kind: "fixed", px: 2 } },
      ]),
    ).toThrow("duplicate");
    // The prototype chain is not a member.
    expect(() => layout.effective("toString")).toThrow("unknown column id");
    expect(() => layout.readDeclared("toString")).toThrow("unknown column id");
    expect(layout.readDeclared("status")).toEqual({ kind: "fixed", px: 120 });
  });

  it("applies user-fixed overrides over declared sizing", () => {
    const layout = createColumnLayout(columns());
    layout.setOverride("name", { kind: "fixed", px: 340 });
    expect(layout.effective("name")).toEqual({ kind: "fixed", px: 340 });
    expect(layout.effective("status")).toEqual({
      kind: "fixed",
      px: 120,
    });
  });

  it("rejects overrides for unknown columns", () => {
    const layout = createColumnLayout(columns());
    expect(() =>
      layout.setOverride("toString", { kind: "fixed", px: 10 }),
    ).toThrow("unknown column id");
    expect(() =>
      layout.setOverride("zone2", { kind: "fixed", px: 10 }),
    ).toThrow("unknown column id");
  });

  it("restores declared sizing on resetOverride and resetOverrides", () => {
    const layout = createColumnLayout(columns());
    layout.setOverride("name", { kind: "fixed", px: 340 });
    layout.setOverride("zone", { kind: "fixed", px: 250 });
    layout.resetOverride("name");
    expect(layout.effective("name")).toEqual({
      kind: "flex",
      weight: 2,
      minPx: 120,
    });
    expect(layout.effective("zone")).toEqual({ kind: "fixed", px: 250 });
    layout.resetOverrides();
    expect(layout.effective("zone")).toEqual({
      kind: "flex",
      weight: 1,
      minPx: 100,
      maxPx: 300,
    });
  });

  it("publishes a snapshot only on an actual change", () => {
    const layout = createColumnLayout(columns());
    let notifications = 0;
    layout.state.subscribe(() => {
      notifications += 1;
    });
    layout.setOverride("name", { kind: "fixed", px: 340 });
    expect(notifications).toBe(1);
    // Restating the same override is a no-op, as the reset paths are.
    layout.setOverride("name", { kind: "fixed", px: 340 });
    expect(notifications).toBe(1);
    expect(layout.state.get().revision).toBe(1);
    // A different sizing of the same kind is an accepted change.
    layout.setOverride("name", { kind: "fixed", px: 341 });
    expect(notifications).toBe(2);
    layout.resetOverride("name");
    expect(notifications).toBe(3);
    // Resetting a column without an override is a no-op.
    layout.resetOverride("zone");
    expect(notifications).toBe(3);
    // With no overrides left, resetOverrides is a no-op.
    layout.resetOverrides();
    expect(notifications).toBe(3);
  });

  it("serves toColumns with overrides applied, in input order", () => {
    const layout = createColumnLayout(columns());
    layout.setOverride("status", { kind: "fixed", px: 200 });
    const resolved = layout.toColumns();
    expect(resolved.map((column) => column.id)).toEqual([
      "name",
      "status",
      "zone",
    ]);
    expect(resolved[1]?.sizing).toEqual({ kind: "fixed", px: 200 });
    expect(resolved[0]?.sizing).toEqual({
      kind: "flex",
      weight: 2,
      minPx: 120,
    });
  });

  it("bumps the revision on every accepted change", () => {
    const layout = createColumnLayout(columns());
    expect(layout.state.get().revision).toBe(0);
    layout.setOverride("name", { kind: "fixed", px: 340 });
    expect(layout.state.get().revision).toBe(1);
    layout.resetOverride("name");
    expect(layout.state.get().revision).toBe(2);
  });

  it("keeps the declared sizing immune to caller mutations", () => {
    const input = columns();
    const layout = createColumnLayout(input);
    (input as { id: string; sizing: unknown }[]).push({
      id: "sneaky",
      sizing: { kind: "fixed", px: 1 },
    });
    expect(() => layout.effective("sneaky")).toThrow("unknown column id");
    // toColumns answers from the construction-time order, not the caller's array.
    expect(layout.toColumns().map((column) => column.id)).toEqual([
      "name",
      "status",
      "zone",
    ]);
  });

  it("treats a flex override differing in any bound as a change", () => {
    const layout = createColumnLayout(columns());
    let notifications = 0;
    layout.state.subscribe(() => {
      notifications += 1;
    });
    const unbounded = { kind: "flex", weight: 1, minPx: 100 } as const;
    const base = { ...unbounded, maxPx: 300 } as const;
    layout.setOverride("name", base);
    expect(notifications).toBe(1);
    layout.setOverride("name", { ...base });
    expect(notifications).toBe(1);
    layout.setOverride("name", unbounded);
    expect(notifications).toBe(2);
    layout.setOverride("name", { ...unbounded, weight: 2 });
    expect(notifications).toBe(3);
    // A kind change is a change.
    layout.setOverride("name", { kind: "fixed", px: 100 });
    expect(notifications).toBe(4);
  });
});
