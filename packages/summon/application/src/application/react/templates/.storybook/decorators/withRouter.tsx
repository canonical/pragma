import { HeadProvider } from "@canonical/react-head";
import type { RouteMap } from "@canonical/router-core";
import { Outlet } from "@canonical/router-react";
import { withHashRouter } from "@canonical/storybook-addon-utils";
import type { ElementType } from "react";

interface WithRouterOptions {
  readonly routes?: RouteMap;
}

/**
 * Storybook decorator that wraps stories in a router context.
 *
 * Uses a hash router so visual tests can navigate without a real server.
 * Pass custom routes to test components that depend on specific route shapes.
 *
 * The router itself (`createRouter` + hash adapter + `RouterProvider`) comes
 * from `@canonical/storybook-addon-utils`, so there is exactly one copy of that
 * wiring — and one hash listener — across the design system and this app. This
 * decorator only adds what is app-specific: the head provider, and the
 * `<Outlet />` that renders matched route content next to the story.
 *
 * @example
 * ```ts
 * decorators: [withRouter()]
 * decorators: [withRouter({ routes: appRoutes })]
 * ```
 */
const withRouter =
  ({ routes }: WithRouterOptions = {}) =>
  (Story: ElementType) => (
    <HeadProvider>
      {withHashRouter({ routes })(() => (
        <>
          <Story />
          <Outlet />
        </>
      ))}
    </HeadProvider>
  );

export default withRouter;
