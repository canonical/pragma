import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  HashLink,
  MockBadge,
  withSideNavShell,
} from "#storybook/navigation/story-utils.js";
import Item from "./Item.js";

const meta: Meta<typeof Item> = {
  title: "Components/SideNavigation/Item",
  component: Item,
  tags: ["autodocs"],
  // Item is presentational and renders inside a <ul>; withSideNavShell provides
  // the .ds.side-navigation context (shared row grid + surface), and the inner
  // <ul.list> gives valid list markup.
  decorators: [
    withSideNavShell,
    (Story) => (
      <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
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

/** A leaf item with a trailing slot (badge) in the end slot. */
export const WithSlot: Story = {
  args: {
    url: "/machines",
    label: "Machines",
    icon: "machines",
    slot: <MockBadge>42</MockBadge>,
  },
};

// An item with subitems renders a disclosure caret. The expand/collapse
// behaviour (and whether children open below vs. to the side) is deferred
// pending design input, so this story is commented out for now.
//
// export const WithSubitems: Story = {
//   args: {
//     key: "hardware",
//     label: "Hardware",
//     icon: "machines",
//     items: [{ url: "/machines", label: "Machines" }],
//   },
// };
