/**
 * Encoding one query as URL parameters. Mutation-tested: each expectation
 * fails if canonicalization, duplicate preservation or host-parameter
 * preservation is dropped.
 */

import { describe, expect, it } from "vitest";
import type { ResultWindow, Slice } from "../query/types.js";
import createSchema from "../schema/createSchema.js";
import encodeQuery from "./encodeQuery.js";

const machines = () =>
  createSchema([
    {
      field: "status",
      kind: "choices",
      options: ["failed", "cancelled", "ready"],
    },
    { field: "cpu", kind: "number", min: 0, max: 64 },
    { field: "updated", kind: "date" },
    { field: "owner", kind: "flag" },
  ]);

const emptySlice: Slice = {
  filter: [],
  search: null,
  sort: [],
  group: null,
};

const firstPage: ResultWindow = { page: 1, size: 50 };

describe("encodeQuery", () => {
  it("writes the window even when the query is empty", () => {
    expect(
      encodeQuery({
        schema: machines(),
        slice: emptySlice,
        window: { page: 2, size: 25 },
      }).toString(),
    ).toBe("page=2&size=25");
  });

  it("writes no window when it is null, as a saved view keeps the query", () => {
    expect(
      encodeQuery({
        schema: machines(),
        window: null,
        slice: {
          ...emptySlice,
          filter: [{ field: "status", operator: "eq", operands: ["failed"] }],
        },
        preserve: new URLSearchParams("as=table&page=4&size=10"),
      }).toString(),
    ).toBe("as=table&status=failed");
  });

  it("repeats equality operands and canonicalizes them as a set", () => {
    const params = encodeQuery({
      schema: machines(),
      slice: {
        ...emptySlice,
        filter: [
          {
            field: "status",
            operator: "eq",
            operands: ["failed", "cancelled", "failed"],
          },
        ],
      },
      window: firstPage,
    });
    expect(params.getAll("status")).toEqual(["cancelled", "failed"]);
  });

  it("spells bounds, the zero-value operator, search and grouping", () => {
    const params = encodeQuery({
      schema: machines(),
      slice: {
        filter: [
          { field: "cpu", operator: "gte", operands: [4] },
          { field: "updated", operator: "lte", operands: ["2026-01-01"] },
          { field: "owner", operator: "isSet", operands: [] },
        ],
        search: "yak",
        sort: [],
        group: "status",
      },
      window: firstPage,
    });
    expect(params.get("cpu__gte")).toBe("4");
    expect(params.get("updated__lte")).toBe("2026-01-01");
    expect(params.get("owner__isSet")).toBe("1");
    expect(params.get("q")).toBe("yak");
    expect(params.get("group")).toBe("status");
  });

  it("preserves sort precedence rather than ordering the terms", () => {
    const encode = (sort: Slice["sort"]) =>
      encodeQuery({
        schema: machines(),
        slice: { ...emptySlice, sort },
        window: firstPage,
      }).getAll("sort");
    expect(
      encode([
        { field: "status", direction: "asc" },
        { field: "updated", direction: "desc" },
      ]),
    ).toEqual(["status__asc", "updated__desc"]);
    expect(
      encode([
        { field: "updated", direction: "desc" },
        { field: "status", direction: "asc" },
      ]),
    ).toEqual(["updated__desc", "status__asc"]);
  });

  it("writes no search parameter for an empty search", () => {
    expect(
      encodeQuery({
        schema: machines(),
        slice: { ...emptySlice, search: "" },
        window: firstPage,
      }).has("q"),
    ).toBe(false);
  });

  it("replaces its own keys and leaves the host's parameters alone", () => {
    const preserve = new URLSearchParams(
      "tab=overview&status=ready&tab=details&page=9&cursor=abc&sort=stale__asc",
    );
    const params = encodeQuery({
      schema: machines(),
      slice: {
        ...emptySlice,
        filter: [{ field: "status", operator: "eq", operands: ["failed"] }],
      },
      window: firstPage,
      preserve,
    });
    // Host duplicates survive in their original order.
    expect(params.getAll("tab")).toEqual(["overview", "details"]);
    // The cursor is reserved but not owned: the host still holds it.
    expect(params.get("cursor")).toBe("abc");
    // Stale owned parameters are gone, not merged.
    expect(params.getAll("status")).toEqual(["failed"]);
    expect(params.getAll("sort")).toEqual([]);
    expect(params.get("page")).toBe("1");
    // The caller's parameters are never mutated.
    expect(preserve.get("page")).toBe("9");
  });

  it("clears every address of a field it owns, and no host key", () => {
    const params = encodeQuery({
      schema: machines(),
      slice: emptySlice,
      window: firstPage,
      preserve: new URLSearchParams("cpu__near=4&utm__source=mail"),
    });
    // A refused operator on an owned field is the collection's to clear; a
    // delimited key whose prefix is no field is the host's.
    expect(params.toString()).toBe("utm__source=mail&page=1&size=50");
  });

  it("writes a bound in plain decimal, whatever its magnitude", () => {
    const schema = createSchema([{ field: "load", kind: "number" }]);
    const spell = (value: number) =>
      encodeQuery({
        schema,
        slice: {
          ...emptySlice,
          filter: [{ field: "load", operator: "gte", operands: [value] }],
        },
        window: firstPage,
      }).get("load__gte");
    expect(spell(1e21)).toBe("1000000000000000000000");
    expect(spell(-1.25e22)).toBe("-12500000000000000000000");
    expect(spell(1.5e-7)).toBe("0.00000015");
    expect(spell(4)).toBe("4");
  });

  it("is stable: encoding its own output changes nothing", () => {
    const schema = machines();
    const slice: Slice = {
      filter: [
        { field: "status", operator: "eq", operands: ["ready", "failed"] },
        { field: "cpu", operator: "gte", operands: [4] },
      ],
      search: "yak",
      sort: [{ field: "updated", direction: "desc" }],
      group: "status",
    };
    const first = encodeQuery({ schema, slice, window: firstPage });
    const second = encodeQuery({
      schema,
      slice,
      window: firstPage,
      preserve: first,
    });
    expect(second.toString()).toBe(first.toString());
  });
});
