import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Popover.js";

const meta = {
  title: "_work_in_progress/component/Popover",
  component: Component,
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    trigger: "Open popover",
    children: "This is the popover content.",
  },
  // Closed by default — nothing to snapshot until it is opened.
  parameters: {
    chromatic: { disableSnapshot: true },
  },
};

export const Open: Story = {
  args: {
    trigger: "Open popover",
    open: true,
    children: "This popover starts open.",
  },
};
