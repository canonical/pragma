/**
 * Generate `dist/client/sitemap.xml` from the app's route entries.
 *
 * Run after `build:client` (the `build:sitemap` script chains them). The output
 * lands in `dist/client`, so the preview servers and a production deploy serve
 * it at `/sitemap.xml`, and `robots.txt` points crawlers to it.
 *
 * The site's base URL comes from `SITE_URL` (e.g.
 * `SITE_URL=https://example.com bun run build:sitemap`); absolute URLs are
 * required in a sitemap, so it defaults to a placeholder to make that explicit.
 */
import fs from "node:fs";
import path from "node:path";
import { SitemapRenderer } from "@canonical/react-ssr/renderer";
import getSitemapItems from "./sitemap.js";

const baseUrl = process.env.SITE_URL ?? "https://example.com";
const outPath = path.join(process.cwd(), "dist", "client", "sitemap.xml");

const renderer = new SitemapRenderer([getSitemapItems], { baseUrl });
const xml = await renderer.renderToString();

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, xml, "utf-8");

console.log(`Wrote ${outPath} (base URL: ${baseUrl})`);
