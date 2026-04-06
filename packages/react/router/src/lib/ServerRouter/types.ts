import type { AnyRoute, RouteMap, Router } from "@canonical/router-core";
import type { ReactNode } from "react";

/** Props accepted by `ServerRouter`. */
export interface ServerRouterProps<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> {
  /** Content rendered while suspended route output resolves. */
  readonly fallback?: ReactNode;
  /** The router instance that has already been configured for the request. */
  readonly router: Router<TRoutes, TNotFound>;
}
