/* @canonical/generator-ds 0.9.0-experimental.4 */

import type { Meta, StoryObj } from "@storybook/react";
// Needed for function-based story, safe to remove otherwise
// import type { FieldProps } from './types.js'
import { useMemo } from "react";
import * as decorators from "storybook/decorators.js";
import type { FieldProps } from "../Field/types.js";
import Component from "./Field.js";
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
    inputType: "text",
  },
};

export const WithValidation: Story = {
  args: {
    name: "Board",
    inputType: "text",
    registerProps: {
      required: {
        value: true,
        message: "A board name is required",
      },
      minLength: {
        value: 5,
        message: "Board name must be at least 5 characters",
      },
      pattern: {
        value: /^[a-zA-Z0-9]+$/,
        message: "Board name must be alphanumeric",
      },
    },
  },
};

export const TypeTextarea: Story = {
  args: {
    name: "content",
    inputType: "textarea",
  },
};

export const TypeCheckbox: Story = {
  args: {
    name: "subscribe",
    inputType: "checkbox",
  },
};

const CustomComponent = () => <span>SomeExotic Input</span>;

export const TypeCustom: Story = {
  args: {
    name: "exotic",
    inputType: "custom",
    CustomComponent,
  },
};

export const ConditionalDisplay: Story = {
  render: () => {
    const emailField: FieldProps = useMemo(
      () => ({
        name: "email",
        inputType: "text",
        description:
          "Enter an email address ending with `@gmail.com` and you will be prompted for the company.",
        label: "Email",
      }),
      [],
    );

    const companyField: FieldProps = useMemo(
      () => ({
        name: "company",
        inputType: "text",
        label: "Company",
        optional: true,
        condition: [
          ["email"],
          (values: string[]) => {
            const value = values[0] as string;
            if (!value) return false;
            return value.endsWith("@gmail.com");
          },
        ],
      }),
      [],
    );

    return (
      <div>
        <Component {...emailField} />
        <Component {...companyField} />
      </div>
    );
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
