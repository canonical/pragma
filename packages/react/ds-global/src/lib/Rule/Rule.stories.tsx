import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Rule.js";

const meta = {
  title: "Experimental/Rule",
  component: Component,
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
