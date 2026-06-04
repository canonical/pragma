import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
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

    await handle(new Request("http://localhost/a/b?x=1"));

    expect(method).toBe("GET");
    expect(url).toBe("/a/b?x=1");
  });

  it("bridges HEAD requests", async () => {
    const handle = viteFetchMiddleware(
      fakeVite((_req, res) => {
        res.statusCode = 200;
        res.end();
      }),
    );

    const response = await handle(
      new Request("http://localhost/asset.js", { method: "HEAD" }),
    );

    expect(response?.status).toBe(200);
  });

  it("returns null (passes through) for non-GET/HEAD requests without invoking Vite", async () => {
    const middlewares = vi.fn();
    const handle = viteFetchMiddleware({ middlewares });

    const post = await handle(
      new Request("http://localhost/api", { method: "POST", body: "x" }),
    );
    const del = await handle(
      new Request("http://localhost/api", { method: "DELETE" }),
    );

    expect(post).toBeNull();
    expect(del).toBeNull();
    expect(middlewares).not.toHaveBeenCalled();
  });

  it("keeps the request's own Host header instead of deriving it from the URL", async () => {
    let host: string | undefined;
    const handle = viteFetchMiddleware(
      fakeVite((req, res) => {
        host = req.headers.host;
        res.end("ok");
      }),
    );

    await handle(
      new Request("http://localhost/asset.js", {
        headers: { Host: "explicit.example:1234" },
      }),
    );

    expect(host).toBe("explicit.example:1234");
  });

  it("emits separate Set-Cookie headers for an array value", async () => {
    const handle = viteFetchMiddleware(
      fakeVite((_req, res) => {
        res.setHeader("set-cookie", ["a=1", "b=2"]);
        res.end("ok");
      }),
    );

    const response = await handle(new Request("http://localhost/asset.js"));

    expect(response?.headers.getSetCookie()).toEqual(["a=1", "b=2"]);
  });

  it("preserves headers set via writeHead", async () => {
    const handle = viteFetchMiddleware(
      fakeVite((_req, res) => {
        res.writeHead(200, {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "no-cache",
        });
        res.end("<svg/>");
      }),
    );

    const response = await handle(new Request("http://localhost/logo.svg"));

    expect(response?.status).toBe(200);
    expect(response?.headers.get("content-type")).toBe("image/svg+xml");
    expect(response?.headers.get("cache-control")).toBe("no-cache");
  });

  it("merges writeHead headers with setHeader headers", async () => {
    const handle = viteFetchMiddleware(
      fakeVite((_req, res) => {
        res.setHeader("x-pre", "1");
        res.writeHead(200, { "Content-Type": "text/javascript" });
        res.end("x");
      }),
    );

    const response = await handle(new Request("http://localhost/asset.js"));

    expect(response?.headers.get("x-pre")).toBe("1");
    expect(response?.headers.get("content-type")).toBe("text/javascript");
  });

  it("supports the writeHead(status, statusMessage, headers) overload", async () => {
    const handle = viteFetchMiddleware(
      fakeVite((_req, res) => {
        res.writeHead(200, "OK", { "Content-Type": "text/css" });
        res.end(".x{}");
      }),
    );

    const response = await handle(new Request("http://localhost/style.css"));

    expect(response?.headers.get("content-type")).toBe("text/css");
  });

  it("skips response headers whose value is null/undefined", async () => {
    const handle = viteFetchMiddleware(
      fakeVite((_req, res) => {
        res.getHeaders = () => ({ "x-real": "yes", "x-empty": undefined });
        res.end("ok");
      }),
    );

    const response = await handle(new Request("http://localhost/asset.js"));

    expect(response?.headers.get("x-real")).toBe("yes");
    expect(response?.headers.has("x-empty")).toBe(false);
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
