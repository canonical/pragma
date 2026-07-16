import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Popover.js";

/**
 * The popover content is `position: fixed`, so it does not contribute to the
 * story's flow height. Reserve a tall, centred stage — matching the Tooltip and
 * ContextualMenu stories — so the open popover has room. The `.surface` class
 * defines the `--surface-color-*` channels and the div paints itself with them
 * (surfaces consume themselves), framing the popover on a real surface.
 */
const stage: Decorator = (Story) => (
  <div
    className="surface"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      inlineSize: "100%",
      blockSize: "100%",
      minInlineSize: "min(88vw, 480px)",
      minBlockSize: "440px",
      background: "var(--surface-color-background)",
      color: "var(--surface-color-text)",
    }}
  >
    <Story />
  </div>
);

const meta = {
  title: "_work_in_progress/component/Popover",
  component: Component,
  decorators: [stage],
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
