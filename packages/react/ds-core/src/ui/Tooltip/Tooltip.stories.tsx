import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tooltip } from "./index.js";
import Component from "./Tooltip.js";

const meta = {
  title: "Tooltip/Internals/Tooltip",
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
