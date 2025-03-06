/* @canonical/generator-ds 0.9.0-experimental.4 */
import type { Meta, StoryObj } from "@storybook/react";
import { ToolbarButton } from "../ToolbarButton/index.js";
import Component from "./ToolbarGroup.js";
import "../../styles.css";

const meta = {
  title: "MarkdownEditor/ToolbarGroup",
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
    label: "Toolbar Group",
    children: (
      <>
        <ToolbarButton label="Bold" shortcut="Ctrl+B">
          B
        </ToolbarButton>
        <ToolbarButton label="Italic" shortcut="Ctrl+I">
          I
        </ToolbarButton>
      </>
    ),
  },
};
