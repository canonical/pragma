/* @canonical/generator-ds 0.9.0-experimental.4 */

// Needed for function-based story, safe to remove otherwise
// import type { FieldProps } from './types.js'
import type { Meta, StoryObj } from "@storybook/react";
import * as decorators from "storybook/decorators.js";
import Component from "./Field.js";
import { InputType } from "./types.js";
// Needed for template-based story, safe to remove otherwise
// import type { StoryFn } from '@storybook/react'

const meta = {
  title: "Field",
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
    name: "full_name",
    inputType: InputType.Text,
  },
};

export const TypeTextarea: Story = {
  args: {
    name: "content",
    inputType: InputType.Textarea,
  },
};

export const TypeCheckbox: Story = {
  args: {
    name: "subscribe",
    inputType: InputType.Checkbox,
  },
};

export const TypeCheckbox: Story = {
  args: {
    inputType: InputType.Checkbox,
  },
};

const CustomComponent = () => <span>SomeExotic Input</span>;

export const TypeCustom: Story = {
  args: {
    name: "exotic",
    inputType: InputType.Custom,
    CustomComponent,
  },
};

/*
  Function-based story
  Direct arguments passed to the component
  Simple, but can lead to repetition if used across multiple stories with similar configurations

  export const Default = (args: FieldProps) => <Component {...args} />;
  Default.args = { children: <span>Hello world!</span> };
*/

/*
  Template-Based story
  Uses a template function to bind story variations, making it more reusable
  Slightly more boilerplate but more flexible for creating multiple stories with different configurations

  const Template: StoryFn<typeof Component> = (args) => <Component {...args} />;
  export const Default: StoryFn<typeof Component> = Template.bind({});
  Default.args = {
    children: <span>Hello world!</span>
  };
*/

/*
  Static story
  Simple and straightforward, but offers the least flexibility and reusability

  export const Default: StoryFn<typeof Component> = () => (
    <Component><span>Hello world!</span></Component>
  );
*/
