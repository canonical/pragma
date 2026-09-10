import type { Meta, StoryFn } from "@storybook/react-vite";
// The stand-in below is a div, not a real <Modal>, so it does not pull the
// modal's own styles — import them here to define the shared tokens.
import "../../styles.css";
import Component from "./Content.js";

const meta = {
  title: "patterns/Modal/Content",
  component: Component,
  decorators: [
    // A plain div standing in for the dialog the content composes into.
    (Story) => (
      <div
        className="ds modal"
        style={{ display: "flex", flexDirection: "column" }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      // The consumer composes the sections on a `Modal`, so serve the
      // consumer-facing snippet explicitly instead of the story's own source.
      source: { type: "code", language: "tsx" },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

/**
 * Default content with text.
 */
export const Default: StoryFn = () => (
  <Component>
    Ubuntu today has many flavors and dozens of specialized derivatives. There
    are also special editions for servers, OpenStack clouds, and connected
    devices. All editions share common infrastructure and software, making
    Ubuntu a unique single platform that scales from consumer electronics to the
    desktop and up into the cloud for enterprise computing.
  </Component>
);
Default.parameters = {
  docs: {
    source: {
      code: `<Modal.Content>
  Ubuntu today has many flavors and dozens of specialized derivatives. There
  are also special editions for servers, OpenStack clouds, and connected
  devices. All editions share common infrastructure and software, making
  Ubuntu a unique single platform that scales from consumer electronics to
  the desktop and up into the cloud for enterprise computing.
</Modal.Content>`,
    },
  },
};
