import type { AnyRoute, RouteMap, Router } from "@canonical/router-core";
import { useContext } from "react";
import RouterContext from "./RouterContext.js";

export default function useRouter<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
>(): Router<TRoutes, TNotFound> {
  const router = useContext(RouterContext);

  if (!router) {
    throw new Error("RouterProvider is required to use router-react hooks.");
  }

  return router as unknown as Router<TRoutes, TNotFound>;
}
