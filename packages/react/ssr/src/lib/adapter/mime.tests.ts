import { describe, expect, it } from "vitest";
import { buildCacheControl, getMimeType, matchPattern } from "./mime.js";

describe("getMimeType", () => {
  it("returns correct type for .html", () => {
    expect(getMimeType("index.html")).toBe("text/html; charset=utf-8");
  });

  it("returns correct type for .js", () => {
    expect(getMimeType("main.abc123.js")).toBe(
      "application/javascript; charset=utf-8",
    );
  });

  it("returns correct type for .mjs", () => {
    expect(getMimeType("chunk.mjs")).toBe(
      "application/javascript; charset=utf-8",
    );
  });

  it("returns correct type for .css", () => {
    expect(getMimeType("styles.css")).toBe("text/css; charset=utf-8");
  });

  it("returns correct type for .json", () => {
    expect(getMimeType("data.json")).toBe("application/json; charset=utf-8");
  });

  it("returns correct type for .svg", () => {
    expect(getMimeType("logo.svg")).toBe("image/svg+xml");
  });

  it("returns correct type for .png", () => {
    expect(getMimeType("image.png")).toBe("image/png");
  });

  it("returns correct type for .jpg", () => {
    expect(getMimeType("photo.jpg")).toBe("image/jpeg");
  });

  it("returns correct type for .jpeg", () => {
    expect(getMimeType("photo.jpeg")).toBe("image/jpeg");
  });

  it("returns correct type for .gif", () => {
    expect(getMimeType("anim.gif")).toBe("image/gif");
  });

  it("returns correct type for .webp", () => {
    expect(getMimeType("image.webp")).toBe("image/webp");
  });

  it("returns correct type for .avif", () => {
    expect(getMimeType("image.avif")).toBe("image/avif");
  });

  it("returns correct type for .ico", () => {
    expect(getMimeType("favicon.ico")).toBe("image/x-icon");
  });

  it("returns correct type for .woff", () => {
    expect(getMimeType("font.woff")).toBe("font/woff");
  });

  it("returns correct type for .woff2", () => {
    expect(getMimeType("font.woff2")).toBe("font/woff2");
  });

  it("returns correct type for .ttf", () => {
    expect(getMimeType("font.ttf")).toBe("font/ttf");
  });

  it("returns correct type for .otf", () => {
    expect(getMimeType("font.otf")).toBe("font/otf");
  });

  it("returns correct type for .txt", () => {
    expect(getMimeType("robots.txt")).toBe("text/plain; charset=utf-8");
  });

  it("returns correct type for .xml", () => {
    expect(getMimeType("sitemap.xml")).toBe("application/xml; charset=utf-8");
  });

  it("returns correct type for .wasm", () => {
    expect(getMimeType("module.wasm")).toBe("application/wasm");
  });

  it("returns correct type for .map", () => {
    expect(getMimeType("main.js.map")).toBe("application/json; charset=utf-8");
  });

  it("returns octet-stream for unknown extensions", () => {
    expect(getMimeType("file.xyz")).toBe("application/octet-stream");
  });

  it("returns octet-stream for files without extension", () => {
    expect(getMimeType("LICENSE")).toBe("application/octet-stream");
  });

  it("handles paths with directories", () => {
    expect(getMimeType("/assets/images/logo.png")).toBe("image/png");
  });

  it("is case-insensitive for extensions", () => {
    expect(getMimeType("file.CSS")).toBe("text/css; charset=utf-8");
    expect(getMimeType("file.PNG")).toBe("image/png");
  });
});

describe("buildCacheControl", () => {
  it("builds max-age only", () => {
    expect(buildCacheControl({ maxAge: 3600 })).toBe("public, max-age=3600");
  });

  it("builds s-maxage only", () => {
    expect(buildCacheControl({ sMaxAge: 60 })).toBe("public, s-maxage=60");
  });

  it("builds stale-while-revalidate only", () => {
    expect(buildCacheControl({ staleWhileRevalidate: 300 })).toBe(
      "public, stale-while-revalidate=300",
    );
  });

  it("combines all directives", () => {
    expect(
      buildCacheControl({
        maxAge: 0,
        sMaxAge: 60,
        staleWhileRevalidate: 300,
      }),
    ).toBe("public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  });

  it("returns public for empty config", () => {
    expect(buildCacheControl({})).toBe("public");
  });
});

describe("matchPattern", () => {
  it("matches catch-all /*", () => {
    expect(matchPattern("/*", "/")).toBe(true);
    expect(matchPattern("/*", "/anything")).toBe(true);
    expect(matchPattern("/*", "/deep/nested/path")).toBe(true);
  });

  it("matches exact pattern", () => {
    expect(matchPattern("/sitemap.xml", "/sitemap.xml")).toBe(true);
    expect(matchPattern("/sitemap.xml", "/other")).toBe(false);
    expect(matchPattern("/sitemap.xml", "/sitemap.xml/extra")).toBe(false);
  });

  it("matches wildcard suffix", () => {
    expect(matchPattern("/api/*", "/api/users")).toBe(true);
    expect(matchPattern("/api/*", "/api/users/123")).toBe(true);
    expect(matchPattern("/api/*", "/api/")).toBe(true);
    expect(matchPattern("/api/*", "/api")).toBe(true);
    expect(matchPattern("/api/*", "/apiary")).toBe(false);
    expect(matchPattern("/api/*", "/other")).toBe(false);
  });

  it("matches prefix without trailing content", () => {
    expect(matchPattern("/assets/*", "/assets")).toBe(true);
    expect(matchPattern("/assets/*", "/assets/file.js")).toBe(true);
  });
});
