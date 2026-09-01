import type { RouteArgs, RouteMap, RouteName } from "@canonical/router-core";
import type { MouseEvent, ReactElement } from "react";
import { forwardRef } from "react";
import useRoute from "../hooks/useRoute.js";
import useRouter from "../hooks/useRouter.js";
import type { RegisteredRouteMap } from "../register.js";
import type { LinkProps } from "./types.js";

function hasModifierKey(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

/**
 * Render an anchor element that integrates with the router.
 *
 * `Link` builds the destination `href` from a typed route name plus optional
 * params, search values, and hash. Primary-button clicks are intercepted and
 * routed through `router.navigate()`, while hover warms the destination
 * route data through `router.warm()`.
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
  const location = useRoute();
  // `RouteArgs` is a one-member tuple of the build options, but it stays
  // deferred while `TName` is an unresolved type parameter, so TS cannot see
  // that the destructured props already satisfy it — `LinkProps` is what
  // enforces that, at every call site. Absent options are passed as
  // `undefined` rather than stripped: core defaults each one, so an omitted
  // key and an `undefined` key build the same URL.
  const buildArgs = [{ hash, params, replace, search }] as unknown as RouteArgs<
    TRoutes,
    TName
  >;
  const href = router.buildPath(to, ...buildArgs);
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
        router.navigate(to, ...buildArgs);
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);

        if (event.defaultPrevented) {
          return;
        }

        void router.warm(to, ...buildArgs);
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
