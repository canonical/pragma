/* @canonical/generator-ds 0.9.0-experimental.4 */
import type { Meta, StoryObj } from "@storybook/react";
import Component from "./ToolbarButton.js";
import "../../styles.css";

const meta = {
  title: "MarkdownEditor/ToolbarButton",
  tags: ["autodocs"],
  component: Component,
  decorators: [
    (Story, { args }) => (
      <div className="ds markdown-editor">
        <Story {...args} />
      </div>
    ),
  ],
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Bold",
    children: <span>B</span>,
    shortcut: "Ctrl+B",
  },
};
