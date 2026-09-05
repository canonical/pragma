import type { Meta, StoryObj } from "@storybook/react-vite";
import { withSideNavShell } from "../../../../storybook/navigation/story-utils.js";
import Separator from "./Separator.js";

const meta: Meta<typeof Separator> = {
  title: "Components/SideNavigation/Separator",
  component: Separator,
  parameters: { layout: "fullscreen" },
  // withSideNavShell provides the .ds.side-navigation background so the
  // separator's border colour reads against a realistic surface.
  decorators: [withSideNavShell],
};

export default meta;
type Story = StoryObj<typeof Separator>;

/** A plain rule between content sections. */
export const Default: Story = {};
