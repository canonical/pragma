import type { AnyRoute, RouteMap } from "@canonical/router-core";
import type { ReactElement } from "react";
import Outlet from "./Outlet.js";
import RouterProvider from "./RouterProvider.js";
import type { ServerRouterProps } from "./types.js";

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
