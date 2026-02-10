/* @canonical/generator-ds 0.9.0-experimental.9 */

// Needed for function-based story, safe to remove otherwise
// import type { FormProps } from './types.js'
// Needed for template-based story, safe to remove otherwise
import type { Meta, StoryFn } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import * as fieldMaps from "storybook/fixtures.fields.js";
import { Field } from "../Field/index.js";
import type { FieldProps } from "../Field/types.js";

const meta = {
  title: "Form",
  decorators: [
    (Story: React.ElementType) => (
      <div className="grid-fluid">
        <Story />
      </div>
    ),
    decorators.form(),
  ],
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
  text: string;
  fieldMap: FieldProps[];
  otherProps: Partial<FieldProps>;
  wrapperClassName: string;
};

const Template: StoryFn<TemplateProps> = ({
  fieldMap,
  wrapperClassName = "abcdef",
  otherProps,
}: TemplateProps) => (
  <div className={wrapperClassName}>
    {fieldMap.map((props: FieldProps) => (
      <Field {...props} {...otherProps} key={props.name} />
    ))}
  </div>
);
export const Default: StoryFn<TemplateProps> = Template.bind({});
Default.args = {
  fieldMap: fieldMaps.base,
};

export const AllDisabled: StoryFn<TemplateProps> = Template.bind({});
AllDisabled.args = {
  fieldMap: fieldMaps.base,
  otherProps: { disabled: true },
};

export const AllOptional: StoryFn<TemplateProps> = Template.bind({});
AllOptional.args = {
  fieldMap: fieldMaps.base,
  otherProps: { isOptional: true },
};

export const Side: StoryFn<TemplateProps> = Template.bind({});
Side.args = {
  fieldMap: fieldMaps.base,
  wrapperClassName: "abcdef form-layout-side",
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
