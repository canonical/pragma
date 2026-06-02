import type {
  CacheConfig,
  RendererFactory,
} from "@canonical/react-ssr/adapter";

/**
 * Cloudflare Workers environment bindings.
 *
 * Static assets are served by Workers Static Assets (the `[assets]` block in
 * `wrangler.toml`) at the edge, before the Worker runs — so no asset binding is
 * required here. Add your own bindings (KV, D1, R2, secrets) by extending this
 * interface.
 */
export interface CloudflareEnv {
  [key: string]: unknown;
}

/**
 * Configuration for the Cloudflare Workers adapter.
 */
export interface CloudflareAdapterConfig {
  /**
   * Routes to match against incoming requests, checked in order.
   * The first matching route handles the request.
   */
  routes: readonly CloudflareRouteDefinition[];

  /**
   * Enable Cloudflare Cache API for SSR responses.
   * When true, successful renders are cached at the edge.
   * Defaults to `true`.
   */
  enableCache?: boolean;
}

/**
 * A route definition for the Cloudflare adapter.
 */
export interface CloudflareRouteDefinition {
  /** URL pattern (e.g. `"/sitemap.xml"`, `"/api/*"`, `"/*"`). */
  pattern: string;

  /** Factory that creates a renderer for matched requests. */
  factory: RendererFactory;

  /**
   * Content-Type header for responses from this route.
   * Defaults to `"text/html; charset=utf-8"`.
   */
  contentType?: string;

  /** Cache configuration for responses from this route. */
  cache?: CacheConfig;
}
