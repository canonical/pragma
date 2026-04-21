import type { SitemapItem } from "@canonical/react-ssr/renderer";

/**
 * Returns sitemap entries for all known routes.
 *
 * In a real app, this would query a CMS or database for dynamic pages.
 * Static routes are listed explicitly.
 */
export default async function getSitemapItems(): Promise<SitemapItem[]> {
  return [
    { loc: "/", changefreq: "weekly", priority: 1.0 },
    { loc: "/guides/router-core", changefreq: "monthly", priority: 0.8 },
    { loc: "/account", changefreq: "monthly", priority: 0.5 },
    { loc: "/login", changefreq: "yearly", priority: 0.3 },
  ];
}
