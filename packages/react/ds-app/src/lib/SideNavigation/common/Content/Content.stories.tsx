import type { Meta, StoryObj } from "@storybook/react-vite";
import { maasContentRoot } from "#storybook/navigation/fixtures.js";
import {
  navDecorators,
  withNavigationRouterProps,
  withSideNavShell,
} from "#storybook/navigation/story-utils.js";
import Content from "./Content.js";

const meta: Meta<typeof Content> = {
  title: "Components/SideNavigation/Content",
  component: Content,
  tags: ["autodocs"],
  // withNavigationRouterProps is self-contained (owns its RouterProvider), so
  // decorator order isn't load-bearing here. withSideNavShell provides the
  // .ds.side-navigation context so the shared row-grid var + surface tokens
  // resolve when Content renders in isolation.
  decorators: [...navDecorators, withNavigationRouterProps, withSideNavShell],
};

export default meta;
type Story = StoryObj<typeof Content>;

/** Renders the main navigation tree from a WD405 root. */
export const Default: Story = {
  args: {
    root: maasContentRoot,
  },
};
