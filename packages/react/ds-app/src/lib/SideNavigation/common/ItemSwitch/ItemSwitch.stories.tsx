import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withSideNavShell } from "../../../../storybook/navigation/story-utils.js";
import ItemSwitch from "./ItemSwitch.js";

const meta: Meta<typeof ItemSwitch> = {
  title: "Components/SideNavigation/ItemSwitch",
  component: ItemSwitch,
  parameters: { layout: "fullscreen" },
  decorators: [
    withSideNavShell,
    (Story) => (
      <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        <Story />
      </ul>
    ),
  ],
  args: { onCheckedChange: fn() },
};

export default meta;
type Story = StoryObj<typeof ItemSwitch>;

/** An unchecked toggle row, uncontrolled. */
export const Off: Story = {
  args: {
    children: "Dark mode",
    icon: "dark-theme",
  },
};

/** A checked toggle row, uncontrolled (via defaultChecked). */
export const On: Story = {
  args: {
    ...Off.args,
    defaultChecked: true,
  },
};

/** A disabled toggle row. */
export const Disabled: Story = {
  args: {
    ...Off.args,
    disabled: true,
  },
};
