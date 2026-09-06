import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { SidePanelFrame } from "../../../../storybook/side-panel/story-utils.js";
import SidePanel from "../../SidePanel.js";
import Footer from "./Footer.js";

const meta: Meta<typeof Footer> = {
  title: "Components/SidePanel/Footer",
  component: Footer,
  // The footer renders in a real panel, where its hairline is inset by the
  // panel's gutter. Header-less, so the panel is named with `aria-label`.
  render: (args) => (
    <SidePanelFrame blockSize="12rem">
      <SidePanel open={true} onOpenChange={() => {}} aria-label="Panel footer">
        <Footer {...args} />
      </SidePanel>
    </SidePanelFrame>
  ),
};

export default meta;
type Story = StoryObj<typeof Footer>;

/**
 * Actions align to the end edge. Only the confirming action is
 * `constructive`: the modifier means "this creates or confirms", so a green
 * Cancel would misread.
 */
export const Default: Story = {
  args: {
    children: (
      <>
        <Button onClick={fn()}>Cancel</Button>
        <Button importance="primary" anticipation="constructive" onClick={fn()}>
          Save
        </Button>
      </>
    ),
  },
};

/** A single action sits at the end edge like any other. */
export const SingleAction: Story = {
  args: {
    children: <Button onClick={fn()}>Close</Button>,
  },
};

/** More actions than fit on one line wrap rather than overflow. */
export const Wrapping: Story = {
  args: {
    children: (
      <>
        <Button onClick={fn()}>Reset to defaults</Button>
        <Button onClick={fn()}>Save as draft</Button>
        <Button onClick={fn()}>Cancel</Button>
        <Button importance="primary" anticipation="constructive" onClick={fn()}>
          Save and apply
        </Button>
      </>
    ),
  },
};
