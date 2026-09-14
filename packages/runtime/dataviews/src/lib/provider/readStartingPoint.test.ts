import { describe, expect, it } from "vitest";
import { byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../collection/index.js";
import { createMemoryLocation } from "../location/index.js";
import type { DataViewsSnapshot } from "../snapshot/index.js";
import readStartingPoint from "./readStartingPoint.js";

const machines = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
    { field: "cores", kind: "number", min: 0 },
  ],
});

const capabilities = declare({ filter: { status: ["eq"] } });

describe("readStartingPoint", () => {
  it("stands on the location's query and view when it carries one, keeping the snapshot's query to reset to", () => {
    const point = readStartingPoint({
      collection: machines,
      capabilities,
      location: createMemoryLocation({
        href: "/machines?view=v1&status=failed&cores__gte=2",
      }),
      snapshot: { query: "view=v2&status=running", presentation: {} },
      keepsViews: true,
    });
    expect(point.initial?.slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed"] },
    ]);
    expect(point.start?.slice.filter.at(0)?.operands).toEqual(["running"]);
    expect(point.view).toBe("v1");
    // The location's refusals, the query it stands on being the location's.
    expect(point.issues.map(({ parameter }) => parameter)).toEqual([
      "cores__gte",
    ]);
    // Drawn under another view than the one the provider stands on: none.
    expect(point.restored).toBeUndefined();
  });

  it("takes the snapshot's view when the location carries no query, and reads nothing without either", () => {
    const point = readStartingPoint({
      collection: machines,
      capabilities,
      location: createMemoryLocation({ href: "/machines?tab=inventory" }),
      snapshot: { query: "view=v2&cores__gte=2", presentation: {} },
      keepsViews: true,
    });
    expect(point.initial).toBeUndefined();
    expect(point.view).toBe("v2");
    expect(point.issues.map(({ parameter }) => parameter)).toEqual([
      "cores__gte",
    ]);
    expect(
      readStartingPoint({
        collection: machines,
        capabilities,
        location: undefined,
        snapshot: undefined,
        keepsViews: false,
      }),
    ).toEqual({
      start: undefined,
      initial: undefined,
      issues: [],
      view: null,
      restored: undefined,
    });
  });

  it("restores an arrangement under a view only where the provider stands on it and keeps views", () => {
    const restore = (href: string, keepsViews: boolean) =>
      readStartingPoint({
        collection: machines,
        capabilities,
        location: createMemoryLocation({ href }),
        snapshot: {
          query: "view=v1&status=failed",
          presentation: { "table.hidden": ["cores"] },
        },
        keepsViews,
      }).restored;
    expect(restore("/machines", true)).toEqual({
      view: "v1",
      presentation: { "table.hidden": ["cores"] },
    });
    expect(restore("/machines?view=v1&status=failed", true)?.view).toBe("v1");
    expect(restore("/machines?status=failed", true)).toBeUndefined();
    expect(restore("/machines?view=v2", true)).toBeUndefined();
    expect(restore("/machines", false)).toBeUndefined();
  });

  it("reads a snapshot query that is not text as no query", () => {
    const snapshot: DataViewsSnapshot = JSON.parse(
      '{"query":[1],"presentation":{}}',
    );
    const point = readStartingPoint({
      collection: machines,
      capabilities,
      location: undefined,
      snapshot,
      keepsViews: false,
    });
    expect(point.start?.slice.filter).toEqual([]);
    expect(point.issues).toEqual([]);
  });

  it("takes an arrangement only when it is a keyed record", () => {
    const readArrangement = (presentation: unknown) => {
      // A snapshot as JSON hands it over: shaped by nobody.
      const snapshot: DataViewsSnapshot = JSON.parse(
        JSON.stringify({ query: "", presentation }),
      );
      return readStartingPoint({
        collection: machines,
        capabilities,
        location: undefined,
        snapshot,
        keepsViews: false,
      }).restored?.presentation;
    };
    expect(readArrangement({ "table.hidden": ["cores"] })).toEqual({
      "table.hidden": ["cores"],
    });
    expect(readArrangement(null)).toEqual({});
    expect(readArrangement(["cores"])).toEqual({});
    expect(readArrangement("cores")).toEqual({});
  });

  it("reads a record carrying neither a query nor an arrangement as empty ones", () => {
    const snapshot: DataViewsSnapshot = JSON.parse("{}");
    const point = readStartingPoint({
      collection: machines,
      capabilities,
      location: undefined,
      snapshot,
      keepsViews: false,
    });
    expect(point.start?.slice.filter).toEqual([]);
    expect(point.restored).toEqual({ view: null, presentation: {} });
  });
});
