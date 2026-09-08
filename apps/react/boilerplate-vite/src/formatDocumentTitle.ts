/**
 * Compose a page's own title into the document title.
 *
 * Every page names only itself — `<Head title="Account" />` — and the
 * application name is appended here, once. That keeps the name out of every
 * message catalog, and it is what makes a page added later by
 * `summon route <domain>/<name>` (whose scaffolded title is a bare noun) title
 * itself consistently with the rest of the app.
 *
 * The client and the server entries must pass the same function to
 * `HeadProvider`, or the server-rendered title would not match the one the
 * client renders after hydration; both import this module for that reason.
 */
export default function formatDocumentTitle(pageTitle: string): string {
  return `${pageTitle} — Boilerplate`;
}
