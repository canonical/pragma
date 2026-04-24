import { HeadProvider } from "@canonical/react-head";
import { createMemoryRouter, route } from "@canonical/router-core";
import { Outlet, RouterProvider } from "@canonical/router-react";
import type { Decorator } from "@storybook/react-vite";

const stubRoutes = {
  story: route({
    url: "/",
    content: () => null,
  }),
} as const;

/**
 * Storybook decorator that wraps stories in a router context.
 *
 * Uses a memory router at "/" so components that call `useRouter()`,
 * `useRoute()`, or render `<Link>` work inside stories.
 */
const withRouter: Decorator = (Story) => {
  const router = createMemoryRouter(stubRoutes, "/");

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
