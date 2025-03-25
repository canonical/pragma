/* @canonical/generator-ds 0.9.0-experimental.4 */

// Needed for function-based story, safe to remove otherwise
// import type { LabelProps } from './types.js'
import type { Meta, StoryObj } from "@storybook/react";
import Component from "./Label.js";
// Needed for template-based story, safe to remove otherwise
// import type { StoryFn } from '@storybook/react'

const meta = {
  title: "common/Wrapper/Label",
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
    name: "email",
    children: "What is your email ?",
  },
};

export const Optional: Story = {
  args: {
    name: "name",
    children: "What is your name ?",
    isOptional: true,
  },
};

/** This represents a label for a fieldset, where we do not need an actual html label */
export const SemanticLabel: Story = {
  args: {
    name: "email",
    children: "Email",
    tag: "span",
  },
};
