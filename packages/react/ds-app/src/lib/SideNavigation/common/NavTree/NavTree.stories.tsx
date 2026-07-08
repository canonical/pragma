import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  flatRoot,
  maasContentRoot,
} from "../../../../storybook/navigation/fixtures.js";
import {
  navDecorators,
  withNavigationRouterProps,
  withSideNavShell,
} from "../../../../storybook/navigation/story-utils.js";
import { NavTree } from "./index.js";

const meta: Meta<typeof NavTree> = {
  title: "Components/SideNavigation/NavTree",
  component: NavTree,
  tags: ["autodocs"],
  // Render flush to the canvas origin (no Storybook padding) so the baseline
  // overlay grid aligns to the component's own box.
  parameters: { layout: "fullscreen" },
  // withNavigationRouterProps is self-contained (owns its RouterProvider), so
  // decorator order isn't load-bearing here. withSideNavShell provides the
  // .ds.side-navigation context so the shared row-grid var + surface tokens
  // resolve when the tree renders in isolation.
  decorators: [...navDecorators, withNavigationRouterProps, withSideNavShell],
};

export default meta;
type Story = StoryObj<typeof NavTree>;

/** Grouped tree: level-1 groups, each wrapping its level-2 items. */
export const Grouped: Story = {
  args: {
    root: maasContentRoot,
  },
};

/** A single unlabelled group — a flat list of items. */
export const Flat: Story = {
  args: {
    root: flatRoot,
  },
};
