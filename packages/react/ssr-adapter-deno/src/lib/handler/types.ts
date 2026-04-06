import type {
  CacheConfig,
  RendererFactory,
  StaticAssetConfig,
} from "@canonical/react-ssr/adapter";

/**
 * Configuration for the Deno Deploy adapter.
 */
export interface DenoAdapterConfig {
  /**
   * Routes to match against incoming requests, checked in order.
   * The first matching route handles the request.
   */
  routes: readonly DenoRouteDefinition[];

  /**
   * Static asset directories to serve before checking routes.
   * Each entry maps a URL prefix to a filesystem directory.
   */
  staticAssets?: readonly StaticAssetConfig[];
}

/**
 * A route definition for the Deno adapter.
 */
export interface DenoRouteDefinition {
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
