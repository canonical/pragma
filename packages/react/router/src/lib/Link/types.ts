import type {
  PathBuildOptions,
  RouteMap,
  RouteName,
  RouteOf,
} from "@canonical/router-core";
import type {
  AnchorHTMLAttributes,
  MouseEventHandler,
  ReactNode,
  Ref,
} from "react";

/**
 * Props accepted by `Link`.
 *
 * The route-building half of these props is core's `PathBuildOptions`
 * itself, not a structural duplicate of it: a copy would keep compiling
 * against a stale contract (accepting, say, non-serializable `search`
 * values) long after core tightened it.
 */
export type LinkProps<
  TRoutes extends RouteMap,
  TName extends RouteName<TRoutes>,
> = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  PathBuildOptions<RouteOf<TRoutes, TName>> & {
    /** Content rendered inside the generated anchor element. */
    readonly children?: ReactNode;
    /** Trigger a file download instead of client-side navigation. */
    readonly download?: AnchorHTMLAttributes<HTMLAnchorElement>["download"];
    /** Optional click handler called before router interception runs. */
    readonly onClick?: MouseEventHandler<HTMLAnchorElement>;
    /** Optional hover handler called before router warming runs. */
    readonly onMouseEnter?: MouseEventHandler<HTMLAnchorElement>;
    /** Ref forwarded to the underlying anchor element. */
    readonly ref?: Ref<HTMLAnchorElement>;
    /** The named route to navigate to. */
    readonly to: TName;
  };
