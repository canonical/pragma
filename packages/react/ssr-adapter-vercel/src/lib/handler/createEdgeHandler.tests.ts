import { describe, expect, it } from "vitest";
import { createEdgeHandler } from "./createEdgeHandler.js";

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

describe("createEdgeHandler", () => {
  it("matches catch-all route and returns HTML", async () => {
    const handler = createEdgeHandler({
      routes: [
        { pattern: "/*", factory: mockRendererFactory("<html>Edge</html>") },
      ],
    });

    const response = await handler(new Request("http://localhost/"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/html; charset=utf-8",
    );
    expect(await responseToText(response)).toBe("<html>Edge</html>");
  });

  it("matches exact route with custom content type", async () => {
    const handler = createEdgeHandler({
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
    );
    expect(response.headers.get("Content-Type")).toBe(
      "application/xml; charset=utf-8",
    );
  });

  it("returns 404 when no route matches", async () => {
    const handler = createEdgeHandler({
      routes: [{ pattern: "/api/*", factory: mockRendererFactory("api") }],
    });

    const response = await handler(new Request("http://localhost/page"));
    expect(response.status).toBe(404);
  });

  it("uses renderer statusCode", async () => {
    const handler = createEdgeHandler({
      routes: [
        { pattern: "/*", factory: mockRendererFactory("error", 500) },
      ],
    });

    const response = await handler(new Request("http://localhost/"));
    expect(response.status).toBe(500);
  });

  it("sets Cache-Control from route cache config", async () => {
    const handler = createEdgeHandler({
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
    const handler = createEdgeHandler({
      routes: [
        { pattern: "/*", factory: mockRendererFactory("no-cache") },
      ],
    });

    const response = await handler(new Request("http://localhost/"));
    expect(response.headers.get("Cache-Control")).toBeNull();
  });
});
