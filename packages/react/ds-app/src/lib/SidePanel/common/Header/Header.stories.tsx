import type { Meta, StoryObj } from "@storybook/react-vite";
import { SidePanelFrame } from "../../../../storybook/side-panel/story-utils.js";
import SidePanel from "../../SidePanel.js";
import Header from "./Header.js";

const meta: Meta<typeof Header> = {
  title: "Components/SidePanel/Header",
  component: Header,
  args: {
    children: "Panel title",
  },
  // The header renders in a real panel — its close button is wired through the
  // real panel context (dismissal goes nowhere in a story) and it sits in the
  // panel's own geometry. No scaffolding around it.
  render: (args) => (
    <SidePanelFrame blockSize="12rem">
      <SidePanel open={true} onOpenChange={() => {}}>
        <Header {...args} />
      </SidePanel>
    </SidePanelFrame>
  ),
};

export default meta;
type Story = StoryObj<typeof Header>;

/** Heading at the start, close button at the end. */
export const Default: Story = {};

/** A panel dismissed only from its footer omits the close button. */
export const NotDismissible: Story = {
  args: {
    dismissible: false,
  },
};

/** The close button's accessible name follows the panel's subject. */
export const CustomDismissLabel: Story = {
  args: {
    children: "Filters",
    dismissLabel: "Dismiss filters",
  },
};

/** A long title wraps rather than pushing the close button out of reach. */
export const LongTitle: Story = {
  args: {
    children:
      "A panel title long enough to need more than one line of the panel's width",
  },
};
