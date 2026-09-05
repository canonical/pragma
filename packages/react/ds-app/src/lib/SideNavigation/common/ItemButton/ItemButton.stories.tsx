import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withSideNavShell } from "../../../../storybook/navigation/story-utils.js";
import ItemButton from "./ItemButton.js";

const meta: Meta<typeof ItemButton> = {
  title: "Components/SideNavigation/ItemButton",
  component: ItemButton,
  parameters: { layout: "fullscreen" },
  decorators: [
    withSideNavShell,
    (Story) => (
      <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        <Story />
      </ul>
    ),
  ],
  args: { onClick: fn() },
};

export default meta;
type Story = StoryObj<typeof ItemButton>;

/** An action row — e.g. "Log out". */
export const Default: Story = {
  args: {
    label: "Log out",
    icon: "log-out",
  },
};

/** A disabled action row. */
export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
  },
};

/** An action row with a trailing badge. */
export const WithSlot: Story = {
  args: {
    label: "Notifications",
    icon: "notifications",
    slot: <span>3</span>,
  },
};
