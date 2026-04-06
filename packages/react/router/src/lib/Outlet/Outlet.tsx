import type { ReactElement, ReactNode } from "react";
import { Suspense, useCallback, useRef, useSyncExternalStore } from "react";
import useRouter from "../hooks/useRouter.js";
import type { OutletProps } from "./types.js";

/**
 * Render the router's currently matched React subtree.
 *
 * `Outlet` subscribes to router state and only rerenders when the location
 * href changes — navigation-state transitions (`idle` → `loading`) do not
 * cause a rerender. The rendered content is keyed by route name so React
 * cleanly unmounts/remounts when the matched route changes.
 *
 * Component-level render errors (e.g. a route's error component itself throws)
 * propagate past `Outlet`. Wrap it in a React `ErrorBoundary` to catch those.
 * The router handles data errors (fetch failures, status codes); React handles
 * render errors.
 */
export default function Outlet({ fallback = null }: OutletProps): ReactElement {
  const router = useRouter();
  const hrefRef = useRef(router.getState().location.href);
  const matchRef = useRef(router.getState().match);
  const versionRef = useRef(0);

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      router.subscribe((snapshot) => {
        const nextHref = snapshot.href;
        const nextMatch = snapshot.match;

        if (nextHref !== hrefRef.current || nextMatch !== matchRef.current) {
          hrefRef.current = nextHref;
          matchRef.current = nextMatch;
          versionRef.current += 1;
          onStoreChange();
        }
      }),
    [router],
  );

  useSyncExternalStore(
    subscribe,
    () => versionRef.current,
    () => versionRef.current,
  );

  const match = router.getState().match;
  const routeKey =
    match && "name" in match && typeof match.name === "string"
      ? match.name
      : undefined;
  const rendered = router.render() as ReactNode;

  return (
    <Suspense key={routeKey} fallback={fallback}>
      {rendered}
    </Suspense>
  );
}
