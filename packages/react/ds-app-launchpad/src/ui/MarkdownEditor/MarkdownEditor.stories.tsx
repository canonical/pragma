/* @canonical/generator-ds 0.9.0-experimental.4 */
import type { Meta, StoryFn, StoryObj } from "@storybook/react";
import { useState } from "storybook/internal/preview-api";
import MarkdownEditor from "./MarkdownEditor.js";
import { EditMode, MarkdownEditorProps } from "./types.js";

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
    style: { minHeight: 150 },
  },
};

export const ReadOnlyMarkdownViewer: Story = {
  args: {
    hideToolbar: true,
    hidePreview: true,
    editMode: "preview",
    defaultValue: `# Markdown Editor Example

This is an example of a Markdown editor.

\`\`\`js
const foo = "bar";
console.log(foo);

function baz() {
  return "qux";
}
\`\`\`
`,
  },
};

export const ExternallyControlledEditMode: StoryFn<MarkdownEditorProps> = (
  args
) => {
  const [editMode, setEditMode] = useState<EditMode>("write");
  return (
    <div>
      <MarkdownEditor
        {...args}
        editMode={editMode}
        hidePreview
        onEditModeChange={(newMode) => setEditMode(newMode)}
      />
      <fieldset>
        <legend>External Edit Mode Control</legend>
        <button onClick={() => setEditMode("write")}>Write</button>
        <button onClick={() => setEditMode("preview")}>Preview</button>
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
