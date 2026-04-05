import type {
  AnyWrapper,
  DataRouteDefinition,
  DataRouteInput,
  RedirectRouteDefinition,
  RedirectRouteInput,
  RouteDefinition,
  RouteInput,
  RouteParams,
} from "./types.js";

function extractParamName(patternSegment: string): string {
  return patternSegment
    .slice(1)
    .replace(/\(.+$/, "")
    .replace(/[?*+]$/, "");
}

function getPathname(input: string | URL): string {
  if (input instanceof URL) {
    return input.pathname;
  }

  if (input.startsWith("http://") || input.startsWith("https://")) {
    return new URL(input).pathname;
  }

  return new URL(input, "https://router.local").pathname;
}

function splitPathSegments(pathname: string): string[] {
  if (pathname === "/") {
    return [];
  }

  return pathname.split("/").filter(Boolean);
}

function matchPath<TPath extends string>(
  routePath: TPath,
  input: string | URL,
): RouteParams<TPath> | null {
  const routeSegments = splitPathSegments(routePath);
  const pathSegments = splitPathSegments(getPathname(input));

  if (routeSegments.length !== pathSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < routeSegments.length; index += 1) {
    const routeSegment = routeSegments[index];
    const pathSegment = pathSegments[index];

    if (!routeSegment.startsWith(":")) {
      if (routeSegment !== pathSegment) {
        return null;
      }

      continue;
    }

    params[extractParamName(routeSegment)] = decodeURIComponent(pathSegment);
  }

  return params as RouteParams<TPath>;
}

function buildPath<TPath extends string>(
  routePath: TPath,
  params: RouteParams<TPath>,
): string {
  const routeSegments = splitPathSegments(routePath);

  if (routeSegments.length === 0) {
    return "/";
  }

  const renderedSegments = routeSegments.map((routeSegment) => {
    if (!routeSegment.startsWith(":")) {
      return routeSegment;
    }

    const paramName = extractParamName(routeSegment) as keyof typeof params;
    const paramValue = params[paramName];

    if (typeof paramValue !== "string") {
      throw new Error(
        `Missing route param '${String(paramName)}' for '${routePath}'.`,
      );
    }

    return encodeURIComponent(paramValue);
  });

  return `/${renderedSegments.join("/")}`;
}

function isRedirectRouteInput<
  TPath extends string,
  TWrappers extends readonly AnyWrapper[],
>(
  definition: RouteInput<TPath, undefined, void, unknown, TWrappers>,
): definition is RedirectRouteInput<TPath, string, TWrappers> {
  return "redirect" in definition;
}

/** Construct a flat route triplet and derive its path codec. */
export default function route<
  const TPath extends string,
  TTarget extends string,
  TWrappers extends readonly AnyWrapper[] = readonly [],
>(
  definition: RedirectRouteInput<TPath, TTarget, TWrappers>,
): RedirectRouteDefinition<TPath, TTarget, TWrappers>;
export default function route<
  const TPath extends string,
  TSearchSchema extends
    | { readonly "~standard": { readonly output?: unknown } }
    | undefined = undefined,
  TData = void,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
>(
  definition: DataRouteInput<TPath, TSearchSchema, TData, TRendered, TWrappers>,
): DataRouteDefinition<TPath, TSearchSchema, TData, TRendered, TWrappers>;
export default function route<
  const TPath extends string,
  TSearchSchema extends
    | { readonly "~standard": { readonly output?: unknown } }
    | undefined = undefined,
  TData = void,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
>(
  definition: RouteInput<TPath, TSearchSchema, TData, TRendered, TWrappers>,
): RouteDefinition<TPath, TSearchSchema, TData, TRendered, TWrappers> {
  if (
    isRedirectRouteInput(
      definition as RouteInput<TPath, undefined, void, unknown, TWrappers>,
    )
  ) {
    return {
      ...definition,
      wrappers: (definition.wrappers ?? []) as TWrappers,
      parse(input: string | URL) {
        return matchPath(definition.url, input);
      },
      render(params: RouteParams<TPath>) {
        return buildPath(definition.url, params);
      },
    };
  }

  return {
    ...definition,
    wrappers: (definition.wrappers ?? []) as TWrappers,
    parse(input: string | URL) {
      return matchPath(definition.url, input);
    },
    render(params: RouteParams<TPath>) {
      return buildPath(definition.url, params);
    },
  };
}
