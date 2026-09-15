import { describe, expect, it } from "vitest";
import { requestGraphQL } from "../../../../testing/requestMockApi.js";
import serveMockApi from "../../../../testing/serveMockApi.js";
import createGraphQLHandlers from "./createGraphQLHandlers.js";
import type { MachinesData } from "./types.js";

serveMockApi(createGraphQLHandlers());

/** The connection an answer carries. */
const readConnection = (body: unknown): MachinesData["machines"] =>
  (body as { readonly data: MachinesData }).data.machines;

/** The identities of a connection's nodes. */
const readIds = (body: unknown): readonly string[] =>
  readConnection(body).edges.map((edge) => edge.node.id);

describe("createGraphQLHandlers", () => {
  it("answers a forward page with no total and a cursor to the next", async () => {
    const { body } = await requestGraphQL("live", { first: 5 });
    const connection = readConnection(body);
    expect(readIds(body)).toEqual(["m-01", "m-02", "m-03", "m-04", "m-05"]);
    expect(connection.totalCount).toBeNull();
    expect(connection.pageInfo.hasNextPage).toBe(true);
    const next = await requestGraphQL("live", {
      first: 5,
      after: connection.pageInfo.endCursor,
    });
    expect(readIds(next.body)).toEqual([
      "m-06",
      "m-07",
      "m-08",
      "m-09",
      "m-10",
    ]);
    const last = await requestGraphQL("live", {
      first: 5,
      after: readConnection(next.body).pageInfo.endCursor,
    });
    expect(readIds(last.body)).toEqual(["m-11", "m-12"]);
    expect(readConnection(last.body).pageInfo.hasNextPage).toBe(false);
  });

  it("filters, searches and orders through its input", async () => {
    const { body } = await requestGraphQL("live", {
      first: 10,
      where: { status: ["running"], ownerContains: "EX:", coresLte: 8 },
      orderBy: [{ field: "cores", direction: "DESC" }],
    });
    expect(readIds(body)).toEqual(["m-07", "m-01", "m-11"]);
    const searched = await requestGraphQL("live", {
      first: 10,
      where: { search: "EX:IVY" },
    });
    expect(readIds(searched.body)).toEqual(["m-09"]);
    const bounded = await requestGraphQL("live", {
      first: 20,
      where: { coresGte: 16 },
    });
    const { edges } = readConnection(bounded.body);
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.length).toBeLessThan(12);
    for (const { node } of edges) {
      expect(node["cores"]).toBeGreaterThanOrEqual(16);
    }
  });

  it("answers an empty page with no cursor", async () => {
    const { body } = await requestGraphQL("live", {
      first: 5,
      where: { nameContains: "no such host" },
    });
    expect(readConnection(body).edges).toEqual([]);
    expect(readConnection(body).pageInfo).toEqual({
      endCursor: null,
      hasNextPage: false,
    });
  });

  it("reads one status as a list of it, as GraphQL coerces a list input", async () => {
    const listed = await requestGraphQL("live", {
      first: 20,
      where: { status: ["failed"] },
    });
    const single = await requestGraphQL("live", {
      first: 20,
      where: { status: "failed" },
    });
    expect(readIds(listed.body).length).toBeGreaterThan(0);
    expect(readIds(single.body)).toEqual(readIds(listed.body));
  });

  it("reads one ordering as a list of it, as GraphQL coerces a list input", async () => {
    const listed = await requestGraphQL("live", {
      first: 12,
      orderBy: [{ field: "cores", direction: "DESC" }],
    });
    const single = await requestGraphQL("live", {
      first: 12,
      orderBy: { field: "cores", direction: "DESC" },
    });
    expect(readIds(listed.body)).toHaveLength(12);
    expect(readIds(single.body)).toEqual(readIds(listed.body));
  });

  it("reads what is absent, null or blank as not given", async () => {
    const first = readIds(
      (await requestGraphQL("live", { first: 5, after: null })).body,
    );
    expect(first).toHaveLength(5);
    for (const variables of [
      { first: 5 },
      { first: 5, where: null },
      { first: 5, orderBy: null },
      {
        first: 5,
        where: {
          status: null,
          coresGte: null,
          coresLte: null,
          nameContains: null,
          regionContains: null,
          ownerContains: null,
          search: null,
        },
      },
      { first: 5, where: { nameContains: "", search: "" } },
    ]) {
      expect(readIds((await requestGraphQL("live", variables)).body)).toEqual(
        first,
      );
    }
  });

  it("reads the statuses a machine is none of", async () => {
    const { body } = await requestGraphQL("live", {
      first: 12,
      where: { statusIsNone: ["running", "pending"] },
    });
    expect(readIds(body)).toEqual(["m-02", "m-06", "m-10"]);
    const single = await requestGraphQL("live", {
      first: 12,
      where: { statusIsNone: "running" },
    });
    expect(readIds(single.body)).toHaveLength(6);
    const unknown = await requestGraphQL("live", {
      first: 12,
      where: { statusIsNone: ["deployed"] },
    });
    expect(unknown.body).toEqual({
      errors: [{ message: '"deployed" is not a status' }],
    });
  });

  it("looks for text a value starts with in each member it declares", async () => {
    const { body } = await requestGraphQL("live", {
      first: 12,
      where: { nameStartsWith: "B" },
    });
    expect(readIds(body)).toEqual(["m-02"]);
    const owner = await requestGraphQL("live", {
      first: 12,
      where: { ownerStartsWith: "EX:I" },
    });
    expect(readIds(owner.body)).toEqual(["m-09"]);
    const undeclared = await requestGraphQL("live", {
      first: 12,
      where: { regionStartsWith: "eu" },
    });
    expect(undeclared.body).toEqual({
      errors: [
        { message: 'this endpoint does not accept "where.regionStartsWith"' },
      ],
    });
  });

  it("looks for text in each text member it declares", async () => {
    const { body } = await requestGraphQL("live", {
      first: 12,
      where: { regionContains: "EU-" },
    });
    expect(readIds(body)).toEqual(["m-01", "m-02", "m-07", "m-10"]);
  });

  it("requires every text and every predicate at once", async () => {
    const { body } = await requestGraphQL("live", {
      first: 12,
      where: { nameContains: "er", regionContains: "eu-", status: ["running"] },
    });
    expect(readIds(body)).toEqual(["m-01"]);
  });

  it("refuses what it cannot run rather than answering more", async () => {
    for (const [variables, message] of [
      [{ first: 0 }, '"first" is not a positive whole number'],
      [{ first: 5, bogus: 1 }, 'this endpoint does not accept "bogus"'],
      [
        { first: 5, after: "not a cursor" },
        "the cursor is not one this endpoint handed back",
      ],
      [
        { first: 5, after: "" },
        "the cursor is not one this endpoint handed back",
      ],
      [
        { first: 5, after: btoa("1.0") },
        "the cursor is not one this endpoint handed back",
      ],
      [
        { first: 5, after: btoa(" ") },
        "the cursor is not one this endpoint handed back",
      ],
      [
        { first: 5, after: 5 },
        "the cursor is not one this endpoint handed back",
      ],
      [{ first: 5, where: "running" }, '"running" is not a filter input'],
      [{ first: 5, where: [] }, "[] is not a filter input"],
      [
        { first: 5, where: { bogus: "x" } },
        'this endpoint does not accept "where.bogus"',
      ],
      [
        { first: 5, where: { status: ["deployed"] } },
        '"deployed" is not a status',
      ],
      [{ first: 5, where: { status: [null] } }, "null is not a status"],
      [
        { first: 5, where: { coresGte: "four" } },
        '"four" is not a number of cores',
      ],
      [
        { first: 5, where: { coresLte: "four" } },
        '"four" is not a number of cores',
      ],
      [{ first: 5, where: { nameContains: 5 } }, "5 is not text"],
      [{ first: 5, where: { search: 5 } }, "5 is not text"],
      [
        {
          first: 5,
          orderBy: [
            { field: "name", direction: "ASC" },
            { field: "cores", direction: "ASC" },
          ],
        },
        "this endpoint orders by one term at a time",
      ],
      [{ first: 5, orderBy: [null] }, "null is not an ordering"],
      [{ first: 5, orderBy: {} }, "an ordering names no field"],
      [
        { first: 5, orderBy: [{ direction: "ASC" }] },
        "an ordering names no field",
      ],
      [
        { first: 5, orderBy: [{ field: null, direction: "ASC" }] },
        "an ordering names no field",
      ],
      [
        { first: 5, orderBy: [{ field: "name", direction: null }] },
        "an ordering names no direction",
      ],
      [
        { first: 5, orderBy: [{ field: "note" }] },
        '"note" is not a field this endpoint orders by',
      ],
      [
        { first: 5, orderBy: [{ field: "name" }] },
        "an ordering names no direction",
      ],
      [
        { first: 5, orderBy: [{ field: "name", direction: "UP" }] },
        '"UP" is not a direction',
      ],
    ] as const) {
      const answer = await requestGraphQL("live", variables);
      expect(answer.body).toEqual({ errors: [{ message }] });
    }
  });

  it("fails every request of the scenario that is down", async () => {
    expect((await requestGraphQL("down", { first: 5 })).body).toEqual({
      errors: [{ message: "the machine inventory is unavailable" }],
    });
  });

  it("answers the first page and fails the rest when only it is available", async () => {
    const first = await requestGraphQL("first-page-only", { first: 5 });
    expect(readIds(first.body)).toHaveLength(5);
    expect(
      (
        await requestGraphQL("first-page-only", {
          first: 5,
          after: readConnection(first.body).pageInfo.endCursor,
        })
      ).body,
    ).toEqual({
      errors: [{ message: "the machines past the first page are unavailable" }],
    });
  });

  it("never answers the scenario that is unanswered", async () => {
    const abandoned = new AbortController();
    const request = requestGraphQL(
      "unanswered",
      { first: 5 },
      abandoned.signal,
    );
    const outcome = await Promise.race([
      request.then(() => "answered"),
      new Promise((resolve) => {
        setTimeout(resolve, 50, "waiting");
      }),
    ]);
    expect(outcome).toBe("waiting");
    abandoned.abort();
    await expect(request).rejects.toThrow();
  });
});
