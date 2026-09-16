import type { Meta, StoryObj } from "@storybook/react-vite";
import SidePanel from "../../Provider.js";
import type { SidePanelHandle } from "../../types.js";
import Component from "./Content.js";

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

/* Real copy from ubuntu.com/about, cycled as filler in the tall story. */
const ubuntuFacts = [
  "Ubuntu is an ancient African word meaning 'humanity to others'. It is often described as reminding us that 'I am what I am because of who we all are'.",
  "Canonical is the publisher of Ubuntu. Members of the Canonical team lead aspects of Ubuntu such as the kernel, default desktop, foundations, security, OpenStack, and Kubernetes.",
  "Ubuntu was the first operating system to commit to scheduled releases on a predictable cadence, every six months, starting in October 2004.",
];

const meta: Meta<typeof Component> = {
  title: "Components/SidePanel/Content",
  component: Component,
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
      aria-label="About Ubuntu"
      ref={(handle: SidePanelHandle | null) => {
        handle?.open();
      }}
    >
      <Component {...args} />
    </SidePanel>
  ),
};

export default meta;
type Story = StoryObj<typeof Component>;

/** The panel body: prose, forms, whatever the task needs. */
export const Default: Story = {
  args: {
    children: (
      <p>
        We deliver the world&apos;s free software, freely, to everybody on the
        same terms. Whether you are a student in India or a global bank, you can
        download and use Ubuntu free of charge.
      </p>
    ),
  },
  parameters: {
    docs: {
      source: {
        code: `
<SidePanel
  aria-label="About Ubuntu"${openOnMount}
>
  <SidePanel.Content>
    <p>
      We deliver the world's free software, freely, to everybody on the same
      terms. Whether you are a student in India or a global bank, you can
      download and use Ubuntu free of charge.
    </p>
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
    children: Array.from({ length: 10 }, (_, index) => index).map((index) => (
      <p key={index}>{ubuntuFacts[index % ubuntuFacts.length]}</p>
    )),
  },
  parameters: {
    docs: {
      source: {
        code: `
<SidePanel
  aria-label="About Ubuntu"${openOnMount}
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
