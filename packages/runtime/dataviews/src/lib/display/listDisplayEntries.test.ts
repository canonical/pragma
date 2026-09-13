import { describe, expect, it } from "vitest";
import { displayStatusOf } from "../../../testing/fixtures.js";
import { DISPLAY_STATUS_PHASES } from "./constants.js";
import listDisplayEntries from "./listDisplayEntries.js";
import type { DisplayStatus } from "./types.js";

const STALE: DisplayStatus = { status: "stale", reason: "offline" };

describe("listDisplayEntries", () => {
  it("displays one record entry per row, after the header row", () => {
    expect(
      listDisplayEntries({ rowIds: ["m-1", "m-2"], status: null }),
    ).toEqual([
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
    expect(
      listDisplayEntries({ rowIds: [], status: { status: "pending" } }),
    ).toEqual([
      {
        kind: "status",
        id: "status",
        index: 2,
        parent: null,
        status: { status: "pending" },
      },
    ]);
  });

  it("keeps the rows under the statuses that speak about them, and withholds them behind every other", () => {
    // Every status the core knows, so a status added to the union is
    // classified here or fails here.
    for (const status of Object.keys(
      DISPLAY_STATUS_PHASES,
    ) as DisplayStatus["status"][]) {
      const ids = listDisplayEntries({
        rowIds: ["m-1"],
        status: displayStatusOf(status),
      }).map((entry) => [entry.id, entry.index]);
      expect(ids, status).toEqual(
        status === "stale" || status === "refresh-failed"
          ? [
              ["status", 2],
              ["record:m-1", 3],
            ]
          : [["status", 2]],
      );
    }
  });

  it("never lets a row identity collide with the status row", () => {
    const entries = listDisplayEntries({ rowIds: ["status"], status: STALE });
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(2);
  });

  it("freezes the list and every entry", () => {
    const entries = listDisplayEntries({ rowIds: ["m-1"], status: STALE });
    expect(Object.isFrozen(entries)).toBe(true);
    expect(entries.every((entry) => Object.isFrozen(entry))).toBe(true);
  });
});
