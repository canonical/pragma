import type { Meta, StoryFn, StoryObj } from "@storybook/react";

import { Button } from "../Button/index.js";
import { withTooltip } from "./index.js";

type TooltipType = ReturnType<typeof withTooltip>;

const meta = {
  title: "Tooltip/withTooltip",
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "dark",
    },
  },
  tags: ["autodocs"],
} satisfies Meta<TooltipType>;

export default meta;
type Story = StoryObj<TooltipType>;

export const Default: StoryFn = () => {
  const TooltippedButton = withTooltip(Button, <span>Tooltip content</span>);

  return <TooltippedButton label="Hover me" />;
};

Default.storyName = "Default";
