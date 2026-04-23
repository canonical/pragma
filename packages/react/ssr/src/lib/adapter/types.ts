/**
 * Shared type contracts for SSR deployment adapters.
 *
 * These types define the interface between platform-specific adapters
 * (Cloudflare Workers, Vercel, Deno Deploy) and the transport-agnostic
 * renderers in `@canonical/react-ssr`. Adapters consume these types;
 * renderers satisfy them.
 */

/**
 * The subset of a renderer that adapters need to produce a response.
 *
 * Any renderer (`JSXRenderer`, `SitemapRenderer`, `TextRenderer`) satisfies
 * this interface after calling the appropriate render method.
 */
export interface RendererResult {
  /** Render to a web `ReadableStream` (Bun, Deno, Cloudflare Workers, Vercel Edge). */
  renderToReadableStream: (signal?: AbortSignal) => Promise<ReadableStream>;

  /** HTTP status code determined during rendering. */
  statusCode: number;

  /** Resolves when `statusCode` is determined. */
  statusReady: Promise<void>;
}

/**
 * A function that creates a renderer for a given request.
 *
 * All adapters use the Web Standard `Request` type. Adapters running on
 * Node.js (e.g. Vercel serverless) convert `IncomingMessage` to `Request`
 * internally before calling the factory.
 */
export type RendererFactory = (request: Request) => RendererResult;

/**
 * A route definition that maps a URL pattern to a renderer factory.
 *
 * Adapters iterate routes in order and use the first match. The pattern
 * uses simple glob matching: `"/*"` matches everything, `"/sitemap.xml"`
 * matches exactly, `"/api/*"` matches any path under `/api/`.
 */
export interface RouteDefinition {
  /** URL pattern (e.g. `"/sitemap.xml"`, `"/api/*"`, `"/*"`). */
  pattern: string;

  /** Factory that creates a renderer for matched requests. */
  factory: RendererFactory;

  /**
   * Content-Type header for responses from this route.
   * Defaults to `"text/html; charset=utf-8"` when omitted.
   */
  contentType?: string;

  /** Cache configuration for responses from this route. */
  cache?: CacheConfig;
}

/**
 * Cache-Control header configuration.
 *
 * Adapters translate these values into platform-appropriate caching:
 * - Cloudflare: Cache API (`caches.default.put`) + `Cache-Control` header
 * - Vercel: `Cache-Control` header (CDN respects `s-maxage`)
 * - Deno: `Cache-Control` header only
 */
export interface CacheConfig {
  /** Browser cache duration in seconds (`max-age`). */
  maxAge?: number;

  /** CDN/edge cache duration in seconds (`s-maxage`). */
  sMaxAge?: number;

  /** Duration in seconds to serve stale while revalidating (`stale-while-revalidate`). */
  staleWhileRevalidate?: number;
}

/**
 * Configuration for serving static assets (CSS, JS, images, fonts).
 *
 * Each entry maps a URL prefix to a source directory. The adapter serves
 * matching requests from the source using the platform's optimal mechanism
 * (R2 on Cloudflare, CDN on Vercel, filesystem on Deno/Bun).
 */
export interface StaticAssetConfig {
  /** URL path prefix (e.g. `"/assets"`). */
  urlPrefix: string;

  /**
   * Source directory or key prefix.
   * - Cloudflare: R2 key prefix (e.g. `"assets"`)
   * - Vercel: not used (static assets served by CDN from `.vercel/output/static/`)
   * - Deno/Bun: filesystem path (e.g. `"dist/client/assets"`)
   */
  directory: string;
}
