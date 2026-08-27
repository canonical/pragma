import type { Meta, StoryObj } from "@storybook/react-vite";
import ModalContext from "../ModalContext.js";
import Header from "./Header.js";

const meta = {
  title: "patterns/Modal/Header",
  component: Header,
  parameters: {
    docs: {
      description: {
        component:
          "`Modal.Header` carries the modal title and the optional dismiss control. Implements `ds:global.subcomponent.modal-header`.",
      },
    },
  },
  argTypes: {
    children: {
      control: { type: "text" },
      description: "The modal title.",
    },
    dismissible: {
      control: { type: "boolean" },
      description: "Whether to render the close button.",
    },
    dismissLabel: {
      control: { type: "text" },
      description: "Accessible name for the close button.",
    },
  },
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
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default header: the title and the dismiss control.
 */
export const Default: Story = {
  args: {
    children: "Modal title",
  },
};

/**
 * Without the dismiss control, so the visible way out is an action in the
 * footer.
 */
export const NotDismissible: Story = {
  args: {
    children: "Unsaved changes",
    dismissible: false,
  },
};
