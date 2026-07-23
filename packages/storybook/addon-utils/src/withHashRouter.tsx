import { createHashRouter, type RouteMap, route } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import type {
  Renderer,
  StoryContext,
  PartialStoryFn as StoryFunction,
} from "storybook/internal/types";

/**
 * Minimal catch-all route so the router has somewhere to resolve to. Components
 * under test (e.g. SideNavigation) only need a router *context* for their
 * `Link`s to build URLs and reflect the active hash — they don't render routed
 * page content, so a single root route suffices.
 */
const defaultRoutes = {
  story: route({
    url: "/",
    component: () => null,
  }),
} as const;

export interface WithHashRouterOptions {
  /** Custom routes for components that depend on specific route shapes. */
  readonly routes?: RouteMap;
}

/**
 * Storybook decorator that wraps a story in a hash-based router context
 * (`@canonical/router-react`). A hash router is used because the Storybook
 * iframe has no real server — only `location.hash` can change — so `Link`
 * navigation and active-route detection work without breaking the canvas.
 *
 * Requires the optional peer deps `@canonical/router-core` and
 * `@canonical/router-react`.
 *
 * @example
 * const meta = {
 *   component: SideNavigation,
 *   decorators: [withHashRouter()],
 * } satisfies Meta<typeof SideNavigation>;
 */
export const withHashRouter =
  ({ routes = defaultRoutes }: WithHashRouterOptions = {}) =>
  (StoryFn: StoryFunction<Renderer>, _context: StoryContext<Renderer>) => {
    const router = createHashRouter(routes);
    return <RouterProvider router={router}>{StoryFn()}</RouterProvider>;
  };
