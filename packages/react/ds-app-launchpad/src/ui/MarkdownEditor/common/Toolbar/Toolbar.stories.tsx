/* @canonical/generator-ds 0.9.0-experimental.4 */
import type { Meta, StoryObj } from "@storybook/react";
import { ToolbarButton } from "../ToolbarButton/index.js";
import { ToolbarGroup } from "../ToolbarGroup/index.js";
import { ToolbarSeparator } from "../ToolbarSeparator/index.js";
import Component from "./Toolbar.js";
import "../../styles.css";

const meta = {
  title: "MarkdownEditor/Toolbar",
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
    label: "Toolbar",
    children: (
      <>
        <ToolbarGroup label="Toolbar Group 1">
          <ToolbarButton label="Bold" shortcut="Ctrl+B">
            B
          </ToolbarButton>
          <ToolbarButton label="Italic" shortcut="Ctrl+I">
            I
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarGroup label="Toolbar Group 2">
          <ToolbarButton label="Help" shortcut="Ctrl+H">
            ?
          </ToolbarButton>
        </ToolbarGroup>
      </>
    ),
  },
};
