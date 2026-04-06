import type { ReadableStream } from "node:stream/web";
import type {
  AnyRoute,
  RouteMap,
  RouterDehydratedState,
  RouterLoadResult,
  RouterNavigationState,
  RouterOptions,
} from "@canonical/router-core";
import type { ReactNode } from "react";

/**
 * Shared types for SSR, hydration, and stream rendering.
 *
 * Component-specific types live in their own component folders (Link/types.ts,
 * Outlet/types.ts, etc.). Hook-specific types live in hooks/types.ts.
 */

/** Optional settings for `renderToStream()`. */
export interface RenderToStreamOptions {
  /** Content rendered while suspended route output resolves. */
  readonly fallback?: ReactNode;
}

/**
 * Streamed server-rendering output plus the data needed for client hydration.
 */
export interface RenderToStreamResult<
  TRoutes extends RouteMap,
  TNotFound extends AnyRoute | undefined = undefined,
> {
  /** Inline script content that assigns the dehydrated router state on `window`. */
  readonly bootstrapScriptContent: string | null;
  /** Plain JSON router state captured after the initial load. */
  readonly initialData: RouterDehydratedState<TRoutes> | null;
  /** The result returned by `router.load(url)`. */
  readonly loadResult: RouterLoadResult<TRoutes, TNotFound>;
  /** The readable stream containing the rendered React response body. */
  readonly stream: ReadableStream;
}

/** Minimal window-like object used during hydration. */
export interface HydrationWindow {
  /** Arbitrary global values, including the router's initial data payload. */
  readonly [key: string]: unknown;
}

/** Options accepted by `createHydratedRouter()`. */
export interface CreateHydratedRouterOptions<
  TNotFound extends AnyRoute | undefined,
> extends Omit<RouterOptions<TNotFound>, "adapter"> {
  /** Alternate window-like object to read initial hydration data from. */
  readonly browserWindow?: HydrationWindow;
}

/** Alias for the window-like value consumed by `createHydratedRouter()`. */
export type CreateHydratedRouterWindow = HydrationWindow;

/** Alias for the navigation state values emitted by router-react hooks. */
export type HydratedNavigationState = RouterNavigationState;
