import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  HashLink,
  MockBadge,
  withSideNavShell,
} from "../../../../storybook/navigation/story-utils.js";
import Item from "./Item.js";

const meta: Meta<typeof Item> = {
  title: "Components/SideNavigation/Item",
  component: Item,
  // Render flush to the canvas origin (no Storybook padding) so the baseline
  // overlay grid aligns to the component's own box.
  parameters: { layout: "fullscreen" },
  // Item is presentational and renders inside a <ul>; withSideNavShell provides
  // the .ds.side-navigation context (shared row insets + surface), and the
  // inner <ul.list> gives valid list markup.
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

/** A link item with a leading icon (icon ↔ label baseline alignment). */
export const WithIcon: Story = {
  args: {
    url: "/machines",
    label: "Machines",
    icon: "machines",
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

/** A non-navigable item (no `url`) — a plain label, e.g. a display-only name. */
export const NonNavigable: Story = {
  args: {
    key: "current-user",
    label: "Ada Lovelace",
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
