import { describe, expect, it } from "vitest";
import displayEntries from "./displayEntries.js";

describe("displayEntries", () => {
  it("displays one record entry per row, after the header row", () => {
    expect(displayEntries({ rowIds: ["m-1", "m-2"], status: null })).toEqual([
      {
        kind: "record",
        id: "record:m-1",
        index: 2,
        parent: null,
        rowId: "m-1",
      },
      {
        kind: "record",
        id: "record:m-2",
        index: 3,
        parent: null,
        rowId: "m-2",
      },
    ]);
  });

  it("displays a status alone in place of the rows", () => {
    expect(displayEntries({ rowIds: [], status: "loading" })).toEqual([
      {
        kind: "status",
        id: "status",
        index: 2,
        parent: null,
        status: "loading",
      },
    ]);
  });

  it("puts a status ahead of the rows it describes", () => {
    const entries = displayEntries({ rowIds: ["m-1"], status: "stale" });
    expect(entries.map((entry) => [entry.id, entry.index])).toEqual([
      ["status", 2],
      ["record:m-1", 3],
    ]);
  });

  it("never lets a row identity collide with the status row", () => {
    const entries = displayEntries({ rowIds: ["status"], status: "stale" });
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(2);
  });

  it("freezes the list and every entry", () => {
    const entries = displayEntries({ rowIds: ["m-1"], status: "stale" });
    expect(Object.isFrozen(entries)).toBe(true);
    expect(entries.every((entry) => Object.isFrozen(entry))).toBe(true);
  });
});
