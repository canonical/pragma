import {
  DEFAULT_WINDOW,
  EMPTY_SLICE,
  type SourceDelivery,
} from "@canonical/dataviews-core";
import { HttpResponse, type HttpResponseResolver, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { DELIVERY_WAIT } from "../../../../testing/constants.js";
import readFailureReason from "../../../../testing/readFailureReason.js";
import serveMockApi from "../../../../testing/serveMockApi.js";
import { type Machine, machines } from "../fixtures.js";
import createGraphQLMachineSource from "./createGraphQLMachineSource.js";

// Each test answers the one request its source sends its own way.
const server = serveMockApi([]);

/** Answer the live scenario's requests with one resolver. */
const answerWith = (resolver: HttpResponseResolver): void => {
  server.use(http.post("*/graphql/live", resolver));
};

describe("createGraphQLMachineSource", () => {
  it("publishes a partial answer's data rather than failing it", async () => {
    const [machine] = machines;
    if (machine === undefined) {
      throw new Error("the story fixtures hold a machine");
    }
    const { id, name, status, cores, region, owner } = machine;
    answerWith(() =>
      HttpResponse.json({
        data: {
          machines: {
            totalCount: null,
            pageInfo: { endCursor: null, hasNextPage: false },
            edges: [
              {
                cursor: btoa("0"),
                node: { id, name, status, cores, region, owner },
              },
            ],
          },
        },
        errors: [{ message: "the owners are unavailable", path: ["machines"] }],
      }),
    );
    const deliveries: SourceDelivery<Machine>[] = [];
    const stop = createGraphQLMachineSource("live").execute(
      { requestId: "partial", slice: EMPTY_SLICE, window: DEFAULT_WINDOW },
      (delivery) => {
        deliveries.push(delivery);
      },
    );
    const rows = await vi
      .waitFor(() => {
        const last = deliveries.at(-1);
        if (last?.status !== "succeeded") {
          throw new Error("the page has not been delivered yet");
        }
        return last.page.rows;
      }, DELIVERY_WAIT)
      .finally(stop);
    expect(rows.map((row) => row.id)).toEqual([id]);
  });

  it("asks the endpoint for every clause of the query, by name", async () => {
    const bodies: unknown[] = [];
    answerWith(async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({
        data: {
          machines: {
            totalCount: null,
            pageInfo: { endCursor: null, hasNextPage: false },
            edges: [],
          },
        },
      });
    });
    const stop = createGraphQLMachineSource("live").execute(
      {
        requestId: "every-clause",
        slice: {
          ...EMPTY_SLICE,
          filter: [
            { field: "status", operator: "eq", operands: ["failed"] },
            { field: "cores", operator: "gte", operands: [4] },
            { field: "cores", operator: "lte", operands: [16] },
            { field: "name", operator: "contains", operands: ["web"] },
            { field: "region", operator: "contains", operands: ["eu-"] },
            { field: "owner", operator: "contains", operands: ["ex:"] },
          ],
          search: "ivy",
          sort: [{ field: "cores", direction: "desc" }],
        },
        window: DEFAULT_WINDOW,
      },
      () => {},
    );
    await vi
      .waitFor(() => expect(bodies).toHaveLength(1), DELIVERY_WAIT)
      .finally(stop);
    expect(bodies.at(0)).toMatchObject({
      operationName: "MachinesQuery",
      variables: {
        after: null,
        where: {
          status: ["failed"],
          coresGte: 4,
          coresLte: 16,
          nameContains: "web",
          regionContains: "eu-",
          ownerContains: "ex:",
          search: "ivy",
        },
        orderBy: [{ field: "cores", direction: "DESC" }],
      },
    });
  });

  it("names the status when a failed answer gives no error", async () => {
    // Status 599 has no standard text, so it stays empty, as over HTTP/2.
    answerWith(() => HttpResponse.json({}, { status: 599, statusText: "" }));
    expect(await readFailureReason(createGraphQLMachineSource("live"))).toBe(
      "the endpoint answered 599",
    );
  });

  it("names the status when a failed answer is not JSON", async () => {
    answerWith(
      () => new HttpResponse("<html>", { status: 599, statusText: "" }),
    );
    expect(await readFailureReason(createGraphQLMachineSource("live"))).toBe(
      "the endpoint answered 599",
    );
  });

  it("gives a failed answer's status text when it gives no error", async () => {
    answerWith(() => HttpResponse.json({}, { status: 503 }));
    expect(await readFailureReason(createGraphQLMachineSource("live"))).toBe(
      "Service Unavailable",
    );
  });

  it("fails an error with no message in a sentence of its own", async () => {
    answerWith(() => HttpResponse.json({ errors: [null] }));
    expect(await readFailureReason(createGraphQLMachineSource("live"))).toBe(
      "the endpoint answered with an error it did not describe",
    );
  });

  it("fails a connection answered as null in the endpoint's own words", async () => {
    answerWith(() =>
      HttpResponse.json({
        data: { machines: null },
        errors: [{ message: "the inventory resolver failed" }],
      }),
    );
    expect(await readFailureReason(createGraphQLMachineSource("live"))).toBe(
      "the inventory resolver failed",
    );
  });

  it("fails data that holds nothing in a sentence of its own", async () => {
    answerWith(() => HttpResponse.json({ data: {} }));
    expect(await readFailureReason(createGraphQLMachineSource("live"))).toBe(
      "the endpoint answered without data",
    );
  });

  it("fails an answer with no data in a sentence of its own", async () => {
    answerWith(() => HttpResponse.json({ data: null }));
    expect(await readFailureReason(createGraphQLMachineSource("live"))).toBe(
      "the endpoint answered without data",
    );
  });

  it("fails an answer that is not JSON at all", async () => {
    answerWith(() => new HttpResponse("<html>", { status: 200 }));
    expect(await readFailureReason(createGraphQLMachineSource("live"))).toBe(
      "the endpoint answered without a JSON object",
    );
  });

  it("fails JSON that is not an object, a list included", async () => {
    for (const body of ["oops", []]) {
      answerWith(() => HttpResponse.json(body));
      expect(await readFailureReason(createGraphQLMachineSource("live"))).toBe(
        "the endpoint answered without a JSON object",
      );
    }
  });
});
