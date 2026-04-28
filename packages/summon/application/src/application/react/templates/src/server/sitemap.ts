import type { SitemapItem } from "@canonical/react-ssr/renderer";

/**
 * Returns sitemap entries for all known routes.
 *
 * Update this list as you add domains and routes. For dynamic content
 * (blog posts, product pages), fetch entries from your data source.
 *
 * @example
 * const posts = await fetchPosts();
 * return [
 *   ...staticEntries,
 *   ...posts.map((post) => ({
 *     loc: `/blog/${post.slug}`,
 *     lastmod: post.updatedAt,
 *     changefreq: "weekly" as const,
 *     priority: 0.7,
 *   })),
 * ];
 */
export default async function getSitemapItems(): Promise<SitemapItem[]> {
  return [
    { loc: "/", changefreq: "weekly", priority: 1.0 },
    { loc: "/guides/router-core", changefreq: "monthly", priority: 0.8 },
    { loc: "/account", changefreq: "monthly", priority: 0.5 },
    { loc: "/login", changefreq: "yearly", priority: 0.3 },
  ];
}
