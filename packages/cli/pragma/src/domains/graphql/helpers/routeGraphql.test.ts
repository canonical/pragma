import { describe, expect, it, vi } from "vitest";
import routeGraphql from "./routeGraphql.js";

describe("routeGraphql", () => {
  it("delegates /graphql to the handler", async () => {
    const handler = vi.fn(() => new Response("handled"));
    const request = new Request("http://localhost:4000/graphql");

    const response = await routeGraphql(request, handler, 4000);

    expect(handler).toHaveBeenCalledWith(request);
    expect(await response.text()).toBe("handled");
  });

  it("redirects / to /graphql", async () => {
    const handler = vi.fn();

    const response = await routeGraphql(
      new Request("http://localhost:4000/"),
      handler,
      4000,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "http://localhost:4000/graphql",
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it("404s any other path", async () => {
    const handler = vi.fn();

    const response = await routeGraphql(
      new Request("http://localhost:4000/favicon.ico"),
      handler,
      4000,
    );

    expect(response.status).toBe(404);
    expect(handler).not.toHaveBeenCalled();
  });
});
