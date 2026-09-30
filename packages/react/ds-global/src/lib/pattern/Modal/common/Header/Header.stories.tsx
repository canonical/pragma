import type { Meta, StoryFn } from "@storybook/react-vite";
import ModalContext from "../../Context.js";
// The stand-in below is a div, not a real <Modal>, so it does not pull the
// modal's own styles — import them here to define the shared tokens.
import "../../styles.css";
import Component from "./Header.js";

const meta = {
  title: "patterns/Modal/Header",
  component: Component,
  decorators: [
    (Story) => (
      <ModalContext.Provider
        value={{ titleId: "modal-header-story-title", onDismiss: () => {} }}
      >
        {/* A plain div standing in for the open <dialog>: the stack layout is
            scoped to dialog[open], so it is supplied inline here. */}
        <div
          className="ds modal"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <Story />
        </div>
      </ModalContext.Provider>
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
 * Default header: the title and the dismiss control.
 */
export const Default: StoryFn = () => <Component>Modal title</Component>;
Default.parameters = {
  docs: {
    source: {
      code: `<Modal.Header>Modal title</Modal.Header>`,
    },
  },
};
