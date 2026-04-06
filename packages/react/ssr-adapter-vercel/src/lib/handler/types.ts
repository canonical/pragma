import type {
  CacheConfig,
  RendererFactory,
} from "@canonical/react-ssr/adapter";

/**
 * Configuration for the Vercel adapter handlers.
 */
export interface VercelAdapterConfig {
  /**
   * Routes to match against incoming requests, checked in order.
   * The first matching route handles the request.
   */
  routes: readonly VercelRouteDefinition[];
}

/**
 * A route definition for the Vercel adapter.
 */
export interface VercelRouteDefinition {
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
