import path from "node:path";

/**
 * A static mount: a URL route prefix mapped to a filesystem directory.
 */
export interface StaticMount {
  /** URL prefix, always leading-slashed, e.g. `/assets`. */
  route: string;
  /** Absolute directory the route serves from. */
  dir: string;
}

/**
 * Parse a `route:filepath` pair (e.g. `"assets:dist/client/assets"`) into a
 * {@link StaticMount}. With no separator the whole string is both the route and
 * the (cwd-relative) directory. The directory is resolved against `cwd`.
 *
 * @param pair - A `"route:filepath"` or bare `"name"` string.
 * @param cwd - Base directory for resolving the filepath (default `process.cwd()`).
 */
export function parseStaticPair(
  pair: string,
  cwd: string = process.cwd(),
): StaticMount {
  const separatorIndex = pair.indexOf(":");
  if (separatorIndex === -1) {
    return { route: `/${pair}`, dir: path.join(cwd, pair) };
  }
  const route = pair.slice(0, separatorIndex);
  const filepath = pair.slice(separatorIndex + 1);
  return { route: `/${route}`, dir: path.join(cwd, filepath) };
}

/**
 * Does `pathname` fall under `route`, matched on a path-segment boundary?
 *
 * `/assets` matches `/assets` and `/assets/x` but NOT `/assetsfoo/x` — a plain
 * `startsWith` would wrongly match the latter.
 */
export function matchStaticRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

/**
 * Resolve the on-disk path for a request under a static mount, or `null` if the
 * request does not match the mount or attempts to escape its directory.
 *
 * Guards against path traversal: the URL tail is decoded (so `%2e%2e`/`%2f`
 * forms are caught) and rejected if it contains a `..` segment; as defence in
 * depth the resolved path must remain within the mount directory. This mirrors
 * the Deno adapter's guard so the bins cannot drift from it.
 *
 * @returns The absolute file path to serve, or `null` to skip this mount.
 */
export function resolveStaticFile(
  pathname: string,
  mount: StaticMount,
): string | null {
  if (!matchStaticRoute(pathname, mount.route)) return null;

  const tail = pathname.slice(mount.route.length);

  let decoded: string;
  try {
    decoded = decodeURIComponent(tail);
  } catch {
    // Malformed percent-encoding — reject.
    return null;
  }
  // Reject any traversal segment (covers `..`, `%2e%2e`, and `%2f`-smuggled
  // separators since `tail` is decoded above). Because `matchStaticRoute`
  // guarantees `tail` is empty or starts with `/`, a tail free of `..` segments
  // cannot escape the mount directory, so this single check is sufficient.
  if (decoded.split(/[/\\]/).includes("..")) return null;

  return path.join(mount.dir, tail);
}
