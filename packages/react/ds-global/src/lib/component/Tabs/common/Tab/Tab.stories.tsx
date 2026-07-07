import type { Meta, StoryObj } from "@storybook/react-vite";
import Tab from "./Tab.js";

const meta: Meta<typeof Tab> = {
  title: "components/Tabs/Tab",
  component: Tab,
  tags: ["autodocs"],
  // A Tab renders an <li>; wrap it in a <ul> so the markup is valid.
  decorators: [
    (Story) => (
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex" }}>
        <Story />
      </ul>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Tab>;

export const Default: Story = {
  args: {
    href: "/overview",
    children: "Overview",
  },
};

export const Active: Story = {
  args: {
    href: "/overview",
    active: true,
    children: "Overview",
  },
};

/** A tab with no `href` renders as inert text rather than a link. */
export const Inert: Story = {
  args: {
    children: "Coming soon",
  },
};
