import type { Meta, StoryObj } from "@storybook/react-vite";
import { SidePanelFrame } from "../../../../storybook/side-panel/story-utils.js";
import SidePanel from "../../SidePanel.js";
import Content from "./Content.js";

const meta: Meta<typeof Content> = {
  title: "Components/SidePanel/Content",
  component: Content,
  // The body renders in a real panel, in the text column it would occupy in
  // one. Header-less, so the panel is named with `aria-label` instead.
  render: (args) => (
    <SidePanelFrame blockSize="12rem">
      <SidePanel open={true} onOpenChange={() => {}} aria-label="Panel body">
        <Content {...args} />
      </SidePanel>
    </SidePanelFrame>
  ),
};

export default meta;
type Story = StoryObj<typeof Content>;

/** The panel body: prose, forms, whatever the task needs. */
export const Default: Story = {
  args: {
    children: <p>The application behind this panel is still usable.</p>,
  },
};

/**
 * Content taller than the panel scrolls the panel itself: the dialog is the
 * scroll container, and this region simply grows with its children.
 */
export const Tall: Story = {
  args: {
    children: Array.from(
      { length: 10 },
      (_, index) => `paragraph-${index + 1}`,
    ).map((key, index) => (
      <p key={key}>Paragraph {index + 1} of filler content.</p>
    )),
  },
};
