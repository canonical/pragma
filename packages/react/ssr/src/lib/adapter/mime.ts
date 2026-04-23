/**
 * Minimal MIME type lookup for static asset serving.
 *
 * Covers the file types commonly produced by Vite builds (scripts, styles,
 * images, fonts, source maps). Adapters use this when the platform doesn't
 * provide native MIME detection (Cloudflare R2, Deno filesystem).
 *
 * No external dependencies — the lookup is a plain record.
 */

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".wasm": "application/wasm",
  ".map": "application/json; charset=utf-8",
};

/**
 * Look up the MIME type for a file path based on its extension.
 *
 * Returns `"application/octet-stream"` for unknown extensions.
 *
 * @param path - File path or name (e.g. `"main.abc123.js"`, `"/assets/logo.png"`).
 * @returns The MIME type string.
 */
export function getMimeType(path: string): string {
  const dotIndex = path.lastIndexOf(".");
  if (dotIndex === -1) return "application/octet-stream";
  const ext = path.slice(dotIndex).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

/**
 * Build a `Cache-Control` header value from a cache configuration.
 *
 * @param cache - Cache configuration with optional directives.
 * @returns A `Cache-Control` header string.
 */
export function buildCacheControl(cache: {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
}): string {
  const parts: string[] = [];
  if (cache.maxAge != null) parts.push(`max-age=${cache.maxAge}`);
  if (cache.sMaxAge != null) parts.push(`s-maxage=${cache.sMaxAge}`);
  if (cache.staleWhileRevalidate != null)
    parts.push(`stale-while-revalidate=${cache.staleWhileRevalidate}`);
  return parts.length > 0 ? `public, ${parts.join(", ")}` : "public";
}

/**
 * Match a URL pathname against a simple pattern.
 *
 * Supports three forms:
 * - Exact match: `"/sitemap.xml"` matches only `"/sitemap.xml"`
 * - Wildcard suffix: `"/api/*"` matches `"/api/"` and anything below
 * - Catch-all: `"/*"` matches everything
 *
 * @param pattern - The route pattern.
 * @param pathname - The URL pathname to test.
 * @returns `true` if the pathname matches the pattern.
 */
export function matchPattern(pattern: string, pathname: string): boolean {
  if (pattern === "/*") return true;
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  }
  return pathname === pattern;
}
