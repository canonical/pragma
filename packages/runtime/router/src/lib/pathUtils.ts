/**
 * Shared path-matching and rendering utilities for route codecs.
 *
 * Both `route()` (standalone triplet construction) and `createRouter()` (the
 * full router factory) share the same matching semantics. These functions are
 * the single source of truth for segment splitting, param extraction, wildcard
 * handling, and path rendering.
 */

/** Strip modifier suffixes (regex groups, `?`, `*`, `+`) from a param name. */
export function extractParamName(patternSegment: string): string {
  return patternSegment
    .slice(1)
    .replace(/\(.+$/, "")
    .replace(/[?*+]$/, "");
}

/** Split a pathname into non-empty segments. */
export function splitPathSegments(pathname: string): string[] {
  if (pathname === "/") {
    return [];
  }

  return pathname.split("/").filter(Boolean);
}

/**
 * Match a route pattern against a parsed URL.
 *
 * Supports static segments, `:param` segments, and trailing `*` wildcards.
 * Returns extracted params on match, or `null` on mismatch.
 */
export function matchPath(
  routePath: string,
  inputUrl: URL,
): Record<string, string> | null {
  const routeSegments = splitPathSegments(routePath);
  const pathSegments = splitPathSegments(inputUrl.pathname);
  const params: Record<string, string> = {};

  for (let index = 0; index < routeSegments.length; index += 1) {
    const routeSegment = routeSegments[index];

    if (routeSegment === "*") {
      return params;
    }

    const pathSegment = pathSegments[index];

    if (pathSegment === undefined) {
      return null;
    }

    if (!routeSegment.startsWith(":")) {
      if (routeSegment !== pathSegment) {
        return null;
      }

      continue;
    }

    params[extractParamName(routeSegment)] = decodeURIComponent(pathSegment);
  }

  return pathSegments.length === routeSegments.length ? params : null;
}

/**
 * Render a route pattern by substituting param values.
 *
 * Wildcard (`*`) segments are omitted from the output. Throws if a required
 * param is missing from the provided values.
 */
export function renderPattern(
  path: string,
  params: Record<string, string>,
): string {
  const segments = splitPathSegments(path);

  if (segments.length === 0) {
    return "/";
  }

  const renderedSegments = segments.map((currentSegment) => {
    if (currentSegment === "*") {
      return "";
    }

    if (!currentSegment.startsWith(":")) {
      return currentSegment;
    }

    const paramName = extractParamName(currentSegment);
    const paramValue = params[paramName];

    if (typeof paramValue !== "string") {
      throw new Error(`Missing route param '${paramName}' for '${path}'.`);
    }

    return encodeURIComponent(paramValue);
  });

  return `/${renderedSegments.filter(Boolean).join("/")}`;
}
