import { describe, expect, it } from "vitest";
import applyQueryCommand from "./applyQueryCommand.js";
import { DEFAULT_WINDOW } from "./constants.js";
import type { Predicate, ResultWindow, Slice } from "./types.js";

const slice = (overrides: Partial<Slice> = {}): Slice => ({
  filter: [],
  search: null,
  sort: [],
  group: [],
  ...overrides,
});

const window = (overrides: Partial<ResultWindow> = {}): ResultWindow => ({
  ...DEFAULT_WINDOW,
  ...overrides,
});

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
      kind: "setPredicate",
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
    expect(result.sliceChanged).toBe(true);
  });

  it("appends a predicate for an unaddressed field", () => {
    const result = applyQueryCommand(slice(), window(), {
      kind: "setPredicate",
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
        kind: "setPredicate",
        predicate,
      });
      expect(result.status).toBe("accepted");
    }
  });

  it("resets the page and clears the cursor on a slice change", () => {
    const result = applyQueryCommand(
      slice(),
      window({ page: 4, cursor: "page-four" }),
      {
        kind: "setPredicate",
        predicate: { field: "status", operator: "eq", operands: ["failed"] },
      },
    );
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.window.page).toBe(1);
    expect(result.window.cursor).toBeNull();
    expect(result.windowChanged).toBe(true);
  });

  it("clears a cursor a slice change left addressing nothing", () => {
    // Already on page one, so the token alone is what moves: a token minted
    // for one result set does not address a start in another.
    const result = applyQueryCommand(slice(), window({ cursor: "minted" }), {
      kind: "setSearch",
      search: "yak",
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.window.cursor).toBeNull();
    expect(result.windowChanged).toBe(true);
  });

  it("keeps the collapsed groups across a slice change", () => {
    // A collapsed group is still that group after a filter.
    const result = applyQueryCommand(
      slice({ group: [{ field: "status" }] }),
      window({ collapsed: [["failed"]] }),
      { kind: "setSearch", search: "yak" },
    );
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.window.collapsed).toEqual([["failed"]]);
    // Nothing about the window moved, so it reports no window change.
    expect(result.windowChanged).toBe(false);
    expect(result.sliceChanged).toBe(true);
  });

  it("removes exactly the addressed predicate and resets the window", () => {
    const base = slice({
      filter: [
        { field: "status", operator: "eq", operands: ["failed"] },
        { field: "status", operator: "isSet", operands: [] },
      ],
    });
    const result = applyQueryCommand(base, window({ page: 3 }), {
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
    const result = applyQueryCommand(base, window({ page: 2 }), {
      kind: "removePredicate",
      field: "status",
      operator: "eq",
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.sliceChanged).toBe(false);
    expect(result.window.page).toBe(2);
    expect(result.windowChanged).toBe(false);
  });

  it("treats an empty search replacement as clearing the search", () => {
    const result = applyQueryCommand(
      slice({ search: "yak" }),
      window({ page: 2 }),
      { kind: "setSearch", search: "" },
    );
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.slice.search).toBeNull();
    expect(result.sliceChanged).toBe(true);
    expect(result.window.page).toBe(1);
  });

  it("replaces the complete sort and resets the window", () => {
    const base = slice({ sort: [{ field: "name", direction: "asc" }] });
    const result = applyQueryCommand(base, window({ page: 2 }), {
      kind: "setSort",
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

  it("stores a sort field spelled twice as its first term", () => {
    const base = slice({ sort: [{ field: "name", direction: "asc" }] });
    const result = applyQueryCommand(base, window(), {
      kind: "setSort",
      sort: [
        { field: "name", direction: "asc" },
        { field: "updated", direction: "desc" },
        { field: "name", direction: "desc" },
      ],
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.slice.sort).toEqual([
      { field: "name", direction: "asc" },
      { field: "updated", direction: "desc" },
    ]);
  });

  it("clears the sort through an empty replacement", () => {
    const base = slice({ sort: [{ field: "name", direction: "asc" }] });
    const result = applyQueryCommand(base, window(), {
      kind: "setSort",
      sort: [],
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.slice.sort).toEqual([]);
    expect(result.sliceChanged).toBe(true);
  });

  it("sets ordered grouping levels and clears them again", () => {
    const grouped = applyQueryCommand(slice(), window({ page: 2 }), {
      kind: "setGroup",
      group: [{ field: "zone" }, { field: "status" }],
    });
    if (grouped.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(grouped.slice.group).toEqual([
      { field: "zone" },
      { field: "status" },
    ]);
    expect(grouped.window.page).toBe(1);

    const cleared = applyQueryCommand(grouped.slice, window(), {
      kind: "setGroup",
      group: [],
    });
    if (cleared.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(cleared.slice.group).toEqual([]);
    expect(cleared.sliceChanged).toBe(true);
  });

  it("rebuilds the grouping levels rather than keeping the caller's", () => {
    const levels = [{ field: "zone" }];
    const result = applyQueryCommand(slice(), window(), {
      kind: "setGroup",
      group: levels,
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.slice.group[0]).not.toBe(levels[0]);
  });

  it("keeps a reordering of the same grouping fields as a change", () => {
    const base = slice({ group: [{ field: "zone" }, { field: "status" }] });
    const result = applyQueryCommand(base, window(), {
      kind: "setGroup",
      group: [{ field: "status" }, { field: "zone" }],
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.sliceChanged).toBe(true);
  });

  it("clears the collapsed groups when the grouping changes", () => {
    // Grouping decides what a collapsed path names, so a new grouping leaves
    // no path that still means what it meant.
    const result = applyQueryCommand(
      slice({ group: [{ field: "status" }] }),
      window({ collapsed: [["failed"]] }),
      { kind: "setGroup", group: [{ field: "zone" }] },
    );
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.window.collapsed).toEqual([]);
    expect(result.windowChanged).toBe(true);
  });

  it("rejects a grouping level naming no field", () => {
    const result = applyQueryCommand(slice(), window(), {
      kind: "setGroup",
      group: [{ field: "zone" }, { field: "" }],
    });
    if (result.status !== "rejected") {
      throw new Error("expected rejection");
    }
    expect(result.reason).toBe("group term field must not be empty");
  });

  it("collapses groups from the first page, leaving the query alone", () => {
    const base = slice({ group: [{ field: "status" }] });
    const result = applyQueryCommand(
      base,
      window({ page: 3, cursor: "page-three" }),
      { kind: "setCollapsed", collapsed: [["failed"], ["ready"]] },
    );
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.slice).toBe(base);
    // Collapse changes which rows the pages hold, exactly as a filter does.
    expect(result.window.page).toBe(1);
    expect(result.window.cursor).toBeNull();
    expect(result.window.collapsed).toEqual([["failed"], ["ready"]]);
    expect(result.sliceChanged).toBe(false);
    expect(result.windowChanged).toBe(true);
  });

  it("copies the collapsed paths it is given", () => {
    const paths = [["failed"]];
    const result = applyQueryCommand(slice(), window(), {
      kind: "setCollapsed",
      collapsed: paths,
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.window.collapsed[0]).not.toBe(paths[0]);
  });

  it("changes nothing when the collapse is restated", () => {
    const base = window({ page: 3, collapsed: [["failed"], ["eu", "west"]] });
    const result = applyQueryCommand(slice(), base, {
      kind: "setCollapsed",
      collapsed: [["failed"], ["eu", "west"]],
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.window).toBe(base);
    expect(result.windowChanged).toBe(false);
  });

  it("tells collapses apart by count, by depth and by key", () => {
    const collapsing = (collapsed: readonly (readonly string[])[]) =>
      applyQueryCommand(slice(), window({ collapsed: [["eu", "west"]] }), {
        kind: "setCollapsed",
        collapsed,
      });
    for (const collapsed of [
      [["eu", "west"], ["failed"]],
      [["eu"]],
      [["eu", "east"]],
    ]) {
      const result = collapsing(collapsed);
      if (result.status !== "accepted") {
        throw new Error("expected acceptance");
      }
      expect(result.windowChanged).toBe(true);
    }
  });

  it("navigates the window without touching the query", () => {
    const base = slice({ search: "yak" });
    const result = applyQueryCommand(base, window(), {
      kind: "navigateWindow",
      page: 2,
      size: 25,
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.slice).toBe(base);
    expect(result.window).toEqual({
      page: 2,
      size: 25,
      cursor: null,
      collapsed: [],
    });
    expect(result.sliceChanged).toBe(false);
    expect(result.windowChanged).toBe(true);
  });

  it("takes the current value for a window member it is not given", () => {
    const result = applyQueryCommand(slice(), window({ page: 4, size: 25 }), {
      kind: "navigateWindow",
      page: 5,
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.window.size).toBe(25);
    const resized = applyQueryCommand(slice(), window({ page: 4, size: 25 }), {
      kind: "navigateWindow",
      size: 10,
    });
    if (resized.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(resized.window.page).toBe(4);
  });

  it("reports no change when navigating to the current window", () => {
    const result = applyQueryCommand(slice(), window({ page: 2, size: 25 }), {
      kind: "navigateWindow",
      page: 2,
      size: 25,
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.windowChanged).toBe(false);
  });

  it("reaches a page by the token the source handed back", () => {
    const result = applyQueryCommand(slice(), window({ page: 1 }), {
      kind: "navigateWindow",
      page: 2,
      cursor: "after-page-one",
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.window.cursor).toBe("after-page-one");
    expect(result.windowChanged).toBe(true);
  });

  it("keeps the token when neither the page nor the size moves", () => {
    const result = applyQueryCommand(
      slice(),
      window({ page: 2, cursor: "page-two" }),
      { kind: "navigateWindow", page: 2 },
    );
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.window.cursor).toBe("page-two");
    expect(result.windowChanged).toBe(false);
  });

  it("clears the token when the page or the size moves without one", () => {
    // A token addresses one page start, so moving without supplying one
    // leaves no token behind to describe the page that was left.
    const paged = applyQueryCommand(
      slice(),
      window({ page: 2, cursor: "page-two" }),
      { kind: "navigateWindow", page: 3 },
    );
    if (paged.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(paged.window.cursor).toBeNull();

    const resized = applyQueryCommand(
      slice(),
      window({ page: 2, cursor: "page-two" }),
      { kind: "navigateWindow", size: 10 },
    );
    if (resized.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(resized.window.cursor).toBeNull();
  });

  it("drops a token on the spot when asked for null", () => {
    const result = applyQueryCommand(
      slice(),
      window({ page: 2, cursor: "page-two" }),
      { kind: "navigateWindow", cursor: null },
    );
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.window.cursor).toBeNull();
    expect(result.window.page).toBe(2);
    expect(result.windowChanged).toBe(true);
  });

  it("rejects an empty cursor rather than reading it as no cursor", () => {
    const result = applyQueryCommand(slice(), window(), {
      kind: "navigateWindow",
      cursor: "",
    });
    if (result.status !== "rejected") {
      throw new Error("expected rejection");
    }
    expect(result.reason).toBe(
      "cursor must not be empty; use null to clear it",
    );
  });

  it("leaves the collapsed groups alone while navigating", () => {
    const result = applyQueryCommand(
      slice(),
      window({ collapsed: [["failed"]] }),
      { kind: "navigateWindow", page: 2 },
    );
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.window.collapsed).toEqual([["failed"]]);
  });

  it("treats a semantically unchanged edit as no change at all", () => {
    const base = slice({
      filter: [
        { field: "status", operator: "eq", operands: ["failed", "cancelled"] },
      ],
      sort: [{ field: "name", direction: "asc" }],
    });
    const result = applyQueryCommand(base, window({ page: 2 }), {
      kind: "setPredicate",
      predicate: {
        field: "status",
        operator: "eq",
        operands: ["cancelled", "failed"],
      },
    });
    if (result.status !== "accepted") {
      throw new Error("expected acceptance");
    }
    expect(result.sliceChanged).toBe(false);
    expect(result.windowChanged).toBe(false);
    expect(result.window.page).toBe(2);
  });

  it("rejects a predicate with an empty field", () => {
    const result = applyQueryCommand(slice(), window(), {
      kind: "setPredicate",
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

  it("rejects predicates that violate the bounded grammar", () => {
    const cases = [
      {
        kind: "setPredicate",
        predicate: { field: "status", operator: "eq", operands: [] },
      },
      {
        kind: "setPredicate",
        predicate: { field: "cpu", operator: "gte", operands: [1, 2] },
      },
      {
        kind: "setPredicate",
        predicate: { field: "cpu", operator: "gte", operands: [] },
      },
      {
        kind: "setPredicate",
        predicate: { field: "owner", operator: "isSet", operands: ["x"] },
      },
      {
        kind: "setPredicate",
        predicate: { field: "cpu", operator: "gte", operands: [Number.NaN] },
      },
      {
        kind: "setPredicate",
        predicate: {
          field: "cpu",
          operator: "lte",
          operands: [Number.POSITIVE_INFINITY],
        },
      },
      {
        kind: "setSort",
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
      kind: "setPredicate",
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
      kind: "setPredicate",
      predicate: { field: "status", operator: "contains", operands: ["x"] },
    } as unknown as { kind: "setPredicate"; predicate: Predicate };
    const result = applyQueryCommand(slice(), window(), forged);
    if (result.status !== "rejected") {
      throw new Error("expected rejection");
    }
    expect(result.reason).toBe("unknown predicate operator contains");
  });

  it("keeps state unchanged on rejection", () => {
    const base = slice({ search: "yak" });
    const result = applyQueryCommand(base, window({ page: 2 }), {
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
