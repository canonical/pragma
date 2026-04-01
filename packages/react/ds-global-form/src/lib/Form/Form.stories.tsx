import type { Meta, StoryFn } from "@storybook/react-vite";
import * as fieldMaps from "storybook/fixtures.fields.js";
import * as decorators from "#storybook/decorators.js";
import { Field } from "../Field/index.js";
import type { FieldProps } from "../Field/types.js";

/**
 * ## Grid context
 *
 * Forms must be wrapped in a grid container (`.grid.responsive` or
 * `.grid.intrinsic`). The `Form` component renders as a **subgrid**
 * that inherits the parent grid's columns and passes them down to
 * individual `Field` components.
 *
 * ```
 * <div class="grid responsive">       ← parent grid (consumer)
 *   <Form>                             ← form subgrid
 *     <Field ... />                    ← field subgrid
 *   </Form>
 * </div>
 * ```
 */
const meta = {
  title: "Form",
  parameters: { grid: "intrinsic" },
  decorators: [decorators.form()],
} satisfies Meta;

export default meta;

type TemplateProps = {
  fieldMap: FieldProps[];
  otherProps: Partial<FieldProps>;
};

const Template: StoryFn<TemplateProps> = ({
  fieldMap,
  otherProps,
}: TemplateProps) => (
  <>
    {fieldMap.map((props: FieldProps) => (
      <Field {...props} {...otherProps} key={props.name} />
    ))}
  </>
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
};
Side.decorators = [decorators.form({ className: "form-layout-side" })];
