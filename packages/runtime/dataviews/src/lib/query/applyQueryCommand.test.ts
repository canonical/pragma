import { describe, expect, it } from "vitest";
import applyQueryCommand from "./applyQueryCommand.js";
import type { Predicate, ResultWindow, Slice } from "./types.js";

const slice = (overrides: Partial<Slice> = {}): Slice => ({
  filter: [],
  search: null,
  sort: [],
  group: null,
  ...overrides,
});

const window = (page = 1, size = 50): ResultWindow => ({ page, size });

describe("applyQueryCommand", () => {
  it("replaces only the addressed predicate and preserves other clauses", () => {
    const base = slice({
      filter: [
        { field: "status", operator: "eq", operands: ["failed"] },
        { field: "zone", operator: "eq", operands: ["north"] },
      ],
      sort: [{ field: "name", direction: "asc" }],
    });
    const result = applyQueryCommand(base, window(), {
      kind: "replacePredicate",
      predicate: { field: "status", operator: "eq", operands: ["cancelled"] },
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.slice.filter).toEqual([
      { field: "zone", operator: "eq", operands: ["north"] },
      { field: "status", operator: "eq", operands: ["cancelled"] },
    ]);
    expect(result.slice.sort).toEqual(base.sort);
    expect(result.queryChanged).toBe(true);
  });

  it("appends a predicate for an unaddressed field", () => {
    const result = applyQueryCommand(slice(), window(), {
      kind: "replacePredicate",
      predicate: { field: "status", operator: "eq", operands: ["failed"] },
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.slice.filter).toHaveLength(1);
  });

  it("accepts bound and zero-value predicates with their exact arities", () => {
    for (const predicate of [
      { field: "updated", operator: "gte", operands: ["2026-01-01"] },
      { field: "updated", operator: "lte", operands: ["2026-12-31"] },
      { field: "owner", operator: "isSet", operands: [] },
    ] as const) {
      const result = applyQueryCommand(slice(), window(), {
        kind: "replacePredicate",
        predicate,
      });
      expect(result.status).toBe("accepted");
    }
  });

  it("resets the window to the first page on a query change", () => {
    const result = applyQueryCommand(slice(), window(4), {
      kind: "replacePredicate",
      predicate: { field: "status", operator: "eq", operands: ["failed"] },
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.window.page).toBe(1);
    expect(result.windowChanged).toBe(true);
  });

  it("removes exactly the addressed predicate and resets the window", () => {
    const base = slice({
      filter: [
        { field: "status", operator: "eq", operands: ["failed"] },
        { field: "status", operator: "isSet", operands: [] },
      ],
    });
    const result = applyQueryCommand(base, window(3), {
      kind: "removePredicate",
      field: "status",
      operator: "eq",
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.slice.filter).toEqual([
      { field: "status", operator: "isSet", operands: [] },
    ]);
    expect(result.window.page).toBe(1);
  });

  it("reports no change when removing an absent predicate", () => {
    const base = slice({
      filter: [{ field: "zone", operator: "eq", operands: ["north"] }],
    });
    const result = applyQueryCommand(base, window(2), {
      kind: "removePredicate",
      field: "status",
      operator: "eq",
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.queryChanged).toBe(false);
    expect(result.window.page).toBe(2);
    expect(result.windowChanged).toBe(false);
  });

  it("treats an empty search replacement as clearing the search", () => {
    const result = applyQueryCommand(slice({ search: "yak" }), window(2), {
      kind: "replaceSearch",
      search: "",
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.slice.search).toBeNull();
    expect(result.queryChanged).toBe(true);
    expect(result.window.page).toBe(1);
  });

  it("replaces the complete sort and resets the window", () => {
    const base = slice({ sort: [{ field: "name", direction: "asc" }] });
    const result = applyQueryCommand(base, window(2), {
      kind: "replaceSort",
      sort: [
        { field: "updated", direction: "desc" },
        { field: "name", direction: "asc" },
      ],
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.slice.sort).toEqual([
      { field: "updated", direction: "desc" },
      { field: "name", direction: "asc" },
    ]);
    expect(result.window.page).toBe(1);
  });

  it("sets and clears the group", () => {
    const grouped = applyQueryCommand(slice(), window(2), {
      kind: "setGroup",
      group: "status",
    });
    if (grouped.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(grouped.slice.group).toBe("status");
    expect(grouped.window.page).toBe(1);
    const cleared = applyQueryCommand(grouped.slice, window(), {
      kind: "setGroup",
      group: null,
    });
    if (cleared.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(cleared.slice.group).toBeNull();
  });

  it("navigates the window without touching the query", () => {
    const base = slice({ search: "yak" });
    const result = applyQueryCommand(base, window(1, 50), {
      kind: "navigateWindow",
      page: 2,
      size: 25,
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.slice).toBe(base);
    expect(result.window).toEqual({ page: 2, size: 25 });
    expect(result.queryChanged).toBe(false);
    expect(result.windowChanged).toBe(true);
  });

  it("reports no change when navigating to the current window", () => {
    const result = applyQueryCommand(slice(), window(2, 25), {
      kind: "navigateWindow",
      page: 2,
      size: 25,
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.windowChanged).toBe(false);
  });

  it("treats a semantically unchanged edit as no change at all", () => {
    const base = slice({
      filter: [
        { field: "status", operator: "eq", operands: ["failed", "cancelled"] },
      ],
      sort: [{ field: "name", direction: "asc" }],
    });
    const result = applyQueryCommand(base, window(2), {
      kind: "replacePredicate",
      predicate: {
        field: "status",
        operator: "eq",
        operands: ["cancelled", "failed"],
      },
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.queryChanged).toBe(false);
    expect(result.windowChanged).toBe(false);
    expect(result.window.page).toBe(2);
  });

  it("rejects a predicate with an empty field", () => {
    const result = applyQueryCommand(slice(), window(), {
      kind: "replacePredicate",
      predicate: { field: "", operator: "eq", operands: ["failed"] },
    });
    expect(result.status).toBe("rejected");
  });

  it("rejects non-positive or fractional window values", () => {
    for (const command of [
      { kind: "navigateWindow", page: 0 },
      { kind: "navigateWindow", page: -1 },
      { kind: "navigateWindow", page: 1.5 },
      { kind: "navigateWindow", page: Number.NaN },
      { kind: "navigateWindow", size: 0 },
      { kind: "navigateWindow", size: -3 },
      { kind: "navigateWindow", size: 2.5 },
      { kind: "navigateWindow", size: Number.POSITIVE_INFINITY },
    ] as const) {
      const result = applyQueryCommand(slice(), window(), command);
      expect(result.status).toBe("rejected");
    }
  });

  it("rejects an empty group string", () => {
    const result = applyQueryCommand(slice(), window(), {
      kind: "setGroup",
      group: "",
    });
    if (result.status !== "rejected") {
      throw new Error("expected rejection");
    }
    expect(result.reason).toBe("group must not be empty; use null to clear it");
  });

  it("clears the sort through an empty replacement", () => {
    const base = slice({ sort: [{ field: "name", direction: "asc" }] });
    const result = applyQueryCommand(base, window(), {
      kind: "replaceSort",
      sort: [],
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.slice.sort).toEqual([]);
    expect(result.queryChanged).toBe(true);
  });

  it("rejects predicates that violate the bounded grammar", () => {
    const cases = [
      {
        kind: "replacePredicate",
        predicate: { field: "status", operator: "eq", operands: [] },
      },
      {
        kind: "replacePredicate",
        predicate: { field: "cpu", operator: "gte", operands: [1, 2] },
      },
      {
        kind: "replacePredicate",
        predicate: { field: "cpu", operator: "gte", operands: [] },
      },
      {
        kind: "replacePredicate",
        predicate: { field: "owner", operator: "isSet", operands: ["x"] },
      },
      {
        kind: "replacePredicate",
        predicate: { field: "cpu", operator: "gte", operands: [Number.NaN] },
      },
      {
        kind: "replacePredicate",
        predicate: {
          field: "cpu",
          operator: "lte",
          operands: [Number.POSITIVE_INFINITY],
        },
      },
      {
        kind: "replaceSort",
        sort: [{ field: "", direction: "asc" }],
      },
    ] as const;
    for (const command of cases) {
      const result = applyQueryCommand(slice(), window(), command);
      expect(result.status).toBe("rejected");
    }
  });

  it("rejects predicate fields containing NUL characters on creation only", () => {
    const result = applyQueryCommand(slice(), window(), {
      kind: "replacePredicate",
      predicate: { field: "a\u0000b", operator: "eq", operands: ["x"] },
    });
    expect(result.status).toBe("rejected");
    // Removal may address out-of-grammar predicates to clean them up.
    const removal = applyQueryCommand(slice(), window(), {
      kind: "removePredicate",
      field: "a\u0000b",
      operator: "eq",
    });
    expect(removal.status).toBe("accepted");
  });

  it("rejects a predicate with an unknown operator without losing the reason", () => {
    const forged = {
      kind: "replacePredicate",
      predicate: { field: "status", operator: "contains", operands: ["x"] },
    } as unknown as { kind: "replacePredicate"; predicate: Predicate };
    const result = applyQueryCommand(slice(), window(), forged);
    if (result.status !== "rejected") {
      throw new Error("expected rejection");
    }
    expect(result.reason).toBe("unknown predicate operator contains");
  });

  it("keeps state unchanged on rejection", () => {
    const base = slice({ search: "yak" });
    const result = applyQueryCommand(base, window(2), {
      kind: "navigateWindow",
      page: 0,
    });
    if (result.status !== "rejected") {
      throw new Error("expected rejection");
    }
    expect(result.slice).toBe(base);
    expect(result.window.page).toBe(2);
    expect(result.reason).toBe("page must be a positive integer");
  });
});
