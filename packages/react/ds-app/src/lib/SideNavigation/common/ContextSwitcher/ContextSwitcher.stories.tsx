import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withSideNavShell } from "../../../../storybook/navigation/story-utils.js";
import ContextSwitcher from "./ContextSwitcher.js";
import type { ContextSwitcherItem } from "./types.js";

const contexts: ContextSwitcherItem[] = [
  { key: "acme", name: "Acme Corp" },
  {
    key: "globex",
    name: "Globex Corporation",
    description: "Secondary account",
  },
  { key: "initech", name: "Initech", badge: <span>2</span> },
];

const meta: Meta<typeof ContextSwitcher> = {
  title: "Components/SideNavigation/ContextSwitcher",
  component: ContextSwitcher,
  parameters: { layout: "fullscreen" },
  decorators: [withSideNavShell],
  args: {
    currentContext: contexts[0],
    contexts,
    onContextChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ContextSwitcher>;

/** Closed by default — activate the trigger to reveal the context list. */
export const Default: Story = {};

/** With a "create context" action at the bottom of the list. */
export const WithCreateContext: Story = {
  args: {
    onCreateContext: fn(),
  },
};
