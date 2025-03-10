/* @canonical/generator-ds 0.9.0-experimental.4 */
import type { Meta, StoryObj } from "@storybook/react";
import "../../../../styles.css";
import { ToolbarButton } from "../Button/index.js";
import Component from "./Group.js";

const meta = {
	title: "MarkdownEditor/Toolbar/Group",
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
