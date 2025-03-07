import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button/index.js";
import { withTooltip } from "./index.js";

const Component = withTooltip(Button, "Tooltip message");

const meta = {
  title: "Tooltip/withTooltip",
  component: Component,
  // Add padding to all tooltips to allow their entire contents to be visible
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "dark",
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Tooltip HOC",
  },
};
