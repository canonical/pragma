import { createHashRouter, route } from "@canonical/router-core";
import { RouterProvider } from "@canonical/router-react";
import type { Decorator } from "@storybook/react-vite";
import type { ReactNode } from "react";
import type { LinkComponentProps } from "../../lib/types/link.js";

/**
 * Story machinery for Tabs (decorators + the router-Link adapter). Story-only;
 * the fixtures (tab data) live in `./fixtures.ts`.
 */

/**
 * Bridges a raw-URL tab to the hash router: it points the href into the URL
 * fragment (`/overview` -> `#/overview`), so activating a tab navigates
 * client-side and stays inside Storybook rather than doing a real page load.
 * Pass as `LinkComponent` so no tab ever navigates away.
 */
export const HashLink = ({ href, ...props }: LinkComponentProps): ReactNode => (
  <a href={href ? `#${href}` : undefined} {...props} />
);

/** Catch-all routes so the hash router has somewhere to resolve to. */
const storyRoutes = {
  overview: route({ url: "/overview", component: () => null }),
  specifications: route({ url: "/specifications", component: () => null }),
  networking: route({ url: "/networking", component: () => null }),
  storage: route({ url: "/storage", component: () => null }),
  reviews: route({ url: "/reviews", component: () => null }),
} as const;

/**
 * Wraps a story in its own hash `RouterProvider` (self-contained, owns the
 * provider), so stories can call `useRoute()` and links resolve against the
 * live location without a server.
 */
export const withHashRouter: Decorator = (Story) => {
  const router = createHashRouter(storyRoutes);
  return (
    <RouterProvider router={router}>
      <Story />
    </RouterProvider>
  );
};
