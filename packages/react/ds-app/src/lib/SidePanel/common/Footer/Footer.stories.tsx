import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import SidePanel from "../../SidePanel.js";
import type { SidePanelHandle } from "../../types.js";
import Footer from "./Footer.js";

/*
  The story source shown in docs: the footer renders in a real panel, and the
  callback ref opens it on mount because a story is a static fixture — in an
  application the open comes from an event handler instead.
*/
const openOnMount = `
  ref={(handle: SidePanelHandle | null) => {
    handle?.open();
  }}
`;

const meta: Meta<typeof Footer> = {
  title: "Components/SidePanel/Footer",
  component: Footer,
  parameters: {
    docs: {
      story: {
        // The footer's panel is `position: fixed`: inside its own iframe it
        // fills the frame and stays contained in the docs page.
        inline: false,
        iframeHeight: "12rem",
      },
    },
  },
  // The footer renders in a real panel, where its hairline is inset by the
  // panel's gutter. Header-less, so the panel is named with `aria-label`.
  render: (args) => (
    <SidePanel
      aria-label="Panel footer"
      ref={(handle: SidePanelHandle | null) => {
        handle?.open();
      }}
    >
      <Footer {...args} />
    </SidePanel>
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
  parameters: {
    docs: {
      source: {
        code: `
<SidePanel
  aria-label="Panel footer"${openOnMount}
>
  <SidePanel.Footer>
    <Button>Cancel</Button>
    <Button importance="primary" anticipation="constructive">
      Save
    </Button>
  </SidePanel.Footer>
</SidePanel>
        `,
      },
    },
  },
};

/** A single action sits at the end edge like any other. */
export const SingleAction: Story = {
  args: {
    children: <Button onClick={fn()}>Close</Button>,
  },
  parameters: {
    docs: {
      source: {
        code: `
<SidePanel
  aria-label="Panel footer"${openOnMount}
>
  <SidePanel.Footer>
    <Button>Close</Button>
  </SidePanel.Footer>
</SidePanel>
        `,
      },
    },
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
  parameters: {
    docs: {
      source: {
        code: `
<SidePanel
  aria-label="Panel footer"${openOnMount}
>
  <SidePanel.Footer>
    <Button>Reset to defaults</Button>
    <Button>Save as draft</Button>
    <Button>Cancel</Button>
    <Button importance="primary" anticipation="constructive">
      Save and apply
    </Button>
  </SidePanel.Footer>
</SidePanel>
        `,
      },
    },
  },
};
