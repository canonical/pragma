import type { Meta, StoryObj } from "@storybook/react";
import Component from "./ProgressBar.js";

const meta = {
  title: "UI/shared/ProgressBar",
  component: Component,
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    percentage: 42,
  },
};
