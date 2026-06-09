import path from "node:path";
import { matchStaticRoute } from "./matchStaticRoute.js";
import type { StaticMount } from "./StaticMount.js";

/** True when the path's last segment carries a file extension (e.g. `.js`, `.txt`). */
function hasFileExtension(pathname: string): boolean {
  return /\.[a-z0-9]+$/i.test(pathname);
}

/**
 * Resolve the on-disk path for a request under a static mount, or `null` if the
 * request does not match the mount, is not a static-file request, or attempts to
 * escape the mount directory.
 *
 * Only paths that carry a **file extension** are treated as static, so a root
 * mount (`/`) serves `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, and the
 * hashed `/assets/*` while extensionless routes (`/`, `/about`) fall through to
 * be server-rendered — `index.html` is never served in place of the SSR page.
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
  if (!hasFileExtension(pathname)) return null;

  // A root mount serves from the mount dir itself; a prefixed mount strips the
  // prefix so the remainder resolves under the dir.
  const tail =
    mount.route === "/" ? pathname : pathname.slice(mount.route.length);

  let decoded: string;
  try {
    decoded = decodeURIComponent(tail);
  } catch {
    // Malformed percent-encoding — reject.
    return null;
  }
  // Reject any traversal segment (covers `..`, `%2e%2e`, and `%2f`-smuggled
  // separators since `tail` is decoded above).
  if (decoded.split(/[/\\]/).includes("..")) return null;

  // Strip the leading separator so `path.join` cannot treat an absolute-looking
  // tail (e.g. `/etc/passwd`) as a root and discard the mount directory. Resolve
  // against the mount and verify the result stays within it — a path that
  // escapes (via absolute tail or otherwise) is rejected. This containment check
  // is the real guard; the `..` rejection above is defence in depth.
  const relative = decoded.replace(/^[/\\]+/, "");
  const resolvedDir = path.resolve(mount.dir);
  const resolved = path.resolve(resolvedDir, relative);
  /* v8 ignore next 4 -- defensive backstop: the `..` rejection and leading-separator
     strip above already prevent every known escape, so this containment check is
     not reachable in tests; it stays as a last line of defence against future drift. */
  if (
    resolved !== resolvedDir &&
    !resolved.startsWith(`${resolvedDir}${path.sep}`)
  ) {
    return null;
  }

  return resolved;
}
