import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Popover.js";

const meta = {
  title: "_work_in_progress/component/Popover",
  component: Component,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Click the trigger to open the popover. It renders closed in the docs canvas
 * so the stories do not overlap.
 */
export const Default: Story = {
  args: {
    trigger: "What's this?",
    children:
      "Ubuntu Pro gives you security patching for the full open-source stack across your estate.",
  },
  parameters: {
    // Closed by default — nothing to snapshot until it is opened.
    chromatic: { disableSnapshot: true },
  },
};

/**
 * A filter popover, as a Landscape or MAAS listing view might use — the trigger
 * summarises the current state and opens the controls.
 */
export const Filter: Story = {
  args: {
    trigger: "Filter: 3 active",
    children:
      "Status, tags, and availability zone filters would appear here, above an Apply button.",
  },
  parameters: {
    chromatic: { disableSnapshot: true },
  },
};

/**
 * The popover shown open, on its contrasted surface so it stands out from the
 * page behind it.
 */
export const Open: Story = {
  args: {
    trigger: "Release notes",
    open: true,
    children: "Ubuntu 24.04.2 LTS is now available.",
  },
};
