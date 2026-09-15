import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CanonicalLogo } from "../../../../storybook/navigation/CanonicalLogo/index.js";
import { withSideNavShell } from "../../../../storybook/navigation/story-utils.js";
import Header from "./Header.js";

const meta: Meta<typeof Header> = {
  title: "Components/SideNavigation/Header",
  component: Header,
  // Render flush to the canvas origin (no Storybook padding) so the baseline
  // overlay grid aligns to the component's own box.
  parameters: { layout: "fullscreen" },
  // withSideNavShell provides the .ds.side-navigation context so the shared
  // row-inset vars resolve (logo aligns with item icons) + surface tokens.
  decorators: [withSideNavShell],
  args: {
    applicationName: "Canonical",
    brand: <CanonicalLogo />,
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
    expanded: true,
    onToggle: undefined,
  },
};
