import { describe, expect, it, vi } from "vitest";
import { createHandler } from "./createHandler.js";

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

async function responseToText(response: Response): Promise<string> {
  return new Response(response.body).text();
}

describe("createHandler", () => {
  describe("route matching", () => {
    it("matches catch-all route", async () => {
      const handler = createHandler({
        routes: [
          {
            pattern: "/*",
            factory: mockRendererFactory("<html>Hello</html>"),
          },
        ],
      });

      const response = await handler(new Request("http://localhost/any-path"));
      expect(response.status).toBe(200);
      expect(await responseToText(response)).toBe("<html>Hello</html>");
    });

    it("matches exact route before catch-all", async () => {
      const handler = createHandler({
        routes: [
          {
            pattern: "/sitemap.xml",
            factory: mockRendererFactory("<xml>sitemap</xml>"),
            contentType: "application/xml; charset=utf-8",
          },
          {
            pattern: "/*",
            factory: mockRendererFactory("<html>Page</html>"),
          },
        ],
      });

      const sitemapResponse = await handler(
        new Request("http://localhost/sitemap.xml"),
      );
      expect(sitemapResponse.headers.get("Content-Type")).toBe(
        "application/xml; charset=utf-8",
      );
      expect(await responseToText(sitemapResponse)).toBe("<xml>sitemap</xml>");

      const pageResponse = await handler(new Request("http://localhost/about"));
      expect(pageResponse.headers.get("Content-Type")).toBe(
        "text/html; charset=utf-8",
      );
    });

    it("returns 404 when no route matches", async () => {
      const handler = createHandler({
        routes: [
          {
            pattern: "/api/*",
            factory: mockRendererFactory("api"),
          },
        ],
      });

      const response = await handler(new Request("http://localhost/page"));
      expect(response.status).toBe(404);
    });

    it("uses renderer statusCode", async () => {
      const handler = createHandler({
        routes: [
          {
            pattern: "/*",
            factory: mockRendererFactory("<h1>Error</h1>", 500),
          },
        ],
      });

      const response = await handler(new Request("http://localhost/"));
      expect(response.status).toBe(500);
    });
  });

  describe("content type", () => {
    it("defaults to text/html", async () => {
      const handler = createHandler({
        routes: [{ pattern: "/*", factory: mockRendererFactory("html") }],
      });

      const response = await handler(new Request("http://localhost/"));
      expect(response.headers.get("Content-Type")).toBe(
        "text/html; charset=utf-8",
      );
    });

    it("uses custom contentType from route", async () => {
      const handler = createHandler({
        routes: [
          {
            pattern: "/*",
            factory: mockRendererFactory("text"),
            contentType: "text/plain; charset=utf-8",
          },
        ],
      });

      const response = await handler(new Request("http://localhost/"));
      expect(response.headers.get("Content-Type")).toBe(
        "text/plain; charset=utf-8",
      );
    });
  });

  describe("cache headers", () => {
    it("sets Cache-Control when cache config is provided", async () => {
      const handler = createHandler({
        routes: [
          {
            pattern: "/*",
            factory: mockRendererFactory("cached"),
            cache: { sMaxAge: 60, staleWhileRevalidate: 300 },
          },
        ],
      });

      const response = await handler(new Request("http://localhost/"));
      expect(response.headers.get("Cache-Control")).toBe(
        "public, s-maxage=60, stale-while-revalidate=300",
      );
    });

    it("does not set Cache-Control when no cache config", async () => {
      const handler = createHandler({
        routes: [{ pattern: "/*", factory: mockRendererFactory("no-cache") }],
      });

      const response = await handler(new Request("http://localhost/"));
      expect(response.headers.get("Cache-Control")).toBeNull();
    });
  });

  describe("static assets", () => {
    it("serves static files with immutable cache headers", async () => {
      const handler = createHandler({
        routes: [{ pattern: "/*", factory: mockRendererFactory("page") }],
        staticAssets: [{ urlPrefix: "/static", directory: "." }],
      });

      const response = await handler(
        new Request("http://localhost/static/package.json"),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(
        "application/json; charset=utf-8",
      );
      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=31536000, immutable",
      );
    });

    it("falls through when file not found", async () => {
      const handler = createHandler({
        routes: [{ pattern: "/*", factory: mockRendererFactory("page") }],
        staticAssets: [{ urlPrefix: "/assets", directory: "nonexistent" }],
      });

      const response = await handler(
        new Request("http://localhost/assets/missing.js"),
      );
      expect(await responseToText(response)).toBe("page");
    });

    it("falls through to routes when no static match", async () => {
      const handler = createHandler({
        routes: [{ pattern: "/*", factory: mockRendererFactory("dynamic") }],
        staticAssets: [
          { urlPrefix: "/assets", directory: "dist/client/assets" },
        ],
      });

      const response = await handler(new Request("http://localhost/about"));
      expect(await responseToText(response)).toBe("dynamic");
    });
  });

  describe("signal forwarding", () => {
    it("passes request signal to renderer", async () => {
      let receivedSignal: AbortSignal | undefined;
      const factory = (req: Request) => ({
        renderToReadableStream: async (signal?: AbortSignal) => {
          receivedSignal = signal;
          return new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("ok"));
              controller.close();
            },
          });
        },
        statusCode: 200,
        statusReady: Promise.resolve(),
      });

      const handler = createHandler({
        routes: [{ pattern: "/*", factory }],
      });

      const controller = new AbortController();
      await handler(
        new Request("http://localhost/", {
          signal: controller.signal,
        }),
      );
      expect(receivedSignal).toBeDefined();
    });
  });
});
