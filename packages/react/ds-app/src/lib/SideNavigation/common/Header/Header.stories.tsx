import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  Brand,
  withSideNavShell,
} from "../../../../storybook/navigation/story-utils.js";
import Header from "./Header.js";

const meta: Meta<typeof Header> = {
  title: "Components/SideNavigation/Header",
  component: Header,
  // Render flush to the canvas origin (no Storybook padding) so the baseline
  // overlay grid aligns to the component's own box.
  parameters: { layout: "fullscreen" },
  // withSideNavShell provides the .ds.side-navigation context so the shared
  // row-grid var resolves (logo aligns with item icons) + surface tokens.
  decorators: [withSideNavShell],
  args: {
    brand: <Brand />,
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
