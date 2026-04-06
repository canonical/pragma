import type {
  CacheConfig,
  RendererFactory,
  StaticAssetConfig,
} from "@canonical/react-ssr/adapter";

/**
 * Cloudflare Workers environment bindings.
 *
 * The `ASSETS` binding is an R2 bucket used for serving static assets
 * (CSS, JS, images, fonts). Additional bindings can be added by
 * extending this interface.
 */
export interface CloudflareEnv {
  /** R2 bucket binding for static assets. */
  ASSETS: R2Bucket;
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
   * Static asset configurations. Assets are served from R2 with
   * immutable cache headers.
   */
  staticAssets?: readonly StaticAssetConfig[];

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
