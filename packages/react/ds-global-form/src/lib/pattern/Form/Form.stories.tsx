import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import type React from "react";
import { useState } from "react";
import * as decorators from "storybook/decorators.js";
import * as fieldMaps from "storybook/fixtures.fields.js";
import { Field } from "#lib/pattern/Field/index.js";
import type { FieldProps } from "#lib/pattern/Field/types.js";
import Component from "./Form.js";

/**
 * A `Form` renders as a **subgrid**: it inherits the columns of the parent grid
 * (`.grid.responsive` / `.grid.intrinsic`) and passes them down to each `Field`,
 * so labels, inputs and multi-column spans all align to one shared grid.
 *
 * ```
 * <div class="grid responsive">   ← parent grid (from the story `grid` param)
 *   <Form>                         ← form subgrid
 *     <Field ... />                ← field subgrid
 *   </Form>
 * </div>
 * ```
 *
 * The first stories drive a real `useForm` through the `Form` component
 * (`onSubmit` + optional `defaultValues`), so submit, validation and collected
 * values are live — inspect the **Form State** addon panel, or the readout that
 * prints submitted values. The reference stories at the end render every input
 * type from a fixture to show the field set at a glance.
 */
const meta = {
  title: "patterns/Form",
  parameters: { layout: "padded", grid: "responsive" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => {};

/** A small readout so a story visibly shows what it submitted. */
function SubmittedValues({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  return (
    <pre
      style={{
        marginBlockStart: "1rem",
        padding: "0.75rem",
        background: "var(--color-background-neutral-subtle, #f4f4f4)",
        borderRadius: "0.25rem",
        fontSize: "0.85em",
        overflowX: "auto",
      }}
    >
      Submitted: {JSON.stringify(data, null, 2)}
    </pre>
  );
}

/**
 * A realistic sign-up form: a handful of related fields, a required rule, and a
 * submit button whose collected values are shown below. This is what a product
 * form actually looks like — not a dump of every input type.
 */
export const SignUp: Story = {
  render: () => {
    const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(
      null,
    );
    return (
      <>
        <Component onSubmit={setSubmitted} mode="onBlur">
          <Field name="full_name" inputType="text" label="Full name" />
          <Field
            name="email"
            inputType="text"
            label="Email address"
            registerProps={{ required: "Email is required" }}
          />
          <Field
            name="password"
            inputType="password"
            label="Password"
            description="At least 8 characters"
            registerProps={{
              required: "Password is required",
              minLength: { value: 8, message: "At least 8 characters" },
            }}
          />
          <Field
            name="plan"
            inputType="select"
            label="Plan"
            options={[
              { value: "free", label: "Free" },
              { value: "pro", label: "Pro" },
              { value: "team", label: "Team" },
            ]}
          />
          <Field
            name="terms"
            inputType="checkbox"
            controlLabel="I agree to the terms of service"
          />
          <Button importance="primary" type="submit">
            Create account
          </Button>
        </Component>
        <SubmittedValues data={submitted} />
      </>
    );
  },
};

/**
 * Validation on a real submit: rules registered via `registerProps` surface
 * their messages when the field is blurred or the form is submitted — no
 * decorator trickery. Submit with empty/invalid values to see the error state.
 */
export const Validation: Story = {
  render: () => (
    <Component onSubmit={noop} mode="onBlur">
      <Field
        name="email"
        inputType="text"
        label="Email"
        registerProps={{
          required: "Email is required",
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: "Enter a valid email address",
          },
        }}
      />
      <Field
        name="age"
        inputType="number"
        label="Age"
        registerProps={{
          required: "Age is required",
          min: { value: 18, message: "Must be at least 18" },
        }}
      />
      <Field name="bio" inputType="textarea" label="Bio" isOptional />
      <Button importance="primary" type="submit">
        Submit
      </Button>
    </Component>
  ),
};

/**
 * Editing an existing record: `defaultValues` pre-fills the form, so the fields
 * mount populated and submit yields the (possibly edited) record.
 */
export const EditRecord: Story = {
  render: () => {
    const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(
      null,
    );
    return (
      <>
        <Component
          onSubmit={setSubmitted}
          defaultValues={{
            full_name: "Ada Lovelace",
            email: "ada@example.com",
            plan: "pro",
          }}
        >
          <Field name="full_name" inputType="text" label="Full name" />
          <Field name="email" inputType="text" label="Email address" />
          <Field
            name="plan"
            inputType="select"
            label="Plan"
            options={[
              { value: "free", label: "Free" },
              { value: "pro", label: "Pro" },
              { value: "team", label: "Team" },
            ]}
          />
          <Button importance="primary" type="submit">
            Save changes
          </Button>
        </Component>
        <SubmittedValues data={submitted} />
      </>
    );
  },
};

/**
 * Multi-column layout: fields default to full width, but `--form-field-columns`
 * lets a field span part of the grid so two can share a row. Here the city and
 * postcode sit side by side (`1 / 5` and `5 / -1`) while the other fields stay
 * full width — the whole form still aligns to one subgrid.
 */
export const MultiColumnLayout: Story = {
  render: () => (
    <Component onSubmit={noop}>
      <Field name="street" inputType="text" label="Street address" />
      <Field
        name="city"
        inputType="text"
        label="City"
        style={{ "--form-field-columns": "1 / 5" } as React.CSSProperties}
      />
      <Field
        name="postcode"
        inputType="text"
        label="Postcode"
        style={{ "--form-field-columns": "5 / -1" } as React.CSSProperties}
      />
      <Field
        name="country"
        inputType="select"
        label="Country"
        options={[
          { value: "gb", label: "United Kingdom" },
          { value: "us", label: "United States" },
          { value: "de", label: "Germany" },
        ]}
      />
      <Button importance="primary" type="submit">
        Continue
      </Button>
    </Component>
  ),
};

/**
 * Side layout: `.form-layout-side` places each label beside its input (label in
 * columns 1–2, input in 3-to-end) instead of stacked above it — useful for
 * settings-style forms.
 */
export const SideLayout: Story = {
  render: () => (
    <Component onSubmit={noop} className="form-layout-side">
      <Field name="first_name" inputType="text" label="First name" />
      <Field name="last_name" inputType="text" label="Last name" />
      <Field name="email" inputType="text" label="Email address" />
      <Field name="phone" inputType="phone" label="Phone number" isOptional />
      <Field name="company" inputType="text" label="Company" isOptional />
      <Field name="job_title" inputType="text" label="Job title" isOptional />
      <Field
        name="country"
        inputType="select"
        label="Country"
        options={[
          { value: "gb", label: "United Kingdom" },
          { value: "us", label: "United States" },
          { value: "de", label: "Germany" },
        ]}
      />
      <Field
        name="timezone"
        inputType="select"
        label="Timezone"
        options={[
          { value: "utc", label: "UTC" },
          { value: "cet", label: "CET" },
          { value: "pst", label: "PST" },
        ]}
      />
      <Field
        name="bio"
        inputType="textarea"
        label="About you"
        description="A short description for your profile"
        isOptional
      />
      <Field
        name="newsletter"
        inputType="checkbox"
        controlLabel="Subscribe to the newsletter"
      />
      <Button importance="primary" type="submit">
        Save
      </Button>
    </Component>
  ),
};

/* -------------------------------------------------------------------------- */
/* Reference stories — every input type from a fixture, using the decorator's  */
/* own useForm instance (no submit), to show the field set at a glance.        */
/* -------------------------------------------------------------------------- */

type TemplateProps = {
  fieldMap: FieldProps[];
  otherProps?: Partial<FieldProps>;
};

const FixtureTemplate: StoryFn<TemplateProps> = ({
  fieldMap,
  otherProps,
}: TemplateProps) => (
  <>
    {fieldMap.map((props: FieldProps) => (
      <Field {...props} {...otherProps} key={props.name} />
    ))}
  </>
);

/** Every supported input type, rendered from the shared fixture. */
export const AllInputTypes: StoryFn<TemplateProps> = FixtureTemplate.bind({});
AllInputTypes.args = { fieldMap: fieldMaps.base };
AllInputTypes.decorators = [decorators.form()];

/** The same field set, disabled throughout. */
export const AllDisabled: StoryFn<TemplateProps> = FixtureTemplate.bind({});
AllDisabled.args = { fieldMap: fieldMaps.base, otherProps: { disabled: true } };
AllDisabled.decorators = [decorators.form()];

/** The same field set with the optional-marking house style applied. */
export const AllOptional: StoryFn<TemplateProps> = FixtureTemplate.bind({});
AllOptional.args = {
  fieldMap: fieldMaps.base,
  otherProps: { isOptional: true },
};
AllOptional.decorators = [decorators.form()];
