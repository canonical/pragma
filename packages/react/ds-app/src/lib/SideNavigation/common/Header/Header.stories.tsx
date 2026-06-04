import { withBaseLayer } from "@canonical/storybook-addon-utils";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Brand } from "../../../../storybook/nav-story-utils.js";
import Header from "./Header.js";

const meta: Meta<typeof Header> = {
  title: "Components/SideNavigation/Header",
  component: Header,
  tags: ["autodocs"],
  decorators: [withBaseLayer],
  args: {
    children: <Brand />,
    onToggle: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Header>;

/** Brand at the start, collapse toggle at the end (expanded). */
export const Expanded: Story = {
  args: {
    expanded: true,
  },
};

/** Collapsed state. */
export const Collapsed: Story = {
  args: {
    expanded: false,
  },
};

/** Without a toggle handler the collapse toggle is omitted. */
export const BrandOnly: Story = {
  args: {
    onToggle: undefined,
  },
};
