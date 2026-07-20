import type { AnyRouteContent, AnyWrapper } from "@canonical/router-core";
import type { ComponentType, ReactElement, ReactNode } from "react";
import {
  createElement,
  Suspense,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import useRouter from "../hooks/useRouter.js";
import RouteErrorBoundary from "./RouteErrorBoundary.js";
import type { OutletProps } from "./types.js";

/**
 * Render the router's currently matched React subtree.
 *
 * `Outlet` subscribes to router state and only rerenders when the location
 * href changes — navigation-state transitions (`idle` → `loading`) do not
 * cause a rerender. The rendered content is keyed by route name so React
 * cleanly unmounts/remounts when the matched route changes.
 *
 * `Outlet` constructs elements from the matched route's `content` and
 * `wrappers` rather than invoking them as plain functions, so each receives
 * its own React fiber. Both bare component references
 * (`content: PageComponent`) and element-creating arrows
 * (`content: (props) => <Page {...props} />`) are valid `content` — an arrow
 * is itself a function component — and hooks are legal in both content and
 * wrapper components.
 *
 * Routes may declare a `fallback` (pending UI overriding the `Outlet`-level
 * `fallback` prop within the route-keyed `Suspense`) and an `errorComponent`
 * (rendered with `{ error }` behind an internal route-keyed error boundary
 * that resets when the matched route changes).
 *
 * Without a route `errorComponent`, component-level render errors propagate
 * past `Outlet`. Wrap it in a React `ErrorBoundary` to catch those. The
 * router handles data errors (fetch failures, status codes); React handles
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
  const content = (match?.route.component ?? match?.route.content) as
    | AnyRouteContent
    | undefined;

  // Mirrors core `render()`: no match or no UI slot renders null, and
  // wrappers apply only when a slot exists. `component` is preferred over
  // the deprecated `content`; Outlet renders both through the same
  // createElement path with identical `{ params, search }` props.
  let rendered: ReactNode = null;

  if (match && content) {
    const contentElement = createElement(
      content as ComponentType<{
        readonly params: unknown;
        readonly search: unknown;
      }>,
      { params: match.params, search: match.search },
    );

    rendered = (match.route.wrappers as readonly AnyWrapper[]).reduceRight(
      (children: ReactNode, currentWrapper) =>
        createElement(
          currentWrapper.component as ComponentType<{
            readonly children: ReactNode;
          }>,
          null,
          children,
        ),
      contentElement,
    );
  }

  const errorComponent = match?.route.errorComponent as
    | ComponentType<{ readonly error: unknown }>
    | undefined;

  if (errorComponent) {
    rendered = (
      <RouteErrorBoundary errorComponent={errorComponent}>
        {rendered}
      </RouteErrorBoundary>
    );
  }

  // The route-level fallback (a ReactNode, like Outlet's own prop) overrides
  // the Outlet-level default within the route-keyed Suspense.
  const routeFallback =
    match && match.route.fallback !== undefined
      ? (match.route.fallback as ReactNode)
      : fallback;

  return (
    <Suspense key={routeKey} fallback={routeFallback}>
      {rendered}
    </Suspense>
  );
}
