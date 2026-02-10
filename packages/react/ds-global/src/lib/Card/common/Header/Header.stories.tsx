import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Header.js";

const meta = {
  title: "Stable/Card/Header",
  component: Component,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Card.Header provides a header section for cards. Implements `ds:global.subcomponent.card-header`.",
      },
    },
  },
  argTypes: {
    children: {
      control: { type: "text" },
      description: "Header content (required).",
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
 * Default header with content.
 */
export const Default: Story = {
  args: {
    children: "Card Header",
  },
};
