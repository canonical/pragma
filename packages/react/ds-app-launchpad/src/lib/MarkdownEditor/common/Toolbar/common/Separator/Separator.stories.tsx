/* @canonical/generator-ds 0.9.0-experimental.4 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import "../../../../styles.css";
import Component from "./Separator.js";

const meta = {
  title: "MarkdownEditor/Toolbar/Separator",
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
