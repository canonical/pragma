/**
 * Shared path-matching and rendering utilities for route codecs.
 *
 * Both `route()` (standalone triplet construction) and `createRouter()` (the
 * full router factory) share the same matching semantics. These functions are
 * the single source of truth for segment splitting, param extraction, wildcard
 * handling, and path rendering.
 */

import buildUrl from "./buildUrl.js";
import { runSchema } from "./schemaUtils.js";
import type { SchemaLike } from "./types.js";

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
 * Wildcard (`*`) segments are omitted from the output. Non-string values
 * (e.g. the output of a params schema that coerces to numbers) are
 * serialized with `String()`. Throws if a required param is missing from
 * the provided values.
 */
export function renderPattern(
  path: string,
  params: Readonly<Record<string, unknown>>,
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

    if (paramValue === undefined || paramValue === null) {
      throw new Error(`Missing route param '${paramName}' for '${path}'.`);
    }

    return encodeURIComponent(String(paramValue));
  });

  return `/${renderedSegments.filter(Boolean).join("/")}`;
}

/**
 * Build a route's `parse`/`render` codec pair from its path pattern and
 * optional params schema.
 *
 * `parse` extracts raw string params from the URL and, when a params schema
 * is present, runs it: a failed validation returns `null` — the URL does not
 * identify this route — mirroring a plain pattern mismatch. `render` accepts
 * the schema's output values and serializes them back into the pattern.
 */
export function createRouteCodec(
  path: string,
  paramsSchema?: SchemaLike<unknown>,
): {
  parse(input: string | URL): Readonly<Record<string, unknown>> | null;
  render(params: Readonly<Record<string, unknown>>): string;
} {
  return {
    parse(input: string | URL) {
      const rawParams = matchPath(path, buildUrl(input));

      if (rawParams === null || !paramsSchema) {
        return rawParams;
      }

      const outcome = runSchema(
        paramsSchema,
        rawParams,
        `Route '${path}' params`,
      );

      if (outcome.issues) {
        return null;
      }

      return outcome.value as Readonly<Record<string, unknown>>;
    },
    render(params: Readonly<Record<string, unknown>>) {
      return renderPattern(path, params);
    },
  };
}
