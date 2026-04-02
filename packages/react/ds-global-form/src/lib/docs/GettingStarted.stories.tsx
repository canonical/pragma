import { Button } from "@canonical/react-ds-global";
import type { Meta, StoryObj } from "@storybook/react-vite";
import Field from "../Field/Field.js";
import Form from "../Form/Form.js";

const noop = (data: Record<string, unknown>) => console.log(data);

const meta = {
  title: "Getting Started/Examples",
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
