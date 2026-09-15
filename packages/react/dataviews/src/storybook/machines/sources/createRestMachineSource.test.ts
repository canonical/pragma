import { HttpResponse, type HttpResponseResolver, http } from "msw";
import { describe, expect, it } from "vitest";
import readFailureReason from "../../../../testing/readFailureReason.js";
import serveMockApi from "../../../../testing/serveMockApi.js";
import createRestMachineSource from "./createRestMachineSource.js";

// Each test answers the one request its source sends its own way.
const server = serveMockApi([]);

/** Answer the live scenario's requests with one resolver. */
const answerWith = (resolver: HttpResponseResolver): void => {
  server.use(http.get("*/api/live/machines", resolver));
};

describe("createRestMachineSource", () => {
  it("names the status when a failed answer gives no reason", async () => {
    // Status 599 has no standard text, so it stays empty, as over HTTP/2.
    answerWith(() => HttpResponse.json({}, { status: 599, statusText: "" }));
    expect(await readFailureReason(createRestMachineSource("live"))).toBe(
      "the endpoint answered 599",
    );
  });

  it("names the status when a failed answer is not JSON", async () => {
    answerWith(
      () => new HttpResponse("<html>", { status: 599, statusText: "" }),
    );
    expect(await readFailureReason(createRestMachineSource("live"))).toBe(
      "the endpoint answered 599",
    );
  });

  it("gives a failed answer's status text when it gives no reason", async () => {
    answerWith(() => HttpResponse.json({}, { status: 503 }));
    expect(await readFailureReason(createRestMachineSource("live"))).toBe(
      "Service Unavailable",
    );
  });

  it("fails an answer that holds no machines rather than showing none", async () => {
    answerWith(() => HttpResponse.json({ matched: 1 }));
    expect(await readFailureReason(createRestMachineSource("live"))).toBe(
      "the endpoint answered without machines",
    );
  });

  it("fails an answer that is not JSON at all", async () => {
    answerWith(() => new HttpResponse("<html>", { status: 200 }));
    expect(await readFailureReason(createRestMachineSource("live"))).toBe(
      "the endpoint answered without a JSON object",
    );
  });

  it("fails JSON that is not an object, a list included", async () => {
    for (const body of ["oops", []]) {
      answerWith(() => HttpResponse.json(body));
      expect(await readFailureReason(createRestMachineSource("live"))).toBe(
        "the endpoint answered without a JSON object",
      );
    }
  });

  it("fails machines that are not a list", async () => {
    answerWith(() => HttpResponse.json({ items: {} }));
    expect(await readFailureReason(createRestMachineSource("live"))).toBe(
      "the endpoint answered without machines",
    );
  });
});
