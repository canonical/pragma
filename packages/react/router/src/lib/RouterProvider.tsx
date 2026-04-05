import type { AnyRoute, RouteMap } from "@canonical/router-core";
import type { ReactElement } from "react";
import RouterContext from "./RouterContext.js";
import type { AnyReactRouter, RouterProviderProps } from "./types.js";

export default function RouterProvider<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
>({ children, router }: RouterProviderProps<TRoutes, TNotFound>): ReactElement {
  return (
    <RouterContext.Provider value={router as unknown as AnyReactRouter}>
      {children}
    </RouterContext.Provider>
  );
}
