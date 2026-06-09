import path from "node:path";
import type { StaticMount } from "./StaticMount.js";

/**
 * Parse a `route:filepath` pair (e.g. `"assets:dist/client/assets"`) into a
 * {@link StaticMount}. With no separator the whole string is both the route and
 * the (cwd-relative) directory; an empty route (`":dist/client"`) is the root
 * mount. The directory is resolved against `cwd`.
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
