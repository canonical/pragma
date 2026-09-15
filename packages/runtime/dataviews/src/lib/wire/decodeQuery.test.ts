/**
 * Reading one parameter set as a query. Mutation-tested: each expectation
 * fails if typed parsing, operator legality or the unknown/invalid split
 * moves.
 */

import { describe, expect, it } from "vitest";
import { declare, declareSort } from "../../../testing/fixtures.js";
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

  it("reads repeated isAny operands as one set predicate", () => {
    const decoded = decode("status=failed&status=cancelled");
    expect(decoded.slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["failed", "cancelled"] },
    ]);
    expect(decoded.issues).toEqual([]);
  });

  it("reads isAny under its bare and its delimited spelling as one set", () => {
    // The bare field is any-of, as any-of was always spelled.
    expect(decode("status__isAny=failed&status__isAny=ready").slice).toEqual(
      decode("status=failed&status=ready").slice,
    );
    // Both spellings on one link address one predicate, holding both sets.
    const mixed = decode(
      "status=failed&status__isAny=ready&status__isAny=failed",
    );
    expect(mixed.slice.filter).toEqual([
      {
        field: "status",
        operator: "isAny",
        operands: ["failed", "ready", "failed"],
      },
    ]);
    expect(mixed.issues).toEqual([]);
    // Written back, the delimited spelling is respelled bare, once per option.
    expect(
      encodeQuery({
        schema: machines(),
        slice: mixed.slice,
        window: null,
      }).toString(),
    ).toBe("status=failed&status=ready");
  });

  it("reads isNone as its own set, beside any-of on the same field", () => {
    const decoded = decode(
      "status__isNone=ready&status__isNone=cancelled&status=failed",
    );
    expect(decoded.slice.filter).toEqual([
      { field: "status", operator: "isNone", operands: ["ready", "cancelled"] },
      { field: "status", operator: "isAny", operands: ["failed"] },
    ]);
    expect(decode("status__isNone=deployed").issues).toEqual([
      {
        parameter: "status__isNone",
        code: "invalid",
        reason: '"deployed" is not an option of "status"',
      },
    ]);
  });

  it("reads the text a text field starts with, literally and once", () => {
    const decoded = decode(`name__startsWith=${encodeURIComponent(" 50%_")}`);
    expect(decoded.slice.filter).toEqual([
      { field: "name", operator: "startsWith", operands: [" 50%_"] },
    ]);
    expect(decode("name__startsWith=a&name__startsWith=b").issues).toEqual([
      {
        parameter: "name__startsWith",
        code: "malformed",
        reason:
          '"name__startsWith" takes one value; the extra values were ignored',
      },
    ]);
    expect(decode("status__startsWith=f").issues).toEqual([
      {
        parameter: "status__startsWith",
        code: "invalid",
        reason:
          'choices field "status" does not accept the startsWith operator',
      },
    ]);
    expect(decode("name__isAny=web").issues).toEqual([
      {
        parameter: "name__isAny",
        code: "invalid",
        reason: 'text field "name" does not accept the isAny operator',
      },
    ]);
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
        {
          parameter: "page",
          code: "malformed",
          reason: '"none" is not a positive integer',
        },
      ],
    });
    expect(decode("size=0").issues).toEqual([
      {
        parameter: "size",
        code: "malformed",
        reason: '"0" is not a positive integer',
      },
    ]);
  });

  it("refuses a page or size past the safe integer range", () => {
    const huge = "9".repeat(400);
    expect(decode(`page=${huge}&size=${huge}`)).toEqual({
      slice: noQuery,
      window: firstPage,
      issues: [
        {
          parameter: "page",
          code: "malformed",
          reason: `"${huge}" is too large`,
        },
        {
          parameter: "size",
          code: "malformed",
          reason: `"${huge}" is too large`,
        },
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
      capabilities: declare({ sort: declareSort(["cpu"]) }),
    });
    // The source pages by number, so the token addresses nothing: the page
    // stands, the token goes, and the window is reported once rather than
    // once per clause.
    expect(decoded.window).toMatchObject({ page: 3, cursor: null });
    expect(decoded.slice.sort).toEqual([{ field: "cpu", direction: "asc" }]);
    expect(decoded.issues).toEqual([
      {
        parameter: "cursor",
        code: "unreachable-page",
        reason: "this source pages by number and reaches no page by token",
      },
    ]);
  });

  it("reads a blank cursor as none", () => {
    expect(decode("page=3&cursor=")).toMatchObject({
      window: { page: 3, cursor: null },
      issues: [],
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
        code: "malformed",
        reason: '"page" takes one value; the extra values were ignored',
      },
    ]);
    expect(decode("q=yak&q=ox").slice.search).toBe("yak");
    expect(decode("cursor=a&cursor=b").window.cursor).toBe("a");
    expect(decode("cursor=a&cursor=b").issues).toEqual([
      {
        parameter: "cursor",
        code: "malformed",
        reason: '"cursor" takes one value; the extra values were ignored',
      },
    ]);
    expect(decode("cpu__gte=4&cpu__gte=8").slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
    expect(decode("cpu__gte=4&cpu__gte=8").issues).toEqual([
      {
        parameter: "cpu__gte",
        code: "malformed",
        reason: '"cpu__gte" takes one value; the extra values were ignored',
      },
    ]);
  });

  it("reads a blank grouping level as none, beside the levels that name a field", () => {
    expect(decode("group=")).toMatchObject({
      slice: { group: [] },
      issues: [],
    });
    const decoded = decode("group=status&group=&group=owner");
    expect(decoded.slice.group).toEqual([
      { field: "status" },
      { field: "owner" },
    ]);
    expect(decoded.issues).toEqual([]);
  });

  it("refuses a sort value that is not an ordered term", () => {
    expect(decode("sort=updated").issues).toEqual([
      {
        parameter: "sort",
        code: "malformed",
        reason: '"updated" is not an ordered sort term',
      },
    ]);
    expect(decode("sort=__asc").issues).toEqual([
      {
        parameter: "sort",
        code: "malformed",
        reason: '"__asc" is not an ordered sort term',
      },
    ]);
    expect(decode("sort=updated__sideways").issues).toEqual([
      {
        parameter: "sort",
        code: "malformed",
        reason: '"updated__sideways" is not an ordered sort term',
      },
    ]);
    expect(decode("sort=updated__sideways").slice.sort).toEqual([]);
  });

  it("refuses a whole ordering when any of its terms is malformed", () => {
    const decoded = decode("sort=cpu__asc&sort=bogus&sort=status__desc");
    expect(decoded.slice.sort).toEqual([]);
    expect(decoded.issues).toEqual([
      {
        parameter: "sort",
        code: "malformed",
        reason: '"bogus" is not an ordered sort term',
      },
    ]);
    expect(decode("sort=bogus&sort=worse").issues).toEqual([
      {
        parameter: "sort",
        code: "malformed",
        reason: '"bogus" is not an ordered sort term',
      },
      {
        parameter: "sort",
        code: "malformed",
        reason: '"worse" is not an ordered sort term',
      },
    ]);
  });

  it("orders by a text field, which is never filtered by a set operator", () => {
    // Sortable and filterable are different capabilities: a name column is
    // ordered, and filtered only by the text it contains.
    expect(decode("sort=name__asc").slice.sort).toEqual([
      { field: "name", direction: "asc" },
    ]);
    expect(decode("sort=name__asc").issues).toEqual([]);
    expect(decode("name=alder").slice.filter).toEqual([]);
    expect(decode("name=alder").issues).toEqual([
      {
        parameter: "name",
        code: "invalid",
        reason: 'text field "name" does not accept the isAny operator',
      },
    ]);
  });

  it("reads the text a text field contains, literally", () => {
    const decoded = decode(`name__contains=${encodeURIComponent(" 50%_ ")}`);
    expect(decoded.slice.filter).toEqual([
      { field: "name", operator: "contains", operands: [" 50%_ "] },
    ]);
    expect(decoded.issues).toEqual([]);
    // A blank submission is an input left empty, and restricts nothing.
    expect(decode("name__contains=")).toEqual(decode(""));
    expect(decode("name__contains=web&name__contains=api").issues).toEqual([
      {
        parameter: "name__contains",
        code: "malformed",
        reason:
          '"name__contains" takes one value; the extra values were ignored',
      },
    ]);
    expect(decode("status__contains=fail").issues).toEqual([
      {
        parameter: "status__contains",
        code: "invalid",
        reason: 'choices field "status" does not accept the contains operator',
      },
    ]);
  });

  it("groups on a field the schema does not describe", () => {
    // A group level is not yet checked against the schema the way an ordered
    // term is; the group header row is what will read it.
    expect(decode("group=region").slice.group).toEqual([{ field: "region" }]);
    expect(decode("group=region").issues).toEqual([]);
  });

  it("refuses an ordering naming no field of the collection, whole", () => {
    const decoded = decode("sort=cpu__asc&sort=region__desc");
    expect(decoded.slice.sort).toEqual([]);
    expect(decoded.issues).toEqual([
      {
        parameter: "sort",
        code: "unknown-field",
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
      issues: [
        {
          parameter: "cpu__near",
          code: "malformed",
          reason: 'unknown operator "near"',
        },
      ],
    });
  });

  it("refuses an operator the field's kind does not accept", () => {
    expect(decode("status__isSet=1").issues).toEqual([
      {
        parameter: "status__isSet",
        code: "invalid",
        reason: 'choices field "status" does not accept the isSet operator',
      },
    ]);
    expect(decode("owner=yes").issues).toEqual([
      {
        parameter: "owner",
        code: "invalid",
        reason: 'flag field "owner" does not accept the isAny operator',
      },
    ]);
    expect(decode("status__gte=ready").issues).toEqual([
      {
        parameter: "status__gte",
        code: "invalid",
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
          code: "invalid",
          reason: '"melted" is not an option of "status"',
        },
      ],
    });
    expect(decode("cpu__gte=lots").issues).toEqual([
      { parameter: "cpu__gte", code: "invalid", reason: "not a number" },
    ]);
    expect(decode("cpu__gte=99").issues).toEqual([
      {
        parameter: "cpu__gte",
        code: "invalid",
        reason: "99 is above the maximum of 64",
      },
    ]);
    expect(decode("updated__gte=2026-02-30").issues).toEqual([
      {
        parameter: "updated__gte",
        code: "invalid",
        reason: '"2026-02-30" is not an ISO-8601 calendar date (YYYY-MM-DD)',
      },
    ]);
  });

  it("reads a blank owned parameter as no clause", () => {
    // A native GET form submits every named control, the empty ones as
    // `name=`: a bound nobody typed in is no clause, not a refusal.
    expect(
      decode("status=&cpu__gte=&cpu__lte=&sort=&page=&size="),
    ).toMatchObject({
      slice: { filter: [], sort: [] },
      window: firstPage,
      issues: [],
    });
    // Blank beside a value: the value is the clause.
    expect(decode("status=&status=failed").slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["failed"] },
    ]);
  });

  it("keeps the operands that pass and reports the ones that do not", () => {
    const decoded = decode("status=failed&status=melted");
    expect(decoded.slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["failed"] },
    ]);
    expect(decoded.issues).toEqual([
      {
        parameter: "status",
        code: "invalid",
        reason: '"melted" is not an option of "status"',
      },
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
    ).toEqual([
      { parameter: "load__gte", code: "invalid", reason: "not a number" },
    ]);
  });

  it("refuses each clause the source cannot execute, and only those", () => {
    const capabilities = declare({
      filter: { status: ["isAny"], cpu: ["gte"] },
      sort: declareSort(["cpu"], 1),
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
        { field: "status", operator: "isAny", operands: ["ready"] },
        { field: "cpu", operator: "gte", operands: [4] },
      ],
      search: null,
      sort: [{ field: "cpu", direction: "asc" }],
      group: [],
    });
    expect(decoded.issues).toEqual([
      {
        parameter: "cpu__lte",
        code: "undeclared-operator",
        reason: 'field "cpu" cannot be filtered with lte',
      },
      {
        parameter: "owner__isSet",
        code: "undeclared-field",
        reason: 'field "owner" cannot be filtered',
      },
      {
        parameter: "q",
        code: "undeclared-field",
        reason: "this source cannot search",
      },
      {
        parameter: "group",
        code: "too-many-levels",
        reason: "this source cannot group",
      },
    ]);
  });

  it("reports every refusal one clause earns", () => {
    const decoded = decodeQuery({
      schema: machines(),
      params: new URLSearchParams("sort=cpu__asc&sort=name__desc"),
      capabilities: declare({ sort: declareSort(["status"]) }),
    });
    expect(decoded.slice.sort).toEqual([]);
    expect(decoded.issues).toEqual([
      {
        parameter: "sort",
        code: "undeclared-field",
        reason: 'field "cpu" cannot be sorted',
      },
      {
        parameter: "sort",
        code: "undeclared-field",
        reason: 'field "name" cannot be sorted',
      },
    ]);
  });

  it("refuses an ordering longer than the source executes, whole", () => {
    const capabilities = declare({
      sort: declareSort(["cpu", "name"], 1),
    });
    const decoded = decodeQuery({
      schema: machines(),
      params: new URLSearchParams("sort=cpu__asc&sort=name__desc"),
      capabilities,
    });
    expect(decoded.slice.sort).toEqual([]);
    expect(decoded.issues).toEqual([
      {
        parameter: "sort",
        code: "too-many-terms",
        reason: "this source orders by at most 1 term",
      },
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
      capabilities: declare({ sort: declareSort(["cpu"]) }),
    });
    expect(decoded.slice.sort).toEqual([]);
    expect(decoded.issues).toEqual([
      {
        parameter: "sort",
        code: "undeclared-field",
        reason: 'field "name" cannot be sorted',
      },
    ]);
  });

  it("refuses a grouping whole rather than truncating it", () => {
    const decoded = decodeQuery({
      schema: machines(),
      params: new URLSearchParams("group=status&group=region"),
      capabilities: declare({
        group: {
          fields: ["status"],
          levels: 2,
          summaries: "counts",
          collapse: false,
        },
      }),
    });
    expect(decoded.slice.group).toEqual([]);
    expect(decoded.issues).toEqual([
      {
        parameter: "group",
        code: "undeclared-field",
        reason: 'field "region" cannot be grouped',
      },
    ]);
  });

  it("keeps a grouping the source declares it can nest", () => {
    const decoded = decodeQuery({
      schema: machines(),
      params: new URLSearchParams("group=status&group=owner"),
      capabilities: declare({
        group: {
          fields: ["status", "owner"],
          levels: 2,
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
          field: "name",
          operator: "contains" as const,
          operands: [" 50%_ a+b é"],
        },
        {
          field: "status",
          operator: "isAny" as const,
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
