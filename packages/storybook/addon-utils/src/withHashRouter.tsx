import {
  createHashAdapter,
  createRouter,
  type RouteMap,
  route,
} from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import { type ReactNode, useState } from "react";
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
    content: () => null,
  }),
} as const;

export interface WithHashRouterOptions {
  /** Custom routes for components that depend on specific route shapes. */
  readonly routes?: RouteMap;
}

interface StoryProps {
  readonly StoryFn: StoryFunction<Renderer>;
}

/**
 * Invokes the story from inside a component, so it renders as its own fiber.
 *
 * `{StoryFn()}` placed in the provider's JSX children runs the story's `render`
 * body during the *parent's* render pass, before React descends into
 * `RouterProvider`. A `useRoute()` called directly in a story's `render` then
 * reads the context above the provider — empty — and throws "RouterProvider is
 * required to use router-react hooks." Under `<Story />` the call happens
 * inside the provider's subtree, and the story owns the hooks it declares
 * rather than appending them to the decorator's list.
 *
 * Declared at module scope, not inside the decorator: a component type
 * recreated per render would remount the story on every navigation.
 */
const Story = ({ StoryFn }: StoryProps): ReactNode => StoryFn() as ReactNode;

interface HashRouterStoryProps extends StoryProps {
  readonly routes: RouteMap;
}

/**
 * Owns the router instance for one mounted story.
 *
 * Held in state so there is one router per mount rather than one per render:
 * navigating rerenders the story, and a router rebuilt each time would drop the
 * hash subscription and reset the location the story just navigated to.
 */
const HashRouterStory = ({
  routes,
  StoryFn,
}: HashRouterStoryProps): ReactNode => {
  const [router] = useState(() =>
    createRouter(routes, { adapter: createHashAdapter() }),
  );

  return (
    <RouterProvider router={router}>
      <Story StoryFn={StoryFn} />
    </RouterProvider>
  );
};

/**
 * Storybook decorator that wraps a story in a hash-based router context
 * (`@canonical/router-react`). A hash router is used because the Storybook
 * iframe has no real server — only `location.hash` can change — so `Link`
 * navigation and active-route detection work without breaking the canvas.
 *
 * Requires the optional peer deps `@canonical/router-core` and
 * `@canonical/router-react`.
 *
 * The returned decorator's `context` parameter is optional (the story
 * function stays required), so it doubles as a plain "wrap this subtree in a
 * hash router" helper for decorators that need to render something extra
 * *inside* the provider (an `<Outlet />`, a `useRoute()` bridge) without
 * fabricating a `StoryContext`. It returns an element and calls no hooks of its
 * own, so it is also safe to invoke outside a React render — as the headless
 * probe in ds-app does. That keeps `createRouter` + `createHashAdapter` +
 * `RouterProvider` owned here instead of being hand-rolled per call site.
 *
 * @example
 * const meta = {
 *   component: SideNavigation,
 *   decorators: [withHashRouter()],
 * } satisfies Meta<typeof SideNavigation>;
 *
 * @example
 * // Composed: extra content inside the same provider.
 * const withRouter: Decorator = (Story) =>
 *   withHashRouter()(() => (
 *     <>
 *       <Story />
 *       <Outlet />
 *     </>
 *   ));
 */
export const withHashRouter =
  ({ routes = defaultRoutes }: WithHashRouterOptions = {}) =>
  (StoryFn: StoryFunction<Renderer>, _context?: StoryContext<Renderer>) => (
    <HashRouterStory routes={routes} StoryFn={StoryFn} />
  );
