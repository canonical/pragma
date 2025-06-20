/* @canonical/generator-ds 0.9.0-experimental.4 */
import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import { useState } from "storybook/internal/preview-api";
import type { EditMode } from "ui/MarkdownEditor/types.js";
import Component from "./ViewModeTabs.js";
import "../../styles.css";

const meta = {
  title: "MarkdownEditor/ViewModeTabs",
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

type Story = StoryFn<typeof meta>;

export const Default: Story = (args) => {
  const [editMode, setEditMode] = useState<EditMode>("write");

  return (
    <Component
      {...args}
      editMode={editMode}
      onEditModeChange={(mode, _eventType) => setEditMode(mode)}
    />
  );
};
