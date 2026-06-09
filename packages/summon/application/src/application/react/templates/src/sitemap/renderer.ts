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

/** Canonical base URL for the sitemap. Prefer an absolute `BASE_URL`; otherwise
 * fall back to localhost on the active `PORT` (so local preview / e2e `<loc>`
 * URLs point at the running server rather than a stale hard-coded port). */
const fromEnv = process.env.BASE_URL;
const baseUrl =
  fromEnv && isAbsoluteUrl(fromEnv)
    ? fromEnv
    : `http://localhost:${process.env.PORT ?? 5174}`;

/**
 * Per-request factory mirroring the JSX app's `createRenderer` contract, so the
 * server entrypoints select between them uniformly. A fresh `SitemapRenderer`
 * is created per request: it mutates `statusCode` / `statusReady` while
 * rendering, so a shared instance could interfere across concurrent
 * `/sitemap.xml` requests. The constructor only stores the getters + config, so
 * the allocation is cheap (the data fetch happens later, in `renderTo*`).
 */
export default function createSitemapRenderer() {
  return new SitemapRenderer([getSitemapItems], { baseUrl });
}
