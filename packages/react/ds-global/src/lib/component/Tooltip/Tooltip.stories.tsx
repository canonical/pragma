import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Tooltip.js";

const meta = {
  title: "_work_in_progress/component/Tooltip",
  component: Component,
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Lorem ipsum dolor sit amet",
    isOpen: true,
  },
};
