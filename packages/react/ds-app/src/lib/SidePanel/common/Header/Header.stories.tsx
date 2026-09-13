import type { Meta, StoryObj } from "@storybook/react-vite";
import SidePanel from "../../SidePanel.js";
import type { SidePanelHandle } from "../../types.js";
import Header from "./Header.js";

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

const meta: Meta<typeof Header> = {
  title: "Components/SidePanel/Header",
  component: Header,
  args: {
    children: "Panel title",
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
      <Header {...args} />
    </SidePanel>
  ),
};

export default meta;
type Story = StoryObj<typeof Header>;

/** Heading at the start, close button at the end. */
export const Default: Story = {
  parameters: {
    docs: {
      source: {
        code: `
<SidePanel${openOnMount}>
  <SidePanel.Header>Panel title</SidePanel.Header>
</SidePanel>
        `,
      },
    },
  },
};

/** A panel dismissed only from its footer omits the close button. */
export const NotDismissible: Story = {
  args: {
    dismissible: false,
  },
  parameters: {
    docs: {
      source: {
        code: `
<SidePanel${openOnMount}>
  <SidePanel.Header dismissible={false}>Panel title</SidePanel.Header>
</SidePanel>
        `,
      },
    },
  },
};

/** The close button's accessible name follows the panel's subject. */
export const CustomDismissLabel: Story = {
  args: {
    children: "Filters",
    dismissLabel: "Dismiss filters",
  },
  parameters: {
    docs: {
      source: {
        code: `
<SidePanel${openOnMount}>
  <SidePanel.Header dismissLabel="Dismiss filters">Filters</SidePanel.Header>
</SidePanel>
        `,
      },
    },
  },
};

/** A long title wraps rather than pushing the close button out of reach. */
export const LongTitle: Story = {
  args: {
    children:
      "A panel title long enough to need more than one line of the panel's width",
  },
  parameters: {
    docs: {
      source: {
        code: `
<SidePanel${openOnMount}>
  <SidePanel.Header>
    A panel title long enough to need more than one line of the panel's width
  </SidePanel.Header>
</SidePanel>
        `,
      },
    },
  },
};
