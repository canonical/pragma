import buildUrl from "./buildUrl.js";
import { matchPath, renderPattern } from "./pathUtils.js";
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
        return matchPath(
          definition.url,
          buildUrl(input),
        ) as RouteParams<TPath> | null;
      },
      render(params: RouteParams<TPath>) {
        return renderPattern(definition.url, params as Record<string, string>);
      },
    };
  }

  return {
    ...definition,
    wrappers: (definition.wrappers ?? []) as TWrappers,
    parse(input: string | URL) {
      return matchPath(
        definition.url,
        buildUrl(input),
      ) as RouteParams<TPath> | null;
    },
    render(params: RouteParams<TPath>) {
      return renderPattern(definition.url, params as Record<string, string>);
    },
  };
}
