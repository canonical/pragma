import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import Field from "#lib/pattern/Field/Field.js";
import Form from "#lib/pattern/Form/Form.js";

const noop = (data: Record<string, unknown>) => console.log(data);

/** Small readout so the examples visibly show the submitted values. */
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

const meta = {
  title: "Documentation/Getting Started/Examples",
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="grid responsive">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const BasicForm: Story = {
  name: "Basic form",
  render: () => (
    <Form onSubmit={noop}>
      <Field name="name" inputType="text" label="Full name" />
      <Field
        name="email"
        inputType="text"
        label="Email address"
        registerProps={{ required: "Email is required" }}
      />
      <Field
        name="message"
        inputType="textarea"
        label="Message"
        description="Maximum 500 characters"
      />
      <Button type="submit">Send</Button>
    </Form>
  ),
};

export const InternalMode: Story = {
  name: "Form — internal mode",
  render: () => {
    const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(
      null,
    );
    // `Form` owns the useForm instance — pass onSubmit, and optionally
    // defaultValues and a validation mode. Simplest for a self-contained form.
    return (
      <>
        <Form
          onSubmit={setSubmitted}
          defaultValues={{ name: "Ada", email: "" }}
          mode="onBlur"
        >
          <Field name="name" inputType="text" label="Full name" />
          <Field
            name="email"
            inputType="text"
            label="Email address"
            registerProps={{ required: "Email is required" }}
          />
          <Button type="submit">Send</Button>
        </Form>
        <SubmittedValues data={submitted} />
      </>
    );
  },
};

export const ExternalMode: Story = {
  name: "Form — external mode",
  render: () => {
    const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(
      null,
    );
    // You own the useForm instance, so you can read `formState` (e.g.
    // `isSubmitting`) and call methods like `reset` — useful for async submits,
    // shared/multi-step state, or a "reset" button.
    const methods = useForm<FieldValues>({
      mode: "onBlur",
      defaultValues: { name: "", email: "" },
    });
    const {
      reset,
      formState: { isSubmitting },
    } = methods;

    const onSubmit = async (data: Record<string, unknown>) => {
      // Simulate an async request so `isSubmitting` is observable.
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmitted(data);
      reset(); // clear back to defaultValues after a successful submit
    };

    return (
      <>
        <Form methods={methods} onSubmit={onSubmit}>
          <Field name="name" inputType="text" label="Full name" />
          <Field
            name="email"
            inputType="text"
            label="Email address"
            registerProps={{ required: "Email is required" }}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Send"}
          </Button>
        </Form>
        <SubmittedValues data={submitted} />
      </>
    );
  },
};

export const InputTypes: Story = {
  name: "Input types",
  render: () => (
    <Form onSubmit={noop}>
      <Field name="text" inputType="text" label="Text" />
      <Field
        name="select"
        inputType="select"
        label="Select"
        options={[
          { value: "a", label: "Option A" },
          { value: "b", label: "Option B" },
          { value: "c", label: "Option C" },
        ]}
      />
      <Field
        name="checkbox"
        inputType="checkbox"
        label="I agree to the terms"
      />
      <Field name="range" inputType="range" label="Volume" min={0} max={100} />
      <Field name="date" inputType="date" label="Start date" />
      <Field name="color" inputType="color" label="Brand color" />
    </Form>
  ),
};

export const WithValidation: Story = {
  name: "Validation",
  render: () => (
    <Form onSubmit={noop} mode="onBlur">
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
        inputType="text"
        label="Age"
        registerProps={{
          required: "Age is required",
          min: { value: 18, message: "Must be at least 18" },
        }}
      />
      <Field name="bio" inputType="textarea" label="Bio" isOptional />
      <Button type="submit">Submit</Button>
    </Form>
  ),
};

export const ConditionalField: Story = {
  name: "Conditional field",
  render: () => (
    <Form onSubmit={noop}>
      <Field
        name="role"
        inputType="select"
        label="Role"
        options={[
          { value: "individual", label: "Individual" },
          { value: "company", label: "Company" },
        ]}
      />
      <Field
        name="company_name"
        inputType="text"
        label="Company name"
        condition={[["role"], ([role]: unknown[]) => role === "company"]}
      />
      <Button type="submit">Continue</Button>
    </Form>
  ),
};

export const SideLayout: Story = {
  name: "Side layout",
  render: () => (
    <Form onSubmit={noop} className="form-layout-side">
      <Field name="first_name" inputType="text" label="First name" />
      <Field name="last_name" inputType="text" label="Last name" />
      <Field name="email" inputType="text" label="Email address" />
      <Button type="submit">Save</Button>
    </Form>
  ),
};
