import { describe, expect, it } from "vitest";
import { requestRest } from "../../../../testing/requestMockApi.js";
import serveMockApi from "../../../../testing/serveMockApi.js";
import createRestHandlers from "./createRestHandlers.js";

serveMockApi(createRestHandlers());

/** The identities of a page's items. */
const readIds = (body: unknown): readonly string[] =>
  (body as { readonly items: readonly { readonly id: string }[] }).items.map(
    (item) => item.id,
  );

describe("createRestHandlers", () => {
  it("answers the first page of every machine with exact counts", async () => {
    const { status, body } = await requestRest("live", "size=5");
    expect(status).toBe(200);
    expect(readIds(body)).toEqual(["m-01", "m-02", "m-03", "m-04", "m-05"]);
    expect(body).toMatchObject({ matched: 12, total: 12 });
  });

  it("filters, searches, orders and pages as the parameters say", async () => {
    const { body } = await requestRest(
      "live",
      "status=failed&status=pending&cores__gte=4&sort=cores__desc&size=2&page=2",
    );
    // Failed or pending with at least four cores, most cores first:
    // hazel 16, birch 8, larch 8, fir 4.
    expect(body).toMatchObject({ matched: 4, total: 12 });
    expect(readIds(body)).toEqual(["m-12", "m-06"]);
    const searched = await requestRest("live", "q=EX:IVY");
    expect(readIds(searched.body)).toEqual(["m-09"]);
  });

  it("looks for text in the text fields it declares", async () => {
    const { body } = await requestRest("live", "region__contains=EU-");
    expect(readIds(body)).toEqual(["m-01", "m-02", "m-07", "m-10"]);
  });

  it("requires every text and every predicate at once", async () => {
    const { body } = await requestRest(
      "live",
      "name__contains=er&region__contains=eu-&status=running",
    );
    // Running in an eu- region: alder and gum; only alder holds "er".
    expect(readIds(body)).toEqual(["m-01"]);
  });

  it("reads a blank parameter as a control left empty", async () => {
    const { body } = await requestRest("live", "name__contains=&status=");
    expect(body).toMatchObject({ matched: 12 });
    // Dropped value by value, as the grammar drops them.
    const running = await requestRest("live", "status=running&status=");
    expect(running.body).toMatchObject({ matched: 6 });
    const alder = await requestRest(
      "live",
      "name__contains=&name__contains=alder",
    );
    expect(alder.body).toMatchObject({ matched: 1 });
  });

  it("refuses what it cannot run rather than answering more", async () => {
    for (const [params, reason] of [
      ["owner__contains=ex", 'this endpoint does not accept "owner__contains"'],
      [
        "name__contains__x=web",
        'this endpoint does not accept "name__contains__x"',
      ],
      ["cores__gte__x=4", 'this endpoint does not accept "cores__gte__x"'],
      [
        "sort=name__asc&sort=cores__asc",
        "this endpoint orders by one term at a time",
      ],
      ["q=a&q=b", '"q" takes one value'],
      ["name__contains=a&name__contains=b", '"name__contains" takes one value'],
      ["sort=__asc", "a sort names no field"],
      ["sort=__", "a sort names no field"],
      ["sort=note", '"note" is not a field this endpoint orders by'],
      ["sort=note__up", '"note" is not a field this endpoint orders by'],
      ["sort=name", "a sort names no direction"],
      ["sort=note__asc", '"note" is not a field this endpoint orders by'],
      ["sort=name__up", '"up" is not a direction'],
      ["sort=name__asc__x", '"sort" takes one field and one direction'],
      ["status=deployed", '"deployed" is not a status'],
      ["cores__gte=many", '"many" is not a number of cores'],
      ["page=0", '"page" is not a positive whole number'],
    ] as const) {
      expect(await requestRest("live", params)).toEqual({
        status: 400,
        body: { reason },
      });
    }
  });

  it("fails every request of the scenario that is down", async () => {
    expect(await requestRest("down", "")).toEqual({
      status: 503,
      body: { reason: "the machine inventory is unavailable" },
    });
  });

  it("answers the first page and fails the rest when only it is available", async () => {
    expect((await requestRest("first-page-only", "size=5")).status).toBe(200);
    expect(await requestRest("first-page-only", "size=5&page=2")).toEqual({
      status: 503,
      body: { reason: "the machines past the first page are unavailable" },
    });
  });

  it("never answers the scenario that is unanswered", async () => {
    const abandoned = new AbortController();
    const request = requestRest("unanswered", "", abandoned.signal);
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
