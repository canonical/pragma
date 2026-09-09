import { describe, expect, it } from "vitest";
import createPresentation from "./createPresentation.js";
import type { ColumnToSize } from "./types.js";

const columns = (): readonly ColumnToSize[] => [
  { id: "name", sizing: { kind: "flex", weight: 2, minPx: 120 } },
  { id: "status", sizing: { kind: "fixed", px: 120 } },
  { id: "zone", sizing: { kind: "flex", weight: 1, minPx: 100, maxPx: 300 } },
];

describe("createPresentation", () => {
  it("declares sizing per column and rejects empty or duplicate ids", () => {
    const presentation = createPresentation(columns());
    expect(presentation.effective("name")).toEqual({
      kind: "flex",
      weight: 2,
      minPx: 120,
    });
    expect(presentation.effective("status")).toEqual({
      kind: "fixed",
      px: 120,
    });
    expect(() =>
      createPresentation([{ id: "", sizing: { kind: "fixed", px: 1 } }]),
    ).toThrow("must not be empty");
    expect(() =>
      createPresentation([
        { id: "name", sizing: { kind: "fixed", px: 1 } },
        { id: "name", sizing: { kind: "fixed", px: 2 } },
      ]),
    ).toThrow("duplicate");
    // The prototype chain is not a member.
    expect(() => presentation.effective("toString")).toThrow(
      "unknown column id",
    );
  });

  it("applies user-fixed overrides over declared sizing", () => {
    const presentation = createPresentation(columns());
    presentation.setOverride("name", { kind: "fixed", px: 340 });
    expect(presentation.effective("name")).toEqual({ kind: "fixed", px: 340 });
    expect(presentation.effective("status")).toEqual({
      kind: "fixed",
      px: 120,
    });
  });

  it("rejects overrides for unknown columns", () => {
    const presentation = createPresentation(columns());
    expect(() =>
      presentation.setOverride("toString", { kind: "fixed", px: 10 }),
    ).toThrow("unknown column id");
    expect(() =>
      presentation.setOverride("zone2", { kind: "fixed", px: 10 }),
    ).toThrow("unknown column id");
  });

  it("restores declared sizing on resetOverride and reset", () => {
    const presentation = createPresentation(columns());
    presentation.setOverride("name", { kind: "fixed", px: 340 });
    presentation.setOverride("zone", { kind: "fixed", px: 250 });
    presentation.resetOverride("name");
    expect(presentation.effective("name")).toEqual({
      kind: "flex",
      weight: 2,
      minPx: 120,
    });
    expect(presentation.effective("zone")).toEqual({ kind: "fixed", px: 250 });
    presentation.reset();
    expect(presentation.effective("zone")).toEqual({
      kind: "flex",
      weight: 1,
      minPx: 100,
      maxPx: 300,
    });
  });

  it("publishes a snapshot only on an actual change", () => {
    const presentation = createPresentation(columns());
    let notifications = 0;
    presentation.subscribe(() => {
      notifications += 1;
    });
    presentation.setOverride("name", { kind: "fixed", px: 340 });
    expect(notifications).toBe(1);
    // Restating the same override is a no-op, as the reset paths are.
    presentation.setOverride("name", { kind: "fixed", px: 340 });
    expect(notifications).toBe(1);
    expect(presentation.state.revision).toBe(1);
    // A different sizing of the same kind is an accepted change.
    presentation.setOverride("name", { kind: "fixed", px: 341 });
    expect(notifications).toBe(2);
    presentation.resetOverride("name");
    expect(notifications).toBe(3);
    // Resetting a column without an override is a no-op.
    presentation.resetOverride("zone");
    expect(notifications).toBe(3);
    // With no overrides left, reset is a no-op.
    presentation.reset();
    expect(notifications).toBe(3);
  });

  it("serves toColumns with overrides applied, in input order", () => {
    const presentation = createPresentation(columns());
    presentation.setOverride("status", { kind: "fixed", px: 200 });
    const resolved = presentation.toColumns();
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
    const presentation = createPresentation(columns());
    expect(presentation.state.revision).toBe(0);
    presentation.setOverride("name", { kind: "fixed", px: 340 });
    expect(presentation.state.revision).toBe(1);
    presentation.resetOverride("name");
    expect(presentation.state.revision).toBe(2);
  });

  it("keeps the declared sizing immune to caller mutations", () => {
    const input = columns();
    const presentation = createPresentation(input);
    (input as { id: string; sizing: unknown }[]).push({
      id: "sneaky",
      sizing: { kind: "fixed", px: 1 },
    });
    expect(() => presentation.effective("sneaky")).toThrow("unknown column id");
    // toColumns answers from the construction-time order, not the caller's array.
    expect(presentation.toColumns().map((column) => column.id)).toEqual([
      "name",
      "status",
      "zone",
    ]);
  });

  it("treats a flex override differing in any bound as a change", () => {
    const presentation = createPresentation(columns());
    let notifications = 0;
    presentation.subscribe(() => {
      notifications += 1;
    });
    const base = { kind: "flex", weight: 1, minPx: 100, maxPx: 300 } as const;
    presentation.setOverride("name", base);
    expect(notifications).toBe(1);
    presentation.setOverride("name", { ...base });
    expect(notifications).toBe(1);
    presentation.setOverride("name", { ...base, maxPx: undefined });
    expect(notifications).toBe(2);
    presentation.setOverride("name", { ...base, weight: 2, maxPx: undefined });
    expect(notifications).toBe(3);
    // A kind change is a change.
    presentation.setOverride("name", { kind: "fixed", px: 100 });
    expect(notifications).toBe(4);
  });
});
