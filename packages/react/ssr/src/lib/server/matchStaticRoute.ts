/**
 * Does `pathname` fall under `route`, matched on a path-segment boundary?
 *
 * `/assets` matches `/assets` and `/assets/x` but NOT `/assetsfoo/x` — a plain
 * `startsWith` would wrongly match the latter. The root mount `/` matches every
 * path, so a single `:dir` mount can serve a whole built client directory.
 *
 * @param pathname - The request pathname (no query string).
 * @param route - The mount's route prefix.
 */
export function matchStaticRoute(pathname: string, route: string): boolean {
  return (
    route === "/" || pathname === route || pathname.startsWith(`${route}/`)
  );
}
