/**
 * Reading one parameter set as a query. Mutation-tested: each expectation
 * fails if typed parsing, operator legality or the unknown/invalid split
 * moves.
 */

import { describe, expect, it } from "vitest";
import {
  declareCapabilities,
  declareSorting,
} from "../../../testing/fixtures.js";
import { DEFAULT_WINDOW, type ResultWindow } from "../query/index.js";
import { createSchema } from "../schema/index.js";
import decodeQuery from "./decodeQuery.js";
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
    { field: "name", kind: "text" },
  ]);

const decode = (search: string) =>
  decodeQuery({ schema: machines(), params: new URLSearchParams(search) });

const noQuery = { filter: [], search: null, sort: [], group: [] };

const firstPage: ResultWindow = {
  page: 1,
  size: 50,
  cursor: null,
  collapsed: [],
};

describe("decodeQuery", () => {
  it("defaults the window and decodes an empty parameter set", () => {
    const decoded = decode("");
    expect(decoded.slice).toEqual(noQuery);
    expect(decoded.window).toEqual(firstPage);
    expect(decoded.issues).toEqual([]);
  });

  it("reads repeated equality operands as one set predicate", () => {
    const decoded = decode("status=failed&status=cancelled");
    expect(decoded.slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed", "cancelled"] },
    ]);
    expect(decoded.issues).toEqual([]);
  });

  it("parses bounds to the field's own type, never a coerced string", () => {
    const decoded = decode("cpu__gte=4&updated__lte=2026-01-01");
    expect(decoded.slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
      { field: "updated", operator: "lte", operands: ["2026-01-01"] },
    ]);
  });

  it("applies the zero-value operator on its presence, not its value", () => {
    expect(decode("owner__isSet=0").slice.filter).toEqual([
      { field: "owner", operator: "isSet", operands: [] },
    ]);
  });

  it("reads search and an ordered sort", () => {
    const decoded = decode("q=yak&sort=status__asc&sort=updated__desc");
    expect(decoded.slice.search).toBe("yak");
    expect(decoded.slice.sort).toEqual([
      { field: "status", direction: "asc" },
      { field: "updated", direction: "desc" },
    ]);
  });

  it("reads repeated group parameters as ordered nesting levels", () => {
    const decoded = decode("group=status&group=owner");
    expect(decoded.slice.group).toEqual([
      { field: "status" },
      { field: "owner" },
    ]);
    expect(decoded.issues).toEqual([]);
  });

  it("reads an empty search as no search", () => {
    expect(decode("q=").slice.search).toBeNull();
  });

  it("reads the window and reports a value that is not a page", () => {
    expect(decode("page=3&size=25").window).toEqual({
      ...firstPage,
      page: 3,
      size: 25,
    });
    expect(decode("page=none")).toMatchObject({
      window: firstPage,
      issues: [
        { parameter: "page", reason: '"none" is not a positive integer' },
      ],
    });
    expect(decode("size=0").issues).toEqual([
      { parameter: "size", reason: '"0" is not a positive integer' },
    ]);
  });

  it("refuses a page or size past the safe integer range", () => {
    const huge = "9".repeat(400);
    expect(decode(`page=${huge}&size=${huge}`)).toEqual({
      slice: noQuery,
      window: firstPage,
      issues: [
        { parameter: "page", reason: `"${huge}" is too large` },
        { parameter: "size", reason: `"${huge}" is too large` },
      ],
    });
  });

  it("reads the token addressing the page's start", () => {
    expect(decode("page=3&cursor=after-page-two").window).toEqual({
      ...firstPage,
      page: 3,
      cursor: "after-page-two",
    });
  });

  it("drops a cursor the source cannot reach, and says so once", () => {
    const decoded = decodeQuery({
      schema: machines(),
      params: new URLSearchParams("page=3&cursor=after-page-two&sort=cpu__asc"),
      capabilities: declareCapabilities({ sort: declareSorting(["cpu"]) }),
    });
    // The source pages by number, so the token addresses nothing: the page
    // stands, the token goes, and the window is reported once rather than
    // once per clause.
    expect(decoded.window).toMatchObject({ page: 3, cursor: null });
    expect(decoded.slice.sort).toEqual([{ field: "cpu", direction: "asc" }]);
    expect(decoded.issues).toEqual([
      {
        parameter: "cursor",
        reason: "this source pages by number and reaches no page by token",
      },
    ]);
  });

  it("refuses a cursor carrying no token", () => {
    expect(decode("page=3&cursor=")).toMatchObject({
      window: { page: 3, cursor: null },
      issues: [
        {
          parameter: "cursor",
          reason: '"cursor" must carry the token a page handed back',
        },
      ],
    });
  });

  it("collapses nothing, whatever the parameters say", () => {
    // Collapse has no spelling, so a reload expands every group.
    expect(decode("group=status&collapsed=failed").window.collapsed).toEqual(
      [],
    );
  });

  it("reports extra values on the parameters the grammar spells once", () => {
    expect(decode("page=2&page=5").window.page).toBe(2);
    expect(decode("page=2&page=5").issues).toEqual([
      {
        parameter: "page",
        reason: '"page" takes one value; the extra values were ignored',
      },
    ]);
    expect(decode("q=yak&q=ox").slice.search).toBe("yak");
    expect(decode("cursor=a&cursor=b").window.cursor).toBe("a");
    expect(decode("cursor=a&cursor=b").issues).toEqual([
      {
        parameter: "cursor",
        reason: '"cursor" takes one value; the extra values were ignored',
      },
    ]);
    expect(decode("cpu__gte=4&cpu__gte=8").slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
    expect(decode("cpu__gte=4&cpu__gte=8").issues).toEqual([
      {
        parameter: "cpu__gte",
        reason: '"cpu__gte" takes one value; the extra values were ignored',
      },
    ]);
  });

  it("refuses a grouping level naming nothing", () => {
    expect(decode("group=")).toMatchObject({
      slice: { group: [] },
      issues: [{ parameter: "group", reason: '"group" must name a field' }],
    });
  });

  it("refuses a whole grouping when any of its levels names nothing", () => {
    // Dropping one level would nest the rest under a parent nobody asked for.
    const decoded = decode("group=status&group=&group=owner");
    expect(decoded.slice.group).toEqual([]);
    expect(decoded.issues).toEqual([
      { parameter: "group", reason: '"group" must name a field' },
    ]);
  });

  it("refuses a sort value that is not an ordered term", () => {
    expect(decode("sort=updated").issues).toEqual([
      { parameter: "sort", reason: '"updated" is not an ordered sort term' },
    ]);
    expect(decode("sort=__asc").issues).toEqual([
      { parameter: "sort", reason: '"__asc" is not an ordered sort term' },
    ]);
    expect(decode("sort=updated__sideways").issues).toEqual([
      {
        parameter: "sort",
        reason: '"updated__sideways" is not an ordered sort term',
      },
    ]);
    expect(decode("sort=updated__sideways").slice.sort).toEqual([]);
  });

  it("refuses a whole ordering when any of its terms is malformed", () => {
    const decoded = decode("sort=cpu__asc&sort=bogus&sort=status__desc");
    expect(decoded.slice.sort).toEqual([]);
    expect(decoded.issues).toEqual([
      { parameter: "sort", reason: '"bogus" is not an ordered sort term' },
    ]);
    expect(decode("sort=bogus&sort=worse").issues).toEqual([
      { parameter: "sort", reason: '"bogus" is not an ordered sort term' },
      { parameter: "sort", reason: '"worse" is not an ordered sort term' },
    ]);
  });

  it("orders by a field carrying no filter of its own", () => {
    // Sortable and filterable are different capabilities: a name column is
    // ordered without ever being a filter field.
    expect(decode("sort=name__asc").slice.sort).toEqual([
      { field: "name", direction: "asc" },
    ]);
    expect(decode("sort=name__asc").issues).toEqual([]);
    expect(decode("name=alder").slice.filter).toEqual([]);
    expect(decode("name=alder").issues).toEqual([
      {
        parameter: "name",
        reason: "text fields are ordered, not filtered",
      },
    ]);
  });

  it("groups on a field the schema does not describe", () => {
    // Seam for the grouping unit: a group level is not yet checked against
    // the schema the way an ordered term is.
    expect(decode("group=region").slice.group).toEqual([{ field: "region" }]);
    expect(decode("group=region").issues).toEqual([]);
  });

  it("refuses an ordering naming no field of the collection, whole", () => {
    const decoded = decode("sort=cpu__asc&sort=region__desc");
    expect(decoded.slice.sort).toEqual([]);
    expect(decoded.issues).toEqual([
      {
        parameter: "sort",
        reason: '"region" is not a field of this collection',
      },
    ]);
  });

  it("collapses a field spelled twice to its first term, without an issue", () => {
    // Not a refusal, only a respelling: the canonical link replaces it.
    const decoded = decode("sort=cpu__asc&sort=name__asc&sort=cpu__desc");
    expect(decoded.slice.sort).toEqual([
      { field: "cpu", direction: "asc" },
      { field: "name", direction: "asc" },
    ]);
    expect(decoded.issues).toEqual([]);
  });

  it("leaves the host's own parameters alone", () => {
    // Unknown, not invalid: a parameter naming no field of this collection
    // is the host's and is neither read nor reported.
    expect(decode("tab=overview&as=table&view=mine&item=m1")).toEqual({
      slice: noQuery,
      window: firstPage,
      issues: [],
    });
  });

  it("leaves a delimited parameter naming no field to the host", () => {
    // A host may spell its own keys with the delimiter; only a field's
    // addresses are the collection's.
    expect(decode("utm__source=mail&memory__gte=4")).toEqual({
      slice: noQuery,
      window: firstPage,
      issues: [],
    });
  });

  it("refuses an unknown operator on a field it owns", () => {
    expect(decode("cpu__near=4")).toEqual({
      slice: noQuery,
      window: firstPage,
      issues: [{ parameter: "cpu__near", reason: 'unknown operator "near"' }],
    });
  });

  it("refuses an operator the field's kind does not accept", () => {
    expect(decode("status__isSet=1").issues).toEqual([
      {
        parameter: "status__isSet",
        reason: 'choices field "status" does not accept the isSet operator',
      },
    ]);
    expect(decode("owner=yes").issues).toEqual([
      {
        parameter: "owner",
        reason: 'flag field "owner" does not accept the eq operator',
      },
    ]);
    expect(decode("status__gte=ready").issues).toEqual([
      {
        parameter: "status__gte",
        reason: 'choices field "status" does not accept the gte operator',
      },
    ]);
  });

  it("refuses a value the field's semantics reject, and narrows nothing", () => {
    expect(decode("status=melted")).toMatchObject({
      slice: { filter: [] },
      issues: [
        {
          parameter: "status",
          reason: '"melted" is not an option of "status"',
        },
      ],
    });
    expect(decode("cpu__gte=lots").issues).toEqual([
      { parameter: "cpu__gte", reason: "not a number" },
    ]);
    expect(decode("cpu__gte=99").issues).toEqual([
      { parameter: "cpu__gte", reason: "99 is above the maximum of 64" },
    ]);
    expect(decode("updated__gte=2026-02-30").issues).toEqual([
      {
        parameter: "updated__gte",
        reason: '"2026-02-30" is not an ISO-8601 calendar date (YYYY-MM-DD)',
      },
    ]);
  });

  it("reports an owned parameter given no value", () => {
    expect(decode("status=")).toMatchObject({
      slice: { filter: [] },
      issues: [{ parameter: "status", reason: '"status" was given no value' }],
    });
  });

  it("keeps the operands that pass and reports the ones that do not", () => {
    const decoded = decode("status=failed&status=melted");
    expect(decoded.slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed"] },
    ]);
    expect(decoded.issues).toEqual([
      { parameter: "status", reason: '"melted" is not an option of "status"' },
    ]);
  });

  it("reads back every finite number its own encode writes", () => {
    const schema = createSchema([{ field: "load", kind: "number" }]);
    const values = [1e21, -1.25e22, 1e-7, -1.5e-7, 0.1, 2 ** 53, 123.456];
    for (const value of values) {
      const slice = {
        ...noQuery,
        filter: [
          { field: "load", operator: "gte" as const, operands: [value] },
        ],
      };
      const params = encodeQuery({
        schema,
        slice,
        window: { ...DEFAULT_WINDOW, size: 5 },
      });
      expect(decodeQuery({ schema, params }).slice).toEqual(slice);
    }
    // Exponent text is still not a number: only the encoder respells.
    expect(
      decodeQuery({ schema, params: new URLSearchParams("load__gte=1e999") })
        .issues,
    ).toEqual([{ parameter: "load__gte", reason: "not a number" }]);
  });

  it("refuses each clause the source cannot execute, and only those", () => {
    const capabilities = declareCapabilities({
      filter: { status: ["eq"], cpu: ["gte"] },
      sort: declareSorting(["cpu"], 1),
    });
    const decoded = decodeQuery({
      schema: machines(),
      params: new URLSearchParams(
        "status=ready&cpu__gte=4&cpu__lte=8&owner__isSet=1&q=yak&sort=cpu__asc&group=status",
      ),
      capabilities,
    });
    expect(decoded.slice).toEqual({
      filter: [
        { field: "status", operator: "eq", operands: ["ready"] },
        { field: "cpu", operator: "gte", operands: [4] },
      ],
      search: null,
      sort: [{ field: "cpu", direction: "asc" }],
      group: [],
    });
    expect(decoded.issues).toEqual([
      {
        parameter: "cpu__lte",
        reason: 'field "cpu" cannot be filtered with lte',
      },
      {
        parameter: "owner__isSet",
        reason: 'field "owner" cannot be filtered',
      },
      { parameter: "q", reason: "this source cannot search" },
      { parameter: "group", reason: "this source cannot group" },
    ]);
  });

  it("reports every refusal one clause earns", () => {
    const decoded = decodeQuery({
      schema: machines(),
      params: new URLSearchParams("sort=cpu__asc&sort=name__desc"),
      capabilities: declareCapabilities({ sort: declareSorting(["status"]) }),
    });
    expect(decoded.slice.sort).toEqual([]);
    expect(decoded.issues).toEqual([
      { parameter: "sort", reason: 'field "cpu" cannot be sorted' },
      { parameter: "sort", reason: 'field "name" cannot be sorted' },
    ]);
  });

  it("refuses an ordering longer than the source executes, whole", () => {
    const capabilities = declareCapabilities({
      sort: declareSorting(["cpu", "name"], 1),
    });
    const decoded = decodeQuery({
      schema: machines(),
      params: new URLSearchParams("sort=cpu__asc&sort=name__desc"),
      capabilities,
    });
    expect(decoded.slice.sort).toEqual([]);
    expect(decoded.issues).toEqual([
      { parameter: "sort", reason: "this source orders by at most 1 term" },
    ]);
    // A field spelled twice is one term, so it fits the same limit.
    expect(
      decodeQuery({
        schema: machines(),
        params: new URLSearchParams("sort=cpu__asc&sort=cpu__desc"),
        capabilities,
      }),
    ).toMatchObject({
      slice: { sort: [{ field: "cpu", direction: "asc" }] },
      issues: [],
    });
  });

  it("checks only the grammar and the schema without a declaration", () => {
    for (const capabilities of [undefined, null]) {
      const decoded = decodeQuery({
        schema: machines(),
        params: new URLSearchParams("q=yak&sort=cpu__asc&group=status"),
        capabilities,
      });
      expect(decoded.slice).toEqual({
        filter: [],
        search: "yak",
        sort: [{ field: "cpu", direction: "asc" }],
        group: [{ field: "status" }],
      });
      expect(decoded.issues).toEqual([]);
    }
  });

  it("refuses an ordering whole rather than truncating it", () => {
    const decoded = decodeQuery({
      schema: machines(),
      params: new URLSearchParams("sort=cpu__asc&sort=name__desc"),
      capabilities: declareCapabilities({ sort: declareSorting(["cpu"]) }),
    });
    expect(decoded.slice.sort).toEqual([]);
    expect(decoded.issues).toEqual([
      { parameter: "sort", reason: 'field "name" cannot be sorted' },
    ]);
  });

  it("refuses a grouping whole rather than truncating it", () => {
    const decoded = decodeQuery({
      schema: machines(),
      params: new URLSearchParams("group=status&group=region"),
      capabilities: declareCapabilities({
        group: {
          fields: ["status"],
          depth: 2,
          summaries: "counts",
          collapse: false,
        },
      }),
    });
    expect(decoded.slice.group).toEqual([]);
    expect(decoded.issues).toEqual([
      { parameter: "group", reason: 'field "region" cannot be grouped' },
    ]);
  });

  it("keeps a grouping the source declares it can nest", () => {
    const decoded = decodeQuery({
      schema: machines(),
      params: new URLSearchParams("group=status&group=owner"),
      capabilities: declareCapabilities({
        group: {
          fields: ["status", "owner"],
          depth: 2,
          summaries: "counts",
          collapse: false,
        },
      }),
    });
    expect(decoded.slice.group).toEqual([
      { field: "status" },
      { field: "owner" },
    ]);
    expect(decoded.issues).toEqual([]);
  });

  it("round-trips an encoded query", () => {
    const schema = machines();
    const slice = {
      filter: [
        { field: "cpu", operator: "gte" as const, operands: [4] },
        {
          field: "status",
          operator: "eq" as const,
          operands: ["cancelled", "failed"],
        },
      ],
      search: "yak",
      sort: [{ field: "updated", direction: "desc" as const }],
      group: [{ field: "status" }],
    };
    const window: ResultWindow = {
      page: 2,
      size: 25,
      cursor: "after-page-one",
      collapsed: [],
    };
    const decoded = decodeQuery({
      schema,
      params: encodeQuery({ schema, slice, window }),
    });
    expect(decoded.slice).toEqual(slice);
    expect(decoded.window).toEqual(window);
    expect(decoded.issues).toEqual([]);
  });
});
