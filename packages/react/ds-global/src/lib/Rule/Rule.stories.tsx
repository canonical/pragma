/* @canonical/generator-ds 0.10.0-experimental.2 */

import { MODIFIER_FAMILIES } from "@canonical/ds-types";

import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Rule.js";
import type { RuleProps } from "./types.js";

const meta = {
  title: "P1/Rule",
  component: Component,
  argTypes: {
    emphasis: {
      options: MODIFIER_FAMILIES.emphasis,
      control: { type: "radio" },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

/*
  CSF3 story
  Uses object-based story declarations with strong TS support (`Meta` and `StoryObj`).
  Uses the latest storybook format.
*/
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
export const Emphasis = (args: RuleProps) => (
  <div>
    {MODIFIER_FAMILIES.emphasis.map((emphasisLevel) => (
      <>
        <Component key={emphasisLevel} {...args} emphasis={emphasisLevel} />
        <h4>Text beneath a {emphasisLevel} rule.</h4>
      </>
    ))}
  </div>
);
Emphasis.parameters = {
  docs: {
    description: {
      story:
        "Different levels of visual emphasis can be applied to the rule to help distinguish contents from each other.",
    },
  },
};
