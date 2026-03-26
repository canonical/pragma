import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Announcement.js";

const meta = {
  title: "Experimental/Announcement",
  component: Component,
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "This is an announcement message.",
  },
};
