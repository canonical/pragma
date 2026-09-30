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

/** True only for an absolute HTTP(S) URL — the sitemap base must be one
 * (relative `loc` values are resolved against it with `new URL(loc, base)`).
 * Guards against an empty or relative `BASE_URL` (e.g. the `"/"` some tooling
 * injects), and against a syntactically valid but NON-HIERARCHICAL absolute
 * URL: `URL.canParse("mailto:docs@example.com")` is true, but resolving a
 * relative path against that base throws, which would turn a misconfigured
 * environment variable into a 500 on `/sitemap.xml` rather than a fallback to
 * localhost. A sitemap that a crawler fetches over HTTP can only have an
 * HTTP(S) base anyway.
 *
 * Exported so the guard can be tested directly: `baseUrl` below is resolved
 * once at module load, which makes the decision itself the only thing a test
 * can address without reloading the module for every case. */
export function isAbsoluteUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const { protocol } = new URL(value);
  return protocol === "http:" || protocol === "https:";
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
