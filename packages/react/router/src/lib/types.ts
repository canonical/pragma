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

export type AnyReactRouter = Router<RouteMap, AnyRoute | undefined>;

export interface RouterProviderProps<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> {
  readonly children?: ReactNode;
  readonly router: Router<TRoutes, TNotFound>;
}

export type LinkBuildOptions<TRoute extends AnyRoute> = {
  readonly hash?: string;
  readonly search?: SearchOf<TRoute>;
} & (HasParams<TRoute> extends true
  ? { readonly params: ParamsOf<TRoute> }
  : { readonly params?: ParamsOf<TRoute> });

export type LinkProps<
  TRoutes extends RouteMap,
  TName extends RouteName<TRoutes>,
> = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  LinkBuildOptions<RouteOf<TRoutes, TName>> & {
    readonly children?: ReactNode;
    readonly onClick?: MouseEventHandler<HTMLAnchorElement>;
    readonly onMouseEnter?: MouseEventHandler<HTMLAnchorElement>;
    readonly ref?: Ref<HTMLAnchorElement>;
    readonly to: TName;
  };

export interface OutletProps {
  readonly fallback?: ReactNode;
}

export interface ServerRouterProps<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> extends OutletProps {
  readonly router: Router<TRoutes, TNotFound>;
}

export interface RenderToStreamOptions {
  readonly fallback?: ReactNode;
}

export interface RenderToStreamResult<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> {
  readonly bootstrapScriptContent: string | null;
  readonly initialData: RouterDehydratedState<TRoutes> | null;
  readonly loadResult: RouterLoadResult<TRoutes, TNotFound>;
  readonly stream: ReadableStream;
}

export interface HydrationWindow {
  readonly [key: string]: unknown;
}

export interface CreateHydratedRouterOptions<
  TNotFound extends AnyRoute | undefined,
> extends Omit<RouterOptions<TNotFound>, "adapter"> {
  readonly browserWindow?: HydrationWindow;
}

export type CreateHydratedRouterWindow = HydrationWindow;

export type HydratedNavigationState = RouterNavigationState;
