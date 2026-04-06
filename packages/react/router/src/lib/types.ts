import type { ReadableStream } from "node:stream/web";
import type {
  AnyRoute,
  HasParams,
  ParamsOf,
  RouteMap,
  RouteName,
  RouteOf,
  Router,
  RouterDehydratedState,
  RouterLoadResult,
  RouterNavigationState,
  RouterOptions,
  SearchOf,
} from "@canonical/router-core";
import type {
  AnchorHTMLAttributes,
  MouseEventHandler,
  ReactNode,
  Ref,
} from "react";

/**
 * Shared public types for the React router bindings.
 *
 * These types describe the component props, SSR return values, and hydration
 * options that make up the `@canonical/router-react` public API surface.
 */

/** A router instance widened to the fully dynamic React binding shape. */
export type AnyReactRouter = Router<RouteMap, AnyRoute | undefined>;

/** Props accepted by `RouterProvider`. */
export interface RouterProviderProps<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> {
  /** React children that should be able to consume the router. */
  readonly children?: ReactNode;
  /** The router instance made available to descendants. */
  readonly router: Router<TRoutes, TNotFound>;
}

/**
 * Route-building options shared by `Link`, `navigate()`, and `prefetch()`.
 */
export type LinkBuildOptions<TRoute extends AnyRoute> = {
  /** Optional URL hash fragment without the leading `#`. */
  readonly hash?: string;
  /** Search data to encode into the destination URL. */
  readonly search?: SearchOf<TRoute>;
} & (HasParams<TRoute> extends true
  ? { readonly params: ParamsOf<TRoute> }
  : { readonly params?: ParamsOf<TRoute> });

/** Props accepted by `Link`. */
export type LinkProps<
  TRoutes extends RouteMap,
  TName extends RouteName<TRoutes>,
> = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  LinkBuildOptions<RouteOf<TRoutes, TName>> & {
    /** Content rendered inside the generated anchor element. */
    readonly children?: ReactNode;
    /** Optional click handler called before router interception runs. */
    readonly onClick?: MouseEventHandler<HTMLAnchorElement>;
    /** Optional hover handler called before router prefetching runs. */
    readonly onMouseEnter?: MouseEventHandler<HTMLAnchorElement>;
    /** Ref forwarded to the underlying anchor element. */
    readonly ref?: Ref<HTMLAnchorElement>;
    /** The named route to navigate to. */
    readonly to: TName;
  };

/** Props accepted by `Outlet`. */
export interface OutletProps {
  /** Content shown while suspended route output is pending. */
  readonly fallback?: ReactNode;
}

/** Props accepted by `ServerRouter`. */
export interface ServerRouterProps<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> extends OutletProps {
  /** The router instance that has already been configured for the request. */
  readonly router: Router<TRoutes, TNotFound>;
}

/** Optional settings for `renderToStream()`. */
export interface RenderToStreamOptions {
  /** Content rendered while suspended route output resolves. */
  readonly fallback?: ReactNode;
}

/**
 * Streamed server-rendering output plus the data needed for client hydration.
 */
export interface RenderToStreamResult<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> {
  /** Inline script content that assigns the dehydrated router state on `window`. */
  readonly bootstrapScriptContent: string | null;
  /** Plain JSON router state captured after the initial load. */
  readonly initialData: RouterDehydratedState<TRoutes> | null;
  /** The result returned by `router.load(url)`. */
  readonly loadResult: RouterLoadResult<TRoutes, TNotFound>;
  /** The readable stream containing the rendered React response body. */
  readonly stream: ReadableStream;
}

/** Minimal window-like object used during hydration. */
export interface HydrationWindow {
  /** Arbitrary global values, including the router's initial data payload. */
  readonly [key: string]: unknown;
}

/** Options accepted by `createHydratedRouter()`. */
export interface CreateHydratedRouterOptions<
  TNotFound extends AnyRoute | undefined,
> extends Omit<RouterOptions<TNotFound>, "adapter"> {
  /** Alternate window-like object to read initial hydration data from. */
  readonly browserWindow?: HydrationWindow;
}

/** Alias for the window-like value consumed by `createHydratedRouter()`. */
export type CreateHydratedRouterWindow = HydrationWindow;

/** Alias for the navigation state values emitted by router-react hooks. */
export type HydratedNavigationState = RouterNavigationState;

/** Mapping of selected search-param keys to their current values. */
export type SearchParamValues<TKeys extends readonly string[]> = Readonly<{
  [TKey in TKeys[number]]: string | null;
}>;

/** Options for `useRouterState()` power-user subscriptions. */
export interface UseRouterStateOptions<TSelected> {
  /**
   * Optional equality function used to preserve the previous selected value
   * when the next selection is semantically unchanged.
   */
  readonly isEqual?: (previous: TSelected, next: TSelected) => boolean;
}
