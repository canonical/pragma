import { IncomingMessage, ServerResponse } from "node:http";
import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { createNodeHandler } from "./createNodeHandler.js";

function mockRendererFactory(body: string, statusCode = 200) {
  return (_req: Request) => ({
    renderToReadableStream: async () =>
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(body));
          controller.close();
        },
      }),
    statusCode,
    statusReady: Promise.resolve(),
  });
}

function createMockReqRes(url = "/", method = "GET") {
  const req = new IncomingMessage(null as never);
  req.url = url;
  req.method = method;
  req.headers = { host: "localhost" };

  const passthrough = new PassThrough();
  const res = new ServerResponse(req);
  res.assignSocket(passthrough as never);

  return { req, res };
}

describe("createNodeHandler", () => {
  it("matches route and writes HTML to response", async () => {
    const handler = createNodeHandler({
      routes: [
        { pattern: "/*", factory: mockRendererFactory("<html>Node</html>") },
      ],
    });

    const { req, res } = createMockReqRes("/");
    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });

  it("uses renderer statusCode", async () => {
    const handler = createNodeHandler({
      routes: [
        { pattern: "/*", factory: mockRendererFactory("error", 500) },
      ],
    });

    const { req, res } = createMockReqRes("/");
    await handler(req, res);
    expect(res.statusCode).toBe(500);
  });

  it("returns 404 when no route matches", async () => {
    const handler = createNodeHandler({
      routes: [{ pattern: "/api/*", factory: mockRendererFactory("api") }],
    });

    const { req, res } = createMockReqRes("/page");
    await handler(req, res);
    expect(res.statusCode).toBe(404);
  });

  it("sets custom content type", async () => {
    const handler = createNodeHandler({
      routes: [
        {
          pattern: "/*",
          factory: mockRendererFactory("xml"),
          contentType: "application/xml; charset=utf-8",
        },
      ],
    });

    const { req, res } = createMockReqRes("/");
    const writeHeadSpy = vi.spyOn(res, "writeHead");
    await handler(req, res);
    expect(writeHeadSpy).toHaveBeenCalledWith(200, {
      "Content-Type": "application/xml; charset=utf-8",
    });
  });

  it("sets Cache-Control from route cache config", async () => {
    const handler = createNodeHandler({
      routes: [
        {
          pattern: "/*",
          factory: mockRendererFactory("cached"),
          cache: { sMaxAge: 1, staleWhileRevalidate: 59 },
        },
      ],
    });

    const { req, res } = createMockReqRes("/");
    const writeHeadSpy = vi.spyOn(res, "writeHead");
    await handler(req, res);
    expect(writeHeadSpy).toHaveBeenCalledWith(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=1, stale-while-revalidate=59",
    });
  });

  it("handles missing url gracefully", async () => {
    const handler = createNodeHandler({
      routes: [
        { pattern: "/*", factory: mockRendererFactory("ok") },
      ],
    });

    const { req, res } = createMockReqRes("/");
    req.url = undefined;
    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });

  it("handles missing host header", async () => {
    const handler = createNodeHandler({
      routes: [
        { pattern: "/*", factory: mockRendererFactory("ok") },
      ],
    });

    const { req, res } = createMockReqRes("/");
    req.headers = {};
    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });

  it("handles array header values", async () => {
    let capturedRequest: Request | undefined;
    const factory = (req: Request) => {
      capturedRequest = req;
      return {
        renderToReadableStream: async () =>
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("ok"));
              controller.close();
            },
          }),
        statusCode: 200,
        statusReady: Promise.resolve(),
      };
    };

    const handler = createNodeHandler({
      routes: [{ pattern: "/*", factory }],
    });

    const { req, res } = createMockReqRes("/");
    req.headers = { host: "localhost", "set-cookie": ["a=1", "b=2"] as any };
    await handler(req, res);
    expect(capturedRequest?.headers.get("set-cookie")).toBe("a=1, b=2");
  });

  it("skips undefined header values", async () => {
    let capturedRequest: Request | undefined;
    const factory = (req: Request) => {
      capturedRequest = req;
      return {
        renderToReadableStream: async () =>
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("ok"));
              controller.close();
            },
          }),
        statusCode: 200,
        statusReady: Promise.resolve(),
      };
    };

    const handler = createNodeHandler({
      routes: [{ pattern: "/*", factory }],
    });

    const { req, res } = createMockReqRes("/");
    req.headers = { host: "localhost", "x-empty": undefined as any };
    await handler(req, res);
    expect(capturedRequest?.headers.has("x-empty")).toBe(false);
  });

  it("handles missing method gracefully", async () => {
    const handler = createNodeHandler({
      routes: [
        { pattern: "/*", factory: mockRendererFactory("ok") },
      ],
    });

    const { req, res } = createMockReqRes("/");
    req.method = undefined;
    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });
});
