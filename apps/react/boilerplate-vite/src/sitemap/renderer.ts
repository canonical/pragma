/**
 * Sitemap renderer for the `/sitemap.xml` route.
 *
 * Builds a `SitemapRenderer` from the route getters (`getSitemapItems`) and the
 * site's canonical base URL. Each server entrypoint dispatches `GET /sitemap.xml`
 * to this factory; every other path falls through to the JSX app renderer. The
 * sitemap and app renderers know nothing about each other — the server picks
 * between them. Set `BASE_URL` (e.g. `https://example.com`) in production so
 * relative `loc` values resolve to absolute, crawlable URLs.
 */
import { SitemapRenderer } from "@canonical/react-ssr/renderer";
import getSitemapItems from "./getSitemapItems.js";

/** True only for an absolute URL — the sitemap base must be one (relative `loc`
 * values are resolved against it). Guards against an empty or relative
 * `BASE_URL` (e.g. the `"/"` some tooling injects), which is not a valid base. */
function isAbsoluteUrl(value: string): boolean {
  return URL.canParse(value);
}

const DEFAULT_BASE_URL = "http://localhost:5174";
const fromEnv = process.env.BASE_URL;
const baseUrl = fromEnv && isAbsoluteUrl(fromEnv) ? fromEnv : DEFAULT_BASE_URL;

const sitemapRenderer = new SitemapRenderer([getSitemapItems], { baseUrl });

/**
 * Per-request factory mirroring the JSX app's `createRenderer` contract, so the
 * server entrypoints select between them uniformly. The `SitemapRenderer` holds
 * no per-request state, so the same instance is reused across requests.
 */
export default function createSitemapRenderer() {
  return sitemapRenderer;
}
