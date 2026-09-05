import type { Meta, StoryObj } from "@storybook/react-vite";
import { withSideNavShell } from "../../../../storybook/navigation/story-utils.js";
import Item from "../Item/Item.js";
import Group from "./Group.js";

const meta: Meta<typeof Group> = {
  title: "Components/SideNavigation/Group",
  component: Group,
  parameters: { layout: "fullscreen" },
  decorators: [withSideNavShell],
};

export default meta;
type Story = StoryObj<typeof Group>;

/** A labelled group of items. */
export const Labelled: Story = {
  args: {
    label: "Hardware",
    children: (
      <>
        <Item url="/machines" label="Machines" icon="machines" />
        <Item url="/devices" label="Devices" icon="units" />
      </>
    ),
  },
};

/** An unlabelled group — no header rendered. */
export const Unlabelled: Story = {
  args: {
    children: (
      <>
        <Item url="/one" label="One" />
        <Item url="/two" label="Two" />
      </>
    ),
  },
};
