import { withBaseLayer } from "@canonical/storybook-addon-utils";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import CollapseToggle from "./CollapseToggle.js";

const meta: Meta<typeof CollapseToggle> = {
  title: "Components/SideNavigation/CollapseToggle",
  component: CollapseToggle,
  tags: ["autodocs"],
  decorators: [withBaseLayer],
  args: { onClick: fn() },
};

export default meta;
type Story = StoryObj<typeof CollapseToggle>;

/** Expanded state — the toggle offers to collapse the navigation. */
export const Expanded: Story = {
  args: {
    expanded: true,
  },
};

/** Collapsed state — the toggle offers to expand the navigation. */
export const Collapsed: Story = {
  args: {
    expanded: false,
  },
};
