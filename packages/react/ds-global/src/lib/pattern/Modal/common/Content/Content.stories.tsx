import type { Meta, StoryObj } from "@storybook/react-vite";
import Content from "./Content.js";

const meta = {
  title: "patterns/Modal/Content",
  component: Content,
  argTypes: {
    children: {
      control: { type: "text" },
      description: "The main information the modal conveys — an open slot.",
    },
  },
  decorators: [
    (Story) => (
      <div
        className="ds modal"
        style={{ display: "flex", flexDirection: "column" }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Content>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default content with text.
 */
export const Default: Story = {
  args: {
    children:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
};
