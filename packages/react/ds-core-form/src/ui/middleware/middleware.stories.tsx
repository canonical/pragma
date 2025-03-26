/* @canonical/generator-ds 0.9.0-experimental.9 */

// Needed for function-based story, safe to remove otherwise
// import type { FormProps } from './types.js'
import type { Meta, StoryObj } from "@storybook/react";
// Needed for template-based story, safe to remove otherwise
import type { StoryFn } from "@storybook/react";
import * as decorators from "storybook/decorators.js";
import * as middleware from "./index.js";

import { Field } from "../Field/index.js";
import type { FieldProps } from "../Field/types.js";

const meta = {
  title: "middleware",
  decorators: [decorators.form()],
} satisfies Meta;

export default meta;

/*
  CSF3 story
  Uses object-based story declarations with strong TS support (`Meta` and `StoryObj`).
  Uses the latest storybook format.
*/
// type Story = StoryObj<typeof meta>;

// export const Default: Story = {
//   args: {
//     children: <span>Hello world!</span>
//   },
// };

type TemplateProps = {
  wrapperClassName: string;
};

const Template: StoryFn<TemplateProps> = ({
  wrapperClassName,
}: TemplateProps) => <div className={wrapperClassName}>Test</div>;
export const Default: StoryFn<TemplateProps> = Template.bind({});
Default.args = {
  wrapperClassName: "wrapper",
};

export const ConditionalDisplay: StoryObj = {
  render: () => {
    const emailField: FieldProps = {
      name: "email",
      inputType: "text",
      description:
        "Enter a gmail address and you should be prompted for the company",
      label: "Email",
    };

    const companyField: FieldProps = {
      name: "company",
      inputType: "text",
      label: "Company",
      middleware: [
        middleware.addConditionalDisplay(["email"], (values) =>
          values[0]?.endsWith("@gmail.com"),
        ),
      ],
    };

    return (
      <div>
        <Field {...emailField} />
        <Field {...companyField} />
      </div>
    );
  },
  name: "Conditional Display",
};

export const RESTOptions: StoryObj = {
  render: () => {
    const choicesField: FieldProps = {
      name: "choices",
      inputType: "simple-choices",
      label: "Select an option",
      middleware: [
        middleware.addRESTOptions("https://TODO", {
          transformData: (data) => data.options,
        }),
      ],
    };

    return <Field {...choicesField} />;
  },
  name: "REST Options",
};

export const RESTValidation: StoryObj = {
  render: () => {
    const domainField: FieldProps = {
      name: "domain",
      inputType: "text",
      label: "Domain Name",
      middleware: [
        middleware.addRESTValidation("https://TODO", {
          minLength: 3,
          errorExtractor: async (response) => {
            const data = await response.json();
            return data.error || "Domain is not available";
          },
        }),
      ],
    };

    return <Field {...domainField} />;
  },
  name: "REST Validation",
};

/*
  Function-based story
  Direct arguments passed to the component
  Simple, but can lead to repetition if used across multiple stories with similar configurations

  export const Default = (args: FormProps) => <Component {...args} />;
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
