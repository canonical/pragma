import { describe, expect, it } from "vitest";
import { fromCursor, sliceConnection, toCursor } from "./connection.js";

const items = ["a", "b", "c", "d", "e"];
const identify = (item: string): string => item;
const slice = (args: Parameters<typeof sliceConnection>[2]) =>
  sliceConnection(items, identify, args);

describe("cursors", () => {
  it("round-trip", () => {
    const uri = "https://metro.example/stop/northgate";
    expect(fromCursor(toCursor(uri))).toBe(uri);
  });

  it("are opaque base64, not the IRI itself", () => {
    expect(toCursor("a")).not.toBe("a");
  });
});

describe("sliceConnection", () => {
  it("returns everything, unflagged, when no arguments are given", () => {
    expect(slice({})).toEqual({
      items,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it("takes `first` from the head and flags a next page", () => {
    expect(slice({ first: 2 })).toEqual({
      items: ["a", "b"],
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it("does not flag a next page when `first` exceeds the list", () => {
    expect(slice({ first: 99 }).hasNextPage).toBe(false);
  });

  it("cuts to `after` and flags a previous page", () => {
    expect(slice({ after: toCursor("c") })).toEqual({
      items: ["d", "e"],
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  // The two cells where the count cut and the cursor cut DISAGREE, and where
  // seeding the flags from the cursor answer got them backwards. Both are
  // client-supplied counts, so the spec's count answer takes precedence.
  it("first + before: the window fits, so there is no next page", () => {
    // Window is [a, b] and `first` is 2 — nothing was trimmed, so nothing
    // lies beyond this page. Reporting a next page here walks a client into
    // an empty one.
    expect(slice({ before: toCursor("c"), first: 2 })).toEqual({
      items: ["a", "b"],
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it("last + after: the window fits, so there is no previous page", () => {
    expect(slice({ after: toCursor("a"), last: 5 })).toEqual({
      items: ["b", "c", "d", "e"],
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it("cuts to `before` and flags a next page", () => {
    expect(slice({ before: toCursor("c") })).toEqual({
      items: ["a", "b"],
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it("takes `last` from the tail without claiming a next page", () => {
    expect(slice({ last: 2 })).toEqual({
      items: ["d", "e"],
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it("does not flag a previous page when `last` exceeds the list", () => {
    expect(slice({ last: 99 }).hasPreviousPage).toBe(false);
  });

  it("applies `after` and `before` together", () => {
    expect(slice({ after: toCursor("a"), before: toCursor("e") })).toEqual({
      items: ["b", "c", "d"],
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it("applies `first` and `last` together, head first", () => {
    expect(slice({ first: 4, last: 2 })).toEqual({
      items: ["c", "d"],
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it("ignores an unknown `after` cursor rather than throwing", () => {
    expect(slice({ after: toCursor("zzz") }).items).toEqual(items);
  });

  it("ignores an unknown `before` cursor rather than throwing", () => {
    expect(slice({ before: toCursor("zzz") }).items).toEqual(items);
  });

  it("treats an explicitly null cursor as absent", () => {
    expect(slice({ after: null, before: null }).items).toEqual(items);
  });

  it("yields no edges for `first: 0`, and still reports the next page", () => {
    expect(slice({ first: 0 })).toEqual({
      items: [],
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it("yields no edges for `last: 0`", () => {
    expect(slice({ last: 0 }).items).toEqual([]);
  });

  it("rejects a negative `first`", () => {
    // The spec says a negative count is an error, and clamping is the worse
    // answer anyway: `first: -1` quietly returning a default page is a client
    // bug that never surfaces.
    expect(() => slice({ first: -3 })).toThrow(/first must not be negative/);
  });

  it("rejects a negative `last`", () => {
    expect(() => slice({ last: -3 })).toThrow(/last must not be negative/);
  });

  it("handles an empty input list", () => {
    expect(sliceConnection([], identify, { first: 5 })).toEqual({
      items: [],
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it("yields nothing when `before` precedes `after`", () => {
    expect(
      slice({ after: toCursor("d"), before: toCursor("b") }).items,
    ).toEqual([]);
  });

  it("caps an unbounded query at the default page size", () => {
    const many = Array.from({ length: 25 }, (_, index) => `item-${index}`);
    const page = sliceConnection(many, identify, {});
    expect(page.items).toHaveLength(20);
    expect(page.hasNextPage).toBe(true);
  });
});

describe("sliceConnection: the flags come from the cursor window", () => {
  // The three points the module header names, each with the value the spec
  // requires rather than the one an obvious implementation produces.
  it("reads `last` against the cursor window, not the window `first` left", () => {
    // ApplyCursorsToEdges holds five; `last: 4` is fewer than five, so there
    // IS a previous page. Asking after `first: 2` had shortened the window to
    // two answered false, and a backward-paging client stopped one page early.
    expect(slice({ first: 2, last: 4 })).toEqual({
      items: ["a", "b"],
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it("treats an explicit null count as no count at all", () => {
    // GraphQL delivers an omitted argument and an explicit null differently;
    // the spec treats them alike. With neither count supplied the flags are
    // the CURSOR answer, so a full list has nothing before or after it.
    expect(slice({ first: null, last: null })).toEqual({
      items,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it("still answers from the cursor when only the default page size trimmed", () => {
    expect(slice({ after: toCursor("b") })).toEqual({
      items: ["c", "d", "e"],
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });
});
