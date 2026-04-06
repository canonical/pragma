import type {
  AnyRoute,
  HasParams,
  ParamsOf,
  RouteMap,
  RouteName,
  RouteOf,
  SearchOf,
} from "@canonical/router-core";
import type {
  AnchorHTMLAttributes,
  MouseEventHandler,
  ReactNode,
  Ref,
} from "react";

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
