/* @canonical/generator-ds 0.9.0-experimental.4 */
import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import { useState } from "storybook/internal/preview-api";
import MarkdownEditor from "./MarkdownEditor.js";
import * as fixtures from "./fixtures.js";
import type { EditMode, MarkdownEditorProps } from "./types.js";

const meta = {
  title: "MarkdownEditor",
  tags: ["autodocs"],
  component: MarkdownEditor,
} satisfies Meta<MarkdownEditorProps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Add a comment here...",
    rows: 5,
  },
};

export const WithCheckboxPreviewSwitch: Story = {
  args: {
    previewSwitchMode: "checkbox",
    placeholder: "Add a comment here...",
    rows: 5,
  },
};

export const ReadOnlyMarkdownViewer: Story = {
  args: {
    hideToolbar: true,
    hidePreview: true,
    borderless: true,
    editMode: "preview",
    defaultValue: fixtures.markdownLongExample,
  },
};

export const ExternallyControlledEditMode: StoryFn<MarkdownEditorProps> = (
  args,
) => {
  const [editMode, setEditMode] = useState<EditMode>("write");
  const switchTo = editMode === "write" ? "Preview" : "Write";
  const handleToggle = () => setEditMode(switchTo.toLowerCase() as EditMode);

  return (
    <div>
      <MarkdownEditor
        {...args}
        defaultValue={fixtures.markdownShortExample}
        editMode={editMode}
        hidePreview
        borderless
        onEditModeChange={(newMode) => setEditMode(newMode)}
      />
      <fieldset>
        <legend>External Edit Mode Control</legend>
        <button type="button" onClick={handleToggle}>
          Switch to {switchTo}
        </button>
      </fieldset>
    </div>
  );
};

ExternallyControlledEditMode.parameters = {
  docs: {
    source: {
      type: "code",
    },
  },
};
