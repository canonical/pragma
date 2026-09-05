import type { Meta, StoryObj } from "@storybook/react-vite";
import { withSideNavShell } from "../../../../storybook/navigation/story-utils.js";
import GroupHeader from "./GroupHeader.js";

const meta: Meta<typeof GroupHeader> = {
  title: "Components/SideNavigation/GroupHeader",
  component: GroupHeader,
  parameters: { layout: "fullscreen" },
  decorators: [withSideNavShell],
};

export default meta;
type Story = StoryObj<typeof GroupHeader>;

/** The label above a SideNavigation.Group's entries. */
export const Default: Story = {
  args: {
    children: "Hardware",
  },
};
