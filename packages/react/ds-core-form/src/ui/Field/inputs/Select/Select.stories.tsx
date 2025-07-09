/* @canonical/generator-ds 0.9.0-experimental.9 */

// Needed for function-based story, safe to remove otherwise
// import type { SelectProps } from './types.js'
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import * as fixtures from "storybook/fixtures.options.js";
import Component from "./Select.js";

// Needed for template-based story, safe to remove otherwise
// import type { StoryFn } from '@storybook/react-vite'

const meta = {
  title: "Field/inputs/Select",
  component: Component,
  decorators: [decorators.form()],
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
    name: "select",
    options: fixtures.fruits,
  },
};

export const Disabled: Story = {
  args: {
    name: "select_disabled",
    options: fixtures.fruits,
    disabled: true,
  },
};
