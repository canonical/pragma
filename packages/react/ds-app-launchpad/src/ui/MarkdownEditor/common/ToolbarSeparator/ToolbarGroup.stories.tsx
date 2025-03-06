/* @canonical/generator-ds 0.9.0-experimental.4 */
import type { Meta, StoryObj } from "@storybook/react";
import Component from "./ToolbarSeparator.js";
import "../../styles.css";

const meta = {
  title: "MarkdownEditor/ToolbarSeparator",
  tags: ["autodocs"],
  component: Component,
  decorators: [
    (Story) => (
      <div style={{ display: "flex", gap: "8px" }}>
        <div>Group 1</div>
        <Story />
        <div>Group 2</div>
      </div>
    ),
    (Story, { args }) => (
      <div className="ds markdown-editor">
        <Story {...args} />
      </div>
    ),
  ],
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
