import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import SitemapRenderer from "./SitemapRenderer.js";
import type { SitemapConfig, SitemapGetter } from "./types.js";

const BASE_CONFIG: SitemapConfig = {
  baseUrl: "https://example.com",
};

async function streamToString(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let done = false;
  while (!done) {
    const result = await reader.read();
    done = result.done;
    if (result.value) chunks.push(result.value);
  }
  return new TextDecoder().decode(
    new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0)).buffer ===
      chunks[0]?.buffer
      ? chunks[0]
      : Buffer.concat(chunks),
  );
}

describe("SitemapRenderer", () => {
  describe("statusCode and statusReady", () => {
    it("starts with statusCode 200", () => {
      const renderer = new SitemapRenderer([], BASE_CONFIG);
      expect(renderer.statusCode).toBe(200);
    });

    it("starts with a resolved statusReady", async () => {
      const renderer = new SitemapRenderer([], BASE_CONFIG);
      await expect(renderer.statusReady).resolves.toBeUndefined();
    });
  });

  describe("loadItems", () => {
    it("loads items from multiple async getters and flattens results", async () => {
      const getter1: SitemapGetter = async () => [
        { loc: "/page1", lastmod: "2024-01-01" },
      ];
      const getter2: SitemapGetter = async () => [
        { loc: "/page2", lastmod: "2024-02-01" },
        { loc: "/page3", lastmod: "2024-03-01" },
      ];
      const renderer = new SitemapRenderer([getter1, getter2], BASE_CONFIG);
      const items = await (renderer as any).loadItems();
      expect(items).toHaveLength(3);
    });

    it("handles empty getters array", async () => {
      const renderer = new SitemapRenderer([], BASE_CONFIG);
      const items = await (renderer as any).loadItems();
      expect(items).toHaveLength(0);
    });
  });

  describe("formatItems", () => {
    it("resolves relative URLs against baseUrl", () => {
      const renderer = new SitemapRenderer([], BASE_CONFIG);
      const items = (renderer as any).formatItems([{ loc: "/about" }]);
      expect(items[0].loc).toBe("https://example.com/about");
    });

    it("uses baseUrl when loc is empty", () => {
      const renderer = new SitemapRenderer([], BASE_CONFIG);
      const items = (renderer as any).formatItems([{ loc: "" }]);
      expect(items[0].loc).toBe("https://example.com");
    });

    it("formats Date objects to YYYY-MM-DD", () => {
      const renderer = new SitemapRenderer([], BASE_CONFIG);
      const items = (renderer as any).formatItems([
        { loc: "/page", lastmod: new Date("2024-06-15T12:00:00Z") },
      ]);
      expect(items[0].lastmod).toBe("2024-06-15");
    });

    it("formats ISO string dates to YYYY-MM-DD", () => {
      const renderer = new SitemapRenderer([], BASE_CONFIG);
      const items = (renderer as any).formatItems([
        { loc: "/page", lastmod: "2024-06-15T12:00:00Z" },
      ]);
      expect(items[0].lastmod).toBe("2024-06-15");
    });

    it("applies default changefreq from config", () => {
      const renderer = new SitemapRenderer([], {
        ...BASE_CONFIG,
        defaultChangefreq: "weekly",
      });
      const items = (renderer as any).formatItems([{ loc: "/page" }]);
      expect(items[0].changefreq).toBe("weekly");
    });

    it("applies default priority from config", () => {
      const renderer = new SitemapRenderer([], {
        ...BASE_CONFIG,
        defaultPriority: 0.5,
      });
      const items = (renderer as any).formatItems([{ loc: "/page" }]);
      expect(items[0].priority).toBe(0.5);
    });

    it("does not override item-provided changefreq", () => {
      const renderer = new SitemapRenderer([], {
        ...BASE_CONFIG,
        defaultChangefreq: "weekly",
      });
      const items = (renderer as any).formatItems([
        { loc: "/page", changefreq: "daily" },
      ]);
      expect(items[0].changefreq).toBe("daily");
    });

    it("does not override item-provided priority", () => {
      const renderer = new SitemapRenderer([], {
        ...BASE_CONFIG,
        defaultPriority: 0.5,
      });
      const items = (renderer as any).formatItems([
        { loc: "/page", priority: 1.0 },
      ]);
      expect(items[0].priority).toBe(1.0);
    });

    it("omits lastmod when not provided", () => {
      const renderer = new SitemapRenderer([], BASE_CONFIG);
      const items = (renderer as any).formatItems([{ loc: "/page" }]);
      expect(items[0].lastmod).toBeUndefined();
    });
  });

  describe("escapeXml", () => {
    it("escapes ampersand", () => {
      expect(SitemapRenderer["escapeXml"]("foo&bar")).toBe("foo&amp;bar");
    });

    it("escapes less than", () => {
      expect(SitemapRenderer["escapeXml"]("a<b")).toBe("a&lt;b");
    });

    it("escapes greater than", () => {
      expect(SitemapRenderer["escapeXml"]("a>b")).toBe("a&gt;b");
    });

    it("escapes double quote", () => {
      expect(SitemapRenderer["escapeXml"]('a"b')).toBe("a&quot;b");
    });

    it("escapes single quote", () => {
      expect(SitemapRenderer["escapeXml"]("a'b")).toBe("a&apos;b");
    });

    it("escapes all special characters in a URL", () => {
      expect(SitemapRenderer["escapeXml"]("/search?q=a&b=<c>")).toBe(
        "/search?q=a&amp;b=&lt;c&gt;",
      );
    });
  });

  describe("formatDate", () => {
    it("formats a Date object to YYYY-MM-DD", () => {
      expect(
        SitemapRenderer["formatDate"](new Date("2024-12-25T10:00:00Z")),
      ).toBe("2024-12-25");
    });

    it("formats an ISO string to YYYY-MM-DD", () => {
      expect(SitemapRenderer["formatDate"]("2024-01-15T08:30:00Z")).toBe(
        "2024-01-15",
      );
    });
  });

  describe("toXml", () => {
    it("produces valid XML sitemap structure", () => {
      const renderer = new SitemapRenderer([], BASE_CONFIG);
      const xml = (renderer as any).toXml([
        {
          loc: "https://example.com/",
          lastmod: "2024-01-01",
          changefreq: "daily",
          priority: 1.0,
        },
      ]);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      );
      expect(xml).toContain("<loc>https://example.com/</loc>");
      expect(xml).toContain("<lastmod>2024-01-01</lastmod>");
      expect(xml).toContain("<changefreq>daily</changefreq>");
      expect(xml).toContain("<priority>1</priority>");
      expect(xml).toContain("</urlset>");
    });

    it("includes only present optional fields", () => {
      const renderer = new SitemapRenderer([], BASE_CONFIG);
      const xml = (renderer as any).toXml([{ loc: "https://example.com/" }]);
      expect(xml).toContain("<loc>https://example.com/</loc>");
      expect(xml).not.toContain("<lastmod>");
      expect(xml).not.toContain("<changefreq>");
      expect(xml).not.toContain("<priority>");
    });

    it("escapes XML special characters in URLs", () => {
      const renderer = new SitemapRenderer([], BASE_CONFIG);
      const xml = (renderer as any).toXml([
        { loc: "https://example.com/search?a=1&b=2" },
      ]);
      expect(xml).toContain(
        "<loc>https://example.com/search?a=1&amp;b=2</loc>",
      );
    });

    it("handles empty items array", () => {
      const renderer = new SitemapRenderer([], BASE_CONFIG);
      const xml = (renderer as any).toXml([]);
      expect(xml).toContain("<urlset");
      expect(xml).toContain("</urlset>");
      expect(xml).not.toContain("<url>");
    });
  });

  describe("renderToReadableStream", () => {
    it("returns a ReadableStream and sets statusCode to 200", async () => {
      const getter: SitemapGetter = async () => [{ loc: "/page" }];
      const renderer = new SitemapRenderer([getter], BASE_CONFIG);
      const stream = await renderer.renderToReadableStream();
      expect(stream).toBeInstanceOf(ReadableStream);
      expect(renderer.statusCode).toBe(200);
    });

    it("stream contains valid XML", async () => {
      const getter: SitemapGetter = async () => [
        {
          loc: "/page1",
          lastmod: "2024-01-01",
          changefreq: "daily" as const,
          priority: 0.8,
        },
      ];
      const renderer = new SitemapRenderer([getter], BASE_CONFIG);
      const stream = await renderer.renderToReadableStream();
      const body = await streamToString(stream);
      expect(body).toContain("<?xml");
      expect(body).toContain("<loc>https://example.com/page1</loc>");
    });
  });

  describe("renderToPipeableStream", () => {
    it("returns pipe and abort functions", () => {
      const renderer = new SitemapRenderer([], BASE_CONFIG);
      const result = renderer.renderToPipeableStream();
      expect(typeof result.pipe).toBe("function");
      expect(typeof result.abort).toBe("function");
    });

    it("resolves statusReady and sets statusCode to 200", async () => {
      const getter: SitemapGetter = async () => [{ loc: "/page" }];
      const renderer = new SitemapRenderer([getter], BASE_CONFIG);
      renderer.renderToPipeableStream();
      await renderer.statusReady;
      expect(renderer.statusCode).toBe(200);
    });

    it("abort destroys the stream", () => {
      const renderer = new SitemapRenderer([], BASE_CONFIG);
      const result = renderer.renderToPipeableStream();
      expect(() => result.abort()).not.toThrow();
    });

    it("pipes XML data to a writable stream", async () => {
      const getter: SitemapGetter = async () => [{ loc: "/page" }];
      const renderer = new SitemapRenderer([getter], BASE_CONFIG);
      const result = renderer.renderToPipeableStream();
      await renderer.statusReady;

      const chunks: Buffer[] = [];
      const passthrough = new PassThrough();
      passthrough.on("data", (chunk: Buffer) => chunks.push(chunk));

      await new Promise<void>((resolve) => {
        passthrough.on("end", resolve);
        result.pipe(passthrough);
      });

      const body = Buffer.concat(chunks).toString("utf-8");
      expect(body).toContain("<?xml");
      expect(body).toContain("<loc>https://example.com/page</loc>");
    });
  });

  describe("renderToString", () => {
    it("returns XML string and sets statusCode to 200", async () => {
      const getter: SitemapGetter = async () => [{ loc: "/page" }];
      const renderer = new SitemapRenderer([getter], BASE_CONFIG);
      const xml = await renderer.renderToString();
      expect(typeof xml).toBe("string");
      expect(xml).toContain("<?xml");
      expect(xml).toContain("<loc>https://example.com/page</loc>");
      expect(renderer.statusCode).toBe(200);
    });

    it("handles empty getters", async () => {
      const renderer = new SitemapRenderer([], BASE_CONFIG);
      const xml = await renderer.renderToString();
      expect(xml).toContain("<urlset");
      expect(xml).not.toContain("<url>");
    });

    it("produces identical output on repeated calls", async () => {
      const getter: SitemapGetter = async () => [{ loc: "/page" }];
      const renderer = new SitemapRenderer([getter], BASE_CONFIG);
      const xml1 = await renderer.renderToString();
      const xml2 = await renderer.renderToString();
      expect(xml1).toBe(xml2);
    });

    it("aggregates items from multiple getters", async () => {
      const getter1: SitemapGetter = async () => [{ loc: "/a" }];
      const getter2: SitemapGetter = async () => [{ loc: "/b" }];
      const renderer = new SitemapRenderer([getter1, getter2], BASE_CONFIG);
      const xml = await renderer.renderToString();
      expect(xml).toContain("<loc>https://example.com/a</loc>");
      expect(xml).toContain("<loc>https://example.com/b</loc>");
    });
  });
});
