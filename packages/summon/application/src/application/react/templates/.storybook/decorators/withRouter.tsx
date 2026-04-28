import { HeadProvider } from "@canonical/react-head";
import {
  createHashRouter,
  route,
  type RouteMap,
} from "@canonical/router-core";
import { Outlet, RouterProvider } from "@canonical/router-react";
import type { ElementType } from "react";

const defaultRoutes = {
  story: route({
    url: "/",
    content: () => null,
  }),
} as const;

interface WithRouterOptions {
  readonly routes?: RouteMap;
}

/**
 * Storybook decorator that wraps stories in a router context.
 *
 * Uses a hash router so visual tests can navigate without a real server.
 * Pass custom routes to test components that depend on specific route shapes.
 *
 * @example
 * ```ts
 * decorators: [withRouter()]
 * decorators: [withRouter({ routes: appRoutes })]
 * ```
 */
const withRouter =
  ({ routes = defaultRoutes }: WithRouterOptions = {}) =>
  (Story: ElementType) => {
    const router = createHashRouter(routes);

    return (
      <HeadProvider>
        <RouterProvider router={router}>
          <Story />
          <Outlet />
        </RouterProvider>
      </HeadProvider>
    );
  };

export default withRouter;
