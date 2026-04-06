import type { AnyRoute, RouteMap, Router } from "@canonical/router-core";
import type { ReactNode } from "react";

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
