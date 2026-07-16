/* @canonical/generator-ds 0.9.0-experimental.4 */

// Needed for function-based story, safe to remove otherwise
// import type { LabelProps } from './types.js'
import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Label.js";

// Needed for template-based story, safe to remove otherwise
// import type { StoryFn } from '@storybook/react-vite'

const meta = {
  title: "subcomponents/Field.Label",
  component: Component,
} satisfies Meta<typeof Component>;

export default meta;

/*
  CSF3 story
  Uses object-based story declarations with strong TS support (`Meta` and `StoryObj`).
  Uses the latest storybook format.
*/
type Story = StoryObj<typeof meta>;

/**
 * Default ("required") marking: a required field gets a "*" marker before the
 * label, drawn as a CSS pseudo-element so it never enters the accessible name.
 */
export const Default: Story = {
  args: {
    name: "email",
    children: "What is your email ?",
  },
};

/**
 * In the default ("required") mode an optional field carries no marker at all —
 * only the required ones are tagged.
 */
export const OptionalNoMarker: Story = {
  args: {
    name: "name",
    children: "What is your name ?",
    isOptional: true,
  },
};

/**
 * The alternate ("optional") convention: optional fields are tagged
 * "(optional)" after the label, required ones are left unmarked.
 */
export const OptionalMarked: Story = {
  args: {
    name: "name",
    children: "What is your name ?",
    isOptional: true,
    requiredIndicator: "optional",
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
