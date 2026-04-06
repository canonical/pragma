import type { AnyRoute, RouteMap } from "@canonical/router-core";
import type { ReactElement } from "react";
import Outlet from "../Outlet/Outlet.js";
import RouterProvider from "../RouterProvider/Provider.js";
import type { ServerRouterProps } from "./types.js";

/**
 * Render a fully configured server-side router subtree.
 *
 * This component combines `RouterProvider` and `Outlet` so server rendering can
 * mount the matched route tree in one step while still supporting an outlet
 * fallback.
 */
export default function ServerRouter<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
>({ fallback, router }: ServerRouterProps<TRoutes, TNotFound>): ReactElement {
  return (
    <RouterProvider router={router}>
      <Outlet fallback={fallback} />
    </RouterProvider>
  );
}
