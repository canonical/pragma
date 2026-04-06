import type { AnyRoute, RouteMap, Router } from "@canonical/router-core";
import { useContext } from "react";
import RouterContext from "../RouterProvider/Context.js";
import type { RegisteredNotFound, RegisteredRouteMap } from "../register.js";

/**
 * Return the router instance from the nearest `RouterProvider`.
 *
 * This is the low-level escape hatch used by the other hooks and components in
 * this package. It throws when called outside a `RouterProvider` so consumers
 * fail fast instead of silently reading a missing router.
 */
export default function useRouter<
  TRoutes extends RouteMap = RegisteredRouteMap,
  TNotFound extends AnyRoute | undefined = RegisteredNotFound,
>(): Router<TRoutes, TNotFound> {
  const router = useContext(RouterContext);

  if (!router) {
    throw new Error("RouterProvider is required to use router-react hooks.");
  }

  return router as unknown as Router<TRoutes, TNotFound>;
}
