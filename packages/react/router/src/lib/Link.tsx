import type {
  AnyRoute,
  RouteMap,
  RouteName,
  RouteOf,
} from "@canonical/router-core";
import type { MouseEvent, ReactElement } from "react";
import { forwardRef, useMemo } from "react";
import type { LinkBuildOptions, LinkProps } from "./types.js";
import useRouter from "./useRouter.js";

function hasModifierKey(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

function isBuildOptionsEmpty(options: Record<string, unknown>): boolean {
  return Object.keys(options).length === 0;
}

function buildOptionsObject(
  options: LinkBuildOptions<AnyRoute>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined),
  );
}

const Link = forwardRef(function Link<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
  TName extends RouteName<TRoutes> = RouteName<TRoutes>,
>(
  {
    children,
    hash,
    onClick,
    onMouseEnter,
    params,
    search,
    target,
    to,
    ...props
  }: LinkProps<TRoutes, TName>,
  forwardedRef: LinkProps<TRoutes, TName>["ref"],
): ReactElement {
  const router = useRouter<TRoutes, TNotFound>();
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
  const buildOptions = useMemo(() => {
    return buildOptionsObject({
      hash,
      params,
      search,
    } as LinkBuildOptions<AnyRoute>);
  }, [hash, params, search]);
  const href = isBuildOptionsEmpty(buildOptions)
    ? buildPath(to)
    : buildPath(to, buildOptions as LinkBuildOptions<RouteOf<TRoutes, TName>>);

  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);

        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          hasModifierKey(event) ||
          target === "_blank"
        ) {
          return;
        }

        event.preventDefault();

        if (isBuildOptionsEmpty(buildOptions)) {
          navigate(to);
          return;
        }

        navigate(to, buildOptions as LinkBuildOptions<RouteOf<TRoutes, TName>>);
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);

        if (event.defaultPrevented) {
          return;
        }

        if (isBuildOptionsEmpty(buildOptions)) {
          void prefetch(to);
          return;
        }

        void prefetch(
          to,
          buildOptions as LinkBuildOptions<RouteOf<TRoutes, TName>>,
        );
      }}
      ref={forwardedRef}
      target={target}
    >
      {children}
    </a>
  );
}) as <
  TRoutes extends RouteMap,
  TName extends RouteName<TRoutes> = RouteName<TRoutes>,
>(
  props: LinkProps<TRoutes, TName>,
) => ReactElement;

export default Link;
