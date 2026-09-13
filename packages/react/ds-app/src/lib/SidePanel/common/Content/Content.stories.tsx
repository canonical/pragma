import type { Meta, StoryObj } from "@storybook/react-vite";
import SidePanel from "../../SidePanel.js";
import type { SidePanelHandle } from "../../types.js";
import Content from "./Content.js";

/*
  The story source shown in docs: the body renders in a real panel, and the
  callback ref opens it on mount because a story is a static fixture — in an
  application the open comes from an event handler instead.
*/
const openOnMount = `
  ref={(handle: SidePanelHandle | null) => {
    handle?.open();
  }}
`;

const meta: Meta<typeof Content> = {
  title: "Components/SidePanel/Content",
  component: Content,
  parameters: {
    docs: {
      story: {
        // The body's panel is `position: fixed`: inside its own iframe it
        // fills the frame and stays contained in the docs page.
        inline: false,
        iframeHeight: "12rem",
      },
    },
  },
  // The body renders in a real panel, in the text column it would occupy in
  // one. Header-less, so the panel is named with `aria-label` instead.
  render: (args) => (
    <SidePanel
      aria-label="Panel body"
      ref={(handle: SidePanelHandle | null) => {
        handle?.open();
      }}
    >
      <Content {...args} />
    </SidePanel>
  ),
};

export default meta;
type Story = StoryObj<typeof Content>;

/** The panel body: prose, forms, whatever the task needs. */
export const Default: Story = {
  args: {
    children: <p>The application behind this panel is still usable.</p>,
  },
  parameters: {
    docs: {
      source: {
        code: `
<SidePanel
  aria-label="Panel body"${openOnMount}
>
  <SidePanel.Content>
    <p>The application behind this panel is still usable.</p>
  </SidePanel.Content>
</SidePanel>
        `,
      },
    },
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
  parameters: {
    docs: {
      source: {
        code: `
<SidePanel
  aria-label="Panel body"${openOnMount}
>
  <SidePanel.Content>
    {/* Taller than the panel: the panel scrolls, this region grows. */}
    {paragraphs}
  </SidePanel.Content>
</SidePanel>
        `,
      },
    },
  },
};
