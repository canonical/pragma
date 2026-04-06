import { describe, expect, it, vi } from "vitest";
import { createFetchHandler } from "./createFetchHandler.js";
import type { CloudflareEnv } from "./types.js";

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

function createMockEnv(objects: Record<string, string> = {}): CloudflareEnv {
  return {
    ASSETS: {
      get: vi.fn(async (key: string) => {
        if (key in objects) {
          return {
            body: new ReadableStream({
              start(controller) {
                controller.enqueue(
                  new TextEncoder().encode(objects[key]),
                );
                controller.close();
              },
            }),
          };
        }
        return null;
      }),
    } as unknown as R2Bucket,
  };
}

function createMockCtx(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;
}

// Mock the global caches API
const mockCacheMatch = vi.fn().mockResolvedValue(undefined);
const mockCachePut = vi.fn().mockResolvedValue(undefined);

vi.stubGlobal("caches", {
  default: {
    match: mockCacheMatch,
    put: mockCachePut,
  },
});

beforeEach(() => {
  mockCacheMatch.mockReset().mockResolvedValue(undefined);
  mockCachePut.mockReset().mockResolvedValue(undefined);
});

async function responseToText(response: Response): Promise<string> {
  return new Response(response.body).text();
}

describe("createFetchHandler", () => {
  describe("route matching", () => {
    it("matches catch-all route", async () => {
      const handler = createFetchHandler({
        routes: [
          { pattern: "/*", factory: mockRendererFactory("<html>Hi</html>") },
        ],
      });

      const response = await handler(
        new Request("http://localhost/any"),
        createMockEnv(),
        createMockCtx(),
      );
      expect(response.status).toBe(200);
      expect(await responseToText(response)).toBe("<html>Hi</html>");
    });

    it("matches exact route before catch-all", async () => {
      const handler = createFetchHandler({
        routes: [
          {
            pattern: "/sitemap.xml",
            factory: mockRendererFactory("<xml/>"),
            contentType: "application/xml; charset=utf-8",
          },
          { pattern: "/*", factory: mockRendererFactory("<html/>") },
        ],
      });

      const response = await handler(
        new Request("http://localhost/sitemap.xml"),
        createMockEnv(),
        createMockCtx(),
      );
      expect(response.headers.get("Content-Type")).toBe(
        "application/xml; charset=utf-8",
      );
    });

    it("returns 404 when no route matches", async () => {
      const handler = createFetchHandler({
        routes: [{ pattern: "/api/*", factory: mockRendererFactory("api") }],
      });

      const response = await handler(
        new Request("http://localhost/page"),
        createMockEnv(),
        createMockCtx(),
      );
      expect(response.status).toBe(404);
    });

    it("uses renderer statusCode", async () => {
      const handler = createFetchHandler({
        routes: [
          { pattern: "/*", factory: mockRendererFactory("error", 500) },
        ],
      });

      const response = await handler(
        new Request("http://localhost/"),
        createMockEnv(),
        createMockCtx(),
      );
      expect(response.status).toBe(500);
    });
  });

  describe("static assets from R2", () => {
    it("serves static assets with immutable cache headers", async () => {
      const env = createMockEnv({ "main.js": "console.log('hi')" });
      const handler = createFetchHandler({
        routes: [{ pattern: "/*", factory: mockRendererFactory("page") }],
        staticAssets: [{ urlPrefix: "/assets", directory: "assets" }],
      });

      const response = await handler(
        new Request("http://localhost/assets/main.js"),
        env,
        createMockCtx(),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(
        "application/javascript; charset=utf-8",
      );
      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=31536000, immutable",
      );
      expect(await responseToText(response)).toBe("console.log('hi')");
    });

    it("falls through when R2 object not found", async () => {
      const env = createMockEnv({});
      const handler = createFetchHandler({
        routes: [{ pattern: "/*", factory: mockRendererFactory("fallback") }],
        staticAssets: [{ urlPrefix: "/assets", directory: "assets" }],
      });

      const response = await handler(
        new Request("http://localhost/assets/missing.js"),
        env,
        createMockCtx(),
      );
      expect(await responseToText(response)).toBe("fallback");
    });

    it("skips empty keys (urlPrefix without trailing path)", async () => {
      const env = createMockEnv({});
      const handler = createFetchHandler({
        routes: [{ pattern: "/*", factory: mockRendererFactory("page") }],
        staticAssets: [{ urlPrefix: "/assets", directory: "assets" }],
      });

      const response = await handler(
        new Request("http://localhost/assets"),
        env,
        createMockCtx(),
      );
      expect(await responseToText(response)).toBe("page");
      expect(env.ASSETS.get).not.toHaveBeenCalled();
    });

    it("skips empty keys (urlPrefix with only slash)", async () => {
      const env = createMockEnv({});
      const handler = createFetchHandler({
        routes: [{ pattern: "/*", factory: mockRendererFactory("page") }],
        staticAssets: [{ urlPrefix: "/assets", directory: "assets" }],
      });

      const response = await handler(
        new Request("http://localhost/assets/"),
        env,
        createMockCtx(),
      );
      expect(await responseToText(response)).toBe("page");
      expect(env.ASSETS.get).not.toHaveBeenCalled();
    });

    it("does not match non-matching static prefix", async () => {
      const env = createMockEnv({ "file.js": "code" });
      const handler = createFetchHandler({
        routes: [{ pattern: "/*", factory: mockRendererFactory("page") }],
        staticAssets: [{ urlPrefix: "/assets", directory: "assets" }],
      });

      const response = await handler(
        new Request("http://localhost/other/file.js"),
        env,
        createMockCtx(),
      );
      expect(await responseToText(response)).toBe("page");
    });
  });

  describe("cache API", () => {
    it("returns cached response when available", async () => {
      const cachedResponse = new Response("cached", {
        headers: { "Content-Type": "text/html" },
      });
      mockCacheMatch.mockResolvedValueOnce(cachedResponse);

      const handler = createFetchHandler({
        routes: [{ pattern: "/*", factory: mockRendererFactory("fresh") }],
      });

      const response = await handler(
        new Request("http://localhost/"),
        createMockEnv(),
        createMockCtx(),
      );
      expect(await responseToText(response)).toBe("cached");
    });

    it("caches successful renders with cache config", async () => {
      const ctx = createMockCtx();
      const handler = createFetchHandler({
        routes: [
          {
            pattern: "/*",
            factory: mockRendererFactory("fresh"),
            cache: { sMaxAge: 60 },
          },
        ],
      });

      await handler(
        new Request("http://localhost/"),
        createMockEnv(),
        ctx,
      );
      expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
    });

    it("does not cache error responses", async () => {
      const ctx = createMockCtx();
      const handler = createFetchHandler({
        routes: [
          {
            pattern: "/*",
            factory: mockRendererFactory("error", 500),
            cache: { sMaxAge: 60 },
          },
        ],
      });

      await handler(
        new Request("http://localhost/"),
        createMockEnv(),
        ctx,
      );
      expect(ctx.waitUntil).not.toHaveBeenCalled();
    });

    it("does not cache when no cache config on route", async () => {
      const ctx = createMockCtx();
      const handler = createFetchHandler({
        routes: [
          { pattern: "/*", factory: mockRendererFactory("no-cache") },
        ],
      });

      await handler(
        new Request("http://localhost/"),
        createMockEnv(),
        ctx,
      );
      expect(ctx.waitUntil).not.toHaveBeenCalled();
    });

    it("skips cache when enableCache is false", async () => {
      const handler = createFetchHandler({
        routes: [
          {
            pattern: "/*",
            factory: mockRendererFactory("no-cache"),
            cache: { sMaxAge: 60 },
          },
        ],
        enableCache: false,
      });

      const ctx = createMockCtx();
      await handler(
        new Request("http://localhost/"),
        createMockEnv(),
        ctx,
      );
      expect(mockCacheMatch).not.toHaveBeenCalled();
      expect(ctx.waitUntil).not.toHaveBeenCalled();
    });
  });

  describe("cache headers", () => {
    it("sets Cache-Control from route cache config", async () => {
      const handler = createFetchHandler({
        routes: [
          {
            pattern: "/*",
            factory: mockRendererFactory("page"),
            cache: { maxAge: 0, sMaxAge: 60, staleWhileRevalidate: 300 },
          },
        ],
      });

      const response = await handler(
        new Request("http://localhost/"),
        createMockEnv(),
        createMockCtx(),
      );
      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      );
    });
  });
});

import { beforeEach } from "vitest";
