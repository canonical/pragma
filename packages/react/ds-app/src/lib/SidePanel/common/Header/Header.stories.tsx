import type { Meta, StoryObj } from "@storybook/react-vite";
import SidePanel from "../../Provider.js";
import type { SidePanelHandle } from "../../types.js";
import Component from "./Header.js";

/*
  The story source shown in docs: the header renders in a real panel, and the
  callback ref opens it on mount because a story is a static fixture — in an
  application the open comes from an event handler instead.
*/
const openOnMount = `
  ref={(handle: SidePanelHandle | null) => {
    handle?.open();
  }}
`;

const meta: Meta<typeof Component> = {
  title: "Components/SidePanel/Header",
  component: Component,
  args: {
    children: "Ubuntu Pro",
  },
  parameters: {
    docs: {
      story: {
        // The header's panel is `position: fixed`: inside its own iframe it
        // fills the frame and stays contained in the docs page.
        inline: false,
        iframeHeight: "12rem",
      },
    },
  },
  // The header renders in a real panel — its close button is wired through the
  // real panel context and sits in the panel's own geometry. No scaffolding
  // around it.
  render: (args) => (
    <SidePanel
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

/**
 * Heading at the start, close button at the end.
 *
 * The title is a `<span>`, not a heading element: headings structure the
 * page's document outline, and a panel opens from anywhere in it, so no
 * heading level would be right everywhere. The title names the panel through
 * `aria-labelledby` instead, which is what a screen reader announces when the
 * panel opens.
 */
export const Default: Story = {
  parameters: {
    docs: {
      source: {
        code: `
<SidePanel${openOnMount}>
  <SidePanel.Header>Ubuntu Pro</SidePanel.Header>
</SidePanel>
        `,
      },
    },
  },
};

/** A panel dismissed only from its footer omits the close button. */
export const NotDismissible: Story = {
  args: {
    undismissible: true,
  },
  parameters: {
    docs: {
      source: {
        code: `
<SidePanel${openOnMount}>
  <SidePanel.Header undismissible>Ubuntu Pro</SidePanel.Header>
</SidePanel>
        `,
      },
    },
  },
};
