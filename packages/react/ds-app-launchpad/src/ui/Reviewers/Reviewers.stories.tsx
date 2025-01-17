/* @canonical/generator-canonical-ds 0.4.0-experimental.0 */

// Needed for function-based story, safe to remove otherwise
// import type { ReviewersProps } from './types.js'
import type { Meta, StoryObj } from "@storybook/react";
// Needed for template-based story, safe to remove otherwise
// import type { StoryFn } from '@storybook/react'
import { fn } from "@storybook/test";
import Component from "./Reviewers.js";

const meta = {
	title: "Reviewers",
	component: Component,
	tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;

/*
  CSF3 story
  Uses object-based story declarations with strong TS support (`Meta` and `StoryObj`).
  Uses the latest storybook format.
*/
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		value: "24.04",
	},
};

export const WithLead: Story = {
	args: {
		lead: "Release",
		value: "24.04",
	},
};

export const Variants: Story = {
	render: (args) => (
		<div>
			<Component lead="LTS" value="20.04" appearance="neutral" {...args} />
			<Component value="20.10" appearance="information" {...args} />
			<Component lead="LTS" value="21.04" appearance="positive" {...args} />
			<Component value="21.10" appearance="caution" {...args} />
			<Component lead="LTS" value="22.04" appearance="negative" {...args} />
		</div>
	),
};

export const Clickable: Story = {
	args: {
		onClick: fn(),
		value: "Download",
	},
};

export const Dismissible: Story = {
	args: {
		onDismiss: fn(),
		value: "Dismiss",
	},
};
