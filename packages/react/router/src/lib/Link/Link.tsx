import type {
  AnyRoute,
  RouteMap,
  RouteName,
  RouteOf,
} from "@canonical/router-core";
import type { MouseEvent, ReactElement } from "react";
import { forwardRef } from "react";
import useRoute from "../hooks/useRoute.js";
import useRouter from "../hooks/useRouter.js";
import type { RegisteredRouteMap } from "../register.js";
import type { LinkBuildOptions, LinkProps } from "./types.js";

function hasModifierKey(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

function buildOptionsObject(
  options: LinkBuildOptions<AnyRoute>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined),
  );
}

/**
 * Render an anchor element that integrates with the router.
 *
 * `Link` builds the destination `href` from a typed route name plus optional
 * params, search values, and hash. Primary-button clicks are intercepted and
 * routed through `router.navigate()`, while hover prefetches the destination
 * route data through `router.prefetch()`.
 *
 * Sets `aria-current="page"` when the link target matches the current location.
 */
const Link = forwardRef(function Link<
  TRoutes extends RouteMap,
  TName extends RouteName<TRoutes> = RouteName<TRoutes>,
>(
  {
    children,
    download,
    hash,
    onClick,
    onMouseEnter,
    params,
    replace,
    search,
    target,
    to,
    ...props
  }: LinkProps<TRoutes, TName>,
  forwardedRef: LinkProps<TRoutes, TName>["ref"],
): ReactElement {
  const router = useRouter<TRoutes>();
  const location = useRoute<TRoutes>();
  const buildPath = router.buildPath as (
    name: TName,
    options?: LinkBuildOptions<RouteOf<TRoutes, TName>>,
  ) => string;
  const navigate = router.navigate as (
    name: TName,
    options?: LinkBuildOptions<RouteOf<TRoutes, TName>>,
  ) => unknown;
  const prefetch = router.prefetch as (
    name: TName,
    options?: LinkBuildOptions<RouteOf<TRoutes, TName>>,
  ) => Promise<void>;

  const buildOptions = buildOptionsObject({
    hash,
    params,
    replace,
    search,
  } as LinkBuildOptions<AnyRoute>);
  const hasOptions = Object.keys(buildOptions).length > 0;
  const href = hasOptions
    ? buildPath(to, buildOptions as LinkBuildOptions<RouteOf<TRoutes, TName>>)
    : buildPath(to);
  const isCurrent = location.pathname === href.split("?")[0].split("#")[0];

  return (
    <a
      {...props}
      aria-current={isCurrent ? "page" : undefined}
      download={download}
      href={href}
      onClick={(event) => {
        onClick?.(event);

        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          hasModifierKey(event) ||
          target === "_blank" ||
          download !== undefined
        ) {
          return;
        }

        event.preventDefault();

        if (hasOptions) {
          navigate(
            to,
            buildOptions as LinkBuildOptions<RouteOf<TRoutes, TName>>,
          );
        } else {
          navigate(to);
        }
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);

        if (event.defaultPrevented) {
          return;
        }

        if (hasOptions) {
          void prefetch(
            to,
            buildOptions as LinkBuildOptions<RouteOf<TRoutes, TName>>,
          );
        } else {
          void prefetch(to);
        }
      }}
      ref={forwardedRef}
      target={target}
    >
      {children}
    </a>
  );
}) as <
  TRoutes extends RouteMap = RegisteredRouteMap,
  TName extends RouteName<TRoutes> = RouteName<TRoutes>,
>(
  props: LinkProps<TRoutes, TName>,
) => ReactElement;

export default Link;
