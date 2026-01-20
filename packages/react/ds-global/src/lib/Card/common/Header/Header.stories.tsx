import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../../Button/index.js";
import Component from "./Header.js";

const meta = {
  title: "A/Card/Header",
  component: Component,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Card.Header provides a title and optional actions slot for cards. Implements `ds:global.subcomponent.card-header`.",
      },
    },
  },
  argTypes: {
    children: {
      control: { type: "text" },
      description: "Title content (required).",
    },
    actions: {
      control: false,
      description: "Optional actions slot (buttons, links, etc.).",
    },
  },
  decorators: [
    (Story) => (
      <div
        className="ds card"
        style={{ maxWidth: "400px", border: "1px solid #e5e5e5" }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default header with title only.
 */
export const Default: Story = {
  args: {
    children: "Card Title",
  },
};

/**
 * Header with title and action button.
 */
export const WithActions: Story = {
  args: {
    children: "Card Title",
    actions: <Button importance="tertiary">Action</Button>,
  },
};

/**
 * Header with multiple action buttons.
 */
export const WithMultipleActions: Story = {
  args: {
    children: "Card Title",
    actions: (
      <>
        <Button importance="tertiary">Edit</Button>
        <Button importance="tertiary" anticipation="destructive">
          Delete
        </Button>
      </>
    ),
  },
};

/**
 * Header with long title that may truncate.
 */
export const LongTitle: Story = {
  args: {
    children:
      "This is a very long card title that might need to be truncated or wrapped depending on the available space",
    actions: <Button importance="tertiary">Action</Button>,
  },
};
