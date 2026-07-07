import { createHashRouter, route } from "@canonical/router-core";
import { RouterProvider, useRoute } from "@canonical/router-react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import type { LinkComponentProps } from "../../types/link.js";
import Tabs from "./Tabs.js";

const meta: Meta<typeof Tabs> = {
  title: "components/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  args: {
    "aria-label": "Sections",
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

/**
 * Default: plain `<a>` links. Each tab points at a URL; the consumer marks the
 * active one.
 */
export const Default: Story = {
  render: (args) => (
    <Tabs {...args}>
      <Tabs.Tab href="/overview" active>
        Overview
      </Tabs.Tab>
      <Tabs.Tab href="/specifications">Specifications</Tabs.Tab>
      <Tabs.Tab href="/reviews">Reviews</Tabs.Tab>
    </Tabs>
  ),
};

/**
 * A tab without an `href` renders as inert text rather than a link.
 */
export const WithInertTab: Story = {
  render: (args) => (
    <Tabs {...args}>
      <Tabs.Tab href="/overview" active>
        Overview
      </Tabs.Tab>
      <Tabs.Tab href="/specifications">Specifications</Tabs.Tab>
      <Tabs.Tab>Coming soon</Tabs.Tab>
    </Tabs>
  ),
};

/**
 * Overflow: when the tabs exceed the container width the strip scrolls
 * horizontally.
 */
export const Overflow: Story = {
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "20rem" }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <Tabs {...args}>
      <Tabs.Tab href="/overview" active>
        Overview
      </Tabs.Tab>
      <Tabs.Tab href="/specifications">Specifications</Tabs.Tab>
      <Tabs.Tab href="/networking">Networking</Tabs.Tab>
      <Tabs.Tab href="/storage">Storage</Tabs.Tab>
      <Tabs.Tab href="/reviews">Reviews</Tabs.Tab>
    </Tabs>
  ),
};

/**
 * Router integration via `LinkComponent`.
 *
 * Tabs is router-agnostic — it only knows `LinkComponentProps`. This story
 * bridges its tabs to a lightweight **hash router** (`createHashRouter` reads
 * `location.hash`, so an href into the fragment navigates client-side with no
 * server). The active tab is derived from the live location, so selecting a tab
 * updates the URL and re-marks the active one — no server round trip.
 */
const routerRoutes = {
  overview: route({ url: "/overview", content: () => null }),
  specifications: route({ url: "/specifications", content: () => null }),
  reviews: route({ url: "/reviews", content: () => null }),
} as const;

/** Bridges a raw-URL tab to the hash router: an href into the fragment. */
const HashLink = ({ href, ...props }: LinkComponentProps): ReactNode => (
  <a href={href ? `#${href}` : undefined} {...props} />
);

const RouterTabs = ({ "aria-label": ariaLabel }: { "aria-label": string }) => {
  const { pathname } = useRoute();
  return (
    <Tabs aria-label={ariaLabel}>
      <Tabs.Tab
        href="/overview"
        active={pathname === "/overview"}
        LinkComponent={HashLink}
      >
        Overview
      </Tabs.Tab>
      <Tabs.Tab
        href="/specifications"
        active={pathname === "/specifications"}
        LinkComponent={HashLink}
      >
        Specifications
      </Tabs.Tab>
      <Tabs.Tab
        href="/reviews"
        active={pathname === "/reviews"}
        LinkComponent={HashLink}
      >
        Reviews
      </Tabs.Tab>
    </Tabs>
  );
};

export const WithRouter: Story = {
  render: (args) => {
    const router = createHashRouter(routerRoutes);
    return (
      <RouterProvider router={router}>
        <RouterTabs aria-label={args["aria-label"]} />
      </RouterProvider>
    );
  },
};
