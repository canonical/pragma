import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Footer.js";

const meta = {
  title: "_work_in_progress/component/Card/Footer",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    children: {
      control: { type: "text" },
      description: "Footer content (required).",
    },
  },
  decorators: [
    (Story) => (
      <div className="ds card surface" style={{ maxWidth: "400px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Card footer",
  },
};
