/* @canonical/generator-ds 0.9.0-experimental.4 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import "../../styles.css";
import Component from "./Toolbar.js";

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
        <Component.Group label="Toolbar Group 1">
          <Component.Button label="Bold" shortcut="Ctrl+B">
            B
          </Component.Button>
          <Component.Button label="Italic" shortcut="Ctrl+I">
            I
          </Component.Button>
        </Component.Group>
        <Component.Separator />
        <Component.Group label="Toolbar Group 2">
          <Component.Button label="Help" shortcut="Ctrl+H">
            ?
          </Component.Button>
        </Component.Group>
      </>
    ),
  },
};
