/**
 * Compose a page's own title into the document title.
 *
 * Every page names only itself — `<Head title="Standards" />` — and the site
 * name is appended here, once. That keeps it out of every page, where it can
 * drift, and it means a test harness and the page it renders cannot disagree
 * about the suffix.
 *
 * The client and the server entries must pass the same function to
 * `HeadProvider`, or the server-rendered title would not match the one the
 * client renders after hydration; every mount imports this module for that
 * reason, the test harnesses included.
 */
export default function formatDocumentTitle(pageTitle: string): string {
  return `${pageTitle} — Pragma docs`;
}
