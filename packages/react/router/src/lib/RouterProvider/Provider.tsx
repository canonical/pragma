import type { AnyRoute, RouteMap } from "@canonical/router-core";
import type { ReactElement } from "react";
import RouterContext from "./Context.js";
import type { AnyReactRouter, RouterProviderProps } from "./types.js";

/**
 * Provide a router instance to router-react hooks and components.
 *
 * Mount this once around the subtree that should be able to call hooks such as
 * `useRouter()`, `useRoute()`, or `useSearchParam()`.
 */
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
