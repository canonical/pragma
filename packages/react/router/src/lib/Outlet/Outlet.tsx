import type { ReactElement, ReactNode } from "react";
import { Suspense, useSyncExternalStore } from "react";
import useRouter from "../hooks/useRouter.js";
import type { OutletProps } from "./types.js";

/**
 * Render the router's currently matched React subtree.
 *
 * `Outlet` subscribes to router state so it can rerender when navigation
 * commits, and wraps the rendered result in a `Suspense` boundary so a route
 * fallback can be displayed while async content resolves.
 */
export default function Outlet({ fallback = null }: OutletProps): ReactElement {
  const router = useRouter();

  useSyncExternalStore(router.subscribe, router.getState, router.getState);
  const rendered = router.render() as ReactNode;

  return <Suspense fallback={fallback}>{rendered}</Suspense>;
}
