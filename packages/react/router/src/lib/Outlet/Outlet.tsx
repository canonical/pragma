import type { ComponentType, ReactElement, ReactNode } from "react";
import {
  createElement,
  Suspense,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
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
  // Build ELEMENTS instead of calling `router.render()`.
  //
  // Core's `render()` INVOKES the route's component and its wrappers as
  // plain functions — `content({ params, search })`, `wrapper.component({
  // children })` — so any hooks they declare run inside THIS component's
  // hook list. Navigating between two routes whose components use different
  // numbers of hooks then throws "Rendered fewer hooks than expected",
  // because React sees Outlet's own hook count change between renders.
  //
  // `createElement` gives each component its own fiber, so its hooks belong
  // to it. Core's `render()` is left alone: it is the correct shape for a
  // non-React consumer, and this is a React-layer concern.
  let rendered: ReactNode = null;

  if (match && "route" in match && match.route.content) {
    const contentElement = createElement(
      match.route.content as ComponentType<{
        readonly params: unknown;
        readonly search: unknown;
      }>,
      { params: match.params, search: match.search },
    );

    rendered = (
      match.route.wrappers as readonly {
        readonly component: ComponentType<{ readonly children: ReactNode }>;
      }[]
    ).reduceRight<ReactNode>(
      (children, currentWrapper) =>
        createElement(currentWrapper.component, null, children),
      contentElement,
    );
  }

  return (
    <Suspense key={routeKey} fallback={fallback}>
      {rendered}
    </Suspense>
  );
}
