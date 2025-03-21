import type { Meta, StoryObj } from "@storybook/react";

import Component from "./EditableBlock.js";

const meta = {
  title: "EditableBlock",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    tag: {
      control: "text",
      description: "The HTML tag to use for the title",
    },
  },
  args: {
    tag: "div",
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default
 */

interface SampleChildProps {
  isEditing?: boolean;
  toggleEditing?: () => void;
}

const SampleChild = ({
  isEditing,
  toggleEditing,
}: SampleChildProps): React.ReactElement => {
  return (
    <button type="button" onClick={toggleEditing}>
      Toggle {isEditing ? "edit mode" : "view mode"}
    </button>
  );
};

export const Default: Story = {
  args: {
    title: "Sample Title",
    EditComponent: ({ isEditing, toggleEditing }: SampleChildProps) => (
      <SampleChild isEditing={isEditing} toggleEditing={toggleEditing} />
    ),
  },
};

export const ReadOnlyBlock: Story = {
  args: {
    title: "Sample Title",
    readonly: true,
    EditComponent: ({ isEditing, toggleEditing }: SampleChildProps) => (
      <SampleChild isEditing={isEditing} toggleEditing={toggleEditing} />
    ),
  },
};
