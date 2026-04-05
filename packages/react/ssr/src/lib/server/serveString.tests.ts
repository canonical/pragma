import { IncomingMessage, ServerResponse } from "node:http";
import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { serveString } from "./serveString.js";

function createMockReqRes() {
  const req = new IncomingMessage(null as never);
  req.url = "/";
  req.method = "GET";

  const passthrough = new PassThrough();
  const res = new ServerResponse(req);
  res.assignSocket(passthrough as never);

  return { req, res };
}

describe("serveString", () => {
  it("calls the factory with req, renders to string, and sends the body", () => {
    const mockRenderer = {
      statusCode: 200,
      renderToString: () => "<html>Hello</html>",
    };

    const middleware = serveString(() => mockRenderer);
    const { req, res } = createMockReqRes();

    middleware(req, res);

    expect(res.statusCode).toBe(200);
  });

  it("uses renderer.statusCode for the response", () => {
    const mockRenderer = {
      statusCode: 500,
      renderToString: () => "<h1>Error</h1>",
    };

    const middleware = serveString(() => mockRenderer);
    const { req, res } = createMockReqRes();

    middleware(req, res);

    expect(res.statusCode).toBe(500);
  });

  it("catches factory errors and returns 500", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const middleware = serveString(() => {
      throw new Error("factory error");
    });
    const { req, res } = createMockReqRes();

    middleware(req, res);

    expect(res.statusCode).toBe(500);
    consoleSpy.mockRestore();
  });
});
