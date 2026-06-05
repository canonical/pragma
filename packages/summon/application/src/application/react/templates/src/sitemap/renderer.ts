/**
 * Sitemap renderer for the `/sitemap.xml` route.
 *
 * Builds a `SitemapRenderer` from the route getters (`getSitemapItems`) and the
 * site's canonical base URL. The server (`src/server/renderer.tsx`) dispatches
 * `GET /sitemap.xml` to this renderer; every other path falls through to the
 * JSX app renderer. Set `BASE_URL` (e.g. `https://example.com`) in production so
 * relative `loc` values resolve to absolute, crawlable URLs.
 */
import { SitemapRenderer } from "@canonical/react-ssr/renderer";
import getSitemapItems from "./getSitemapItems.js";

const baseUrl = process.env.BASE_URL ?? "http://localhost:5174";

const sitemapRenderer = new SitemapRenderer([getSitemapItems], { baseUrl });

export default sitemapRenderer;
