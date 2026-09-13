/**
 * Encoding one query as URL parameters. Mutation-tested: each expectation
 * fails if canonicalization, duplicate preservation or host-parameter
 * preservation is dropped.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_WINDOW,
  type ResultWindow,
  type Slice,
} from "../query/index.js";
import { createSchema } from "../schema/index.js";
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
  group: [],
};

const firstPage: ResultWindow = DEFAULT_WINDOW;

describe("encodeQuery", () => {
  it("writes the window even when the query is empty", () => {
    expect(
      encodeQuery({
        schema: machines(),
        slice: emptySlice,
        window: { ...DEFAULT_WINDOW, page: 2, size: 25 },
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
        preserve: new URLSearchParams("as=table&page=4&size=10&cursor=abc"),
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

  it("spells bounds, the zero-value operator and search", () => {
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
        group: [],
      },
      window: firstPage,
    });
    expect(params.get("cpu__gte")).toBe("4");
    expect(params.get("updated__lte")).toBe("2026-01-01");
    expect(params.get("owner__isSet")).toBe("1");
    expect(params.get("q")).toBe("yak");
  });

  it("writes one group parameter per nesting level, outermost first", () => {
    const params = encodeQuery({
      schema: machines(),
      slice: {
        ...emptySlice,
        group: [{ field: "status" }, { field: "owner" }],
      },
      window: firstPage,
    });
    expect(params.getAll("group")).toEqual(["status", "owner"]);
  });

  it("writes no group parameter for an ungrouped query", () => {
    expect(
      encodeQuery({
        schema: machines(),
        slice: emptySlice,
        window: firstPage,
      }).has("group"),
    ).toBe(false);
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

  it("writes the cursor the window carries", () => {
    expect(
      encodeQuery({
        schema: machines(),
        slice: emptySlice,
        window: { ...DEFAULT_WINDOW, page: 3, cursor: "after-page-two" },
      }).toString(),
    ).toBe("page=3&size=50&cursor=after-page-two");
  });

  it("writes no cursor when the window carries none", () => {
    expect(
      encodeQuery({
        schema: machines(),
        slice: emptySlice,
        window: { ...DEFAULT_WINDOW, page: 3 },
      }).has("cursor"),
    ).toBe(false);
  });

  it("clears a stale cursor rather than leaving it to address another page", () => {
    expect(
      encodeQuery({
        schema: machines(),
        slice: emptySlice,
        window: { ...DEFAULT_WINDOW, page: 2 },
        preserve: new URLSearchParams("cursor=stale&tab=overview"),
      }).toString(),
    ).toBe("tab=overview&page=2&size=50");
  });

  it("never writes the collapsed groups, so a reload expands them", () => {
    expect(
      encodeQuery({
        schema: machines(),
        slice: { ...emptySlice, group: [{ field: "status" }] },
        window: { ...DEFAULT_WINDOW, collapsed: [["failed"], ["ready"]] },
      }).toString(),
    ).toBe("group=status&page=1&size=50");
  });

  it("replaces its own keys and leaves the host's parameters alone", () => {
    const preserve = new URLSearchParams(
      "tab=overview&status=ready&tab=details&page=9&view=mine&sort=stale__asc",
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
    // An annotation is reserved but not owned: the host still holds it.
    expect(params.get("view")).toBe("mine");
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
    expect(spell(-1.5e-7)).toBe("-0.00000015");
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
      group: [{ field: "status" }],
    };
    const window: ResultWindow = { ...DEFAULT_WINDOW, cursor: "token" };
    const first = encodeQuery({ schema, slice, window });
    const second = encodeQuery({ schema, slice, window, preserve: first });
    expect(second.toString()).toBe(first.toString());
  });
});
