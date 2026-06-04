import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it } from "vitest";
import {
  type ViteMiddlewareServer,
  viteFetchMiddleware,
} from "./viteFetchMiddleware.js";

/**
 * Build a fake Vite middleware that mimics how `vite.middlewares` behaves:
 * either it writes a response (handled) or calls `next()` (passes through).
 */
function fakeVite(
  handler: (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void,
  ) => void,
): ViteMiddlewareServer {
  return { middlewares: handler };
}

describe("viteFetchMiddleware", () => {
  it("returns a Response when the middleware handles the request", async () => {
    const handle = viteFetchMiddleware(
      fakeVite((_req, res) => {
        res.statusCode = 200;
        res.setHeader("content-type", "text/javascript");
        res.end('import "x";');
      }),
    );

    const response = await handle(new Request("http://localhost/@vite/client"));

    expect(response).not.toBeNull();
    expect(response?.status).toBe(200);
    expect(response?.headers.get("content-type")).toBe("text/javascript");
    expect(await response?.text()).toBe('import "x";');
  });

  it("returns null when the middleware calls next() (a page route)", async () => {
    const handle = viteFetchMiddleware(fakeVite((_req, _res, next) => next()));

    const response = await handle(new Request("http://localhost/some/page"));

    expect(response).toBeNull();
  });

  it("concatenates multiple write() chunks into the body", async () => {
    const handle = viteFetchMiddleware(
      fakeVite((_req, res) => {
        res.write("hello ");
        res.write("world");
        res.end();
      }),
    );

    const response = await handle(new Request("http://localhost/asset.js"));

    expect(await response?.text()).toBe("hello world");
  });

  it("propagates a non-200 status code", async () => {
    const handle = viteFetchMiddleware(
      fakeVite((_req, res) => {
        res.statusCode = 404;
        res.end("not found");
      }),
    );

    const response = await handle(new Request("http://localhost/missing.js"));

    expect(response?.status).toBe(404);
    expect(await response?.text()).toBe("not found");
  });

  it("transfers request headers (lower-cased) to the Node request", async () => {
    const seen: Record<string, string | string[] | undefined> = {};
    const handle = viteFetchMiddleware(
      fakeVite((req, res) => {
        Object.assign(seen, req.headers);
        res.end("ok");
      }),
    );

    await handle(
      new Request("http://localhost/asset.js", {
        headers: { "Sec-Fetch-Mode": "cors", Accept: "*/*" },
      }),
    );

    expect(seen["sec-fetch-mode"]).toBe("cors");
    expect(seen.accept).toBe("*/*");
  });

  it("defaults the host header from the request URL when absent", async () => {
    let host: string | undefined;
    const handle = viteFetchMiddleware(
      fakeVite((req, res) => {
        host = req.headers.host;
        res.end("ok");
      }),
    );

    await handle(new Request("http://example.test/asset.js"));

    expect(host).toBe("example.test");
  });

  it("passes the request method and url path+query through", async () => {
    let method: string | undefined;
    let url: string | undefined;
    const handle = viteFetchMiddleware(
      fakeVite((req, res) => {
        method = req.method;
        url = req.url;
        res.end("ok");
      }),
    );

    await handle(new Request("http://localhost/a/b?x=1", { method: "POST" }));

    expect(method).toBe("POST");
    expect(url).toBe("/a/b?x=1");
  });

  it("rejects when the middleware emits a response error", async () => {
    const handle = viteFetchMiddleware(
      fakeVite((_req, res) => {
        res.emit("error", new Error("boom"));
      }),
    );

    await expect(handle(new Request("http://localhost/x.js"))).rejects.toThrow(
      "boom",
    );
  });

  it("returns a Response with an empty body when nothing is written", async () => {
    const handle = viteFetchMiddleware(
      fakeVite((_req, res) => {
        res.statusCode = 204;
        res.end();
      }),
    );

    const response = await handle(new Request("http://localhost/empty"));

    expect(response?.status).toBe(204);
    expect(await response?.text()).toBe("");
  });
});
