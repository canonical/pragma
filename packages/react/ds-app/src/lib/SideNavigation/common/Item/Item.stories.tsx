import { withBaseLayer } from "@canonical/storybook-addon-utils";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HashLink } from "#storybook/navigation/story-utils.js";
import Item from "./Item.js";

const meta: Meta<typeof Item> = {
  title: "Components/SideNavigation/Item",
  component: Item,
  tags: ["autodocs"],
  // Item is presentational — it renders inside a <ul>; wrap for valid markup.
  decorators: [
    withBaseLayer,
    (Story) => (
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        <Story />
      </ul>
    ),
  ],
  args: {
    LinkComponent: HashLink,
  },
};

export default meta;
type Story = StoryObj<typeof Item>;

/** A navigable link item. */
export const Link: Story = {
  args: {
    url: "/machines",
    label: "Machines",
  },
};

/** The active (current) item. */
export const Active: Story = {
  args: {
    url: "/machines",
    label: "Machines",
    active: true,
  },
};

/** A disabled item. */
export const Disabled: Story = {
  args: {
    url: "/networking",
    label: "Networking",
    disabled: true,
  },
};

/** A grouping label (no url). */
export const GroupLabel: Story = {
  args: {
    key: "hardware",
    label: "Hardware",
  },
};
