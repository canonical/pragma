import type { Meta, StoryFn } from "@storybook/react-vite";

import { Button } from "../Button/index.js";
import { withTooltip } from "./index.js";

type TooltipType = ReturnType<typeof withTooltip>;

const meta = {
  title: "_work_in_progress/component/Tooltip/withTooltip",
  parameters: {
    layout: "centered",
  },
  globals: {
    backgrounds: {
      value: "dark",
    },
  },
  // No `autodocs` tag: the docs page is supplied by withTooltip.mdx
  // (`<Meta of={Stories} />`). Having both creates two docs pages for the same
  // component, which Storybook refuses to index.
} satisfies Meta<TooltipType>;

export default meta;

export const Default: StoryFn = () => {
  const TooltippedButton = withTooltip(Button, <span>Tooltip content</span>);

  return <TooltippedButton>Hover me</TooltippedButton>;
};

Default.storyName = "Default";
