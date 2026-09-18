import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { lxdProjectContexts } from "../../../../storybook/navigation/fixtures.js";
import { withSideNavShell } from "../../../../storybook/navigation/story-utils.js";
import ContextSwitcher from "./ContextSwitcher.js";

const meta: Meta<typeof ContextSwitcher> = {
  title: "Components/SideNavigation/ContextSwitcher",
  component: ContextSwitcher,
  parameters: { layout: "fullscreen" },
  decorators: [withSideNavShell],
  args: {
    currentContext: lxdProjectContexts[0],
    contexts: lxdProjectContexts,
    onContextChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ContextSwitcher>;

/** Closed by default — activate the trigger to reveal the context list. */
export const Default: Story = {};

/**
 * With its own caption above the dropdown field — an intrinsic part of the
 * component in the Figma source (its own `group-heading` sub-component,
 * node `657:39353`), not something a consumer composes separately above it.
 */
export const WithTitle: Story = {
  args: {
    title: "Context",
  },
};

/** With a "create context" action at the bottom of the list. */
export const WithCreateContext: Story = {
  args: {
    onCreateContext: fn(),
  },
};
