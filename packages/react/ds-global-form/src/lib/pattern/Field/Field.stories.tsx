import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";
import * as decorators from "storybook/decorators.js";
import Component from "./Field.js";
import type { FieldProps } from "./types.js";

/**
 * `Field` is the type-safe entry point to every form input: it dispatches on
 * `inputType` to the matching `*Field` component, so one component drives text,
 * select, checkbox, range, date, custom inputs and more — with per-field
 * validation, required/optional marking and conditional display.
 */
const meta = {
  title: "patterns/Field",
  component: Component,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof Component>;

export default meta;
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

/**
 * Default "required" marking: required fields get a "*" before the label (the
 * marker is a CSS pseudo-element, so it stays out of the accessible name; the
 * input carries `aria-required`).
 */
export const Required: Story = {
  args: {
    name: "required_field",
    inputType: "text",
    label: "Display name",
  },
};

/**
 * "optional" marking: the convention flips — optional fields are tagged
 * "(optional)" after the label, and required fields are left unmarked.
 */
export const OptionalMarked: Story = {
  args: {
    name: "optional_field",
    inputType: "text",
    label: "Nickname",
    isOptional: true,
    requiredIndicator: "optional",
  },
};

/**
 * Error state: a required field that has been touched and left empty shows the
 * field-error message and the `.danger` chrome (red border / focus ring).
 */
export const WithError: Story = {
  decorators: [decorators.form({ touchedFields: ["email"] })],
  args: {
    name: "email",
    inputType: "text",
    label: "Email",
    registerProps: {
      required: { value: true, message: "Email is required" },
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

/**
 * The router dispatches on `inputType`. Beyond the text/textarea/checkbox cases
 * above it covers the richer inputs — a few shown here so the single, type-safe
 * `Field` entry point is visible across the family.
 */
export const TypeSelect: Story = {
  args: {
    name: "fruit",
    inputType: "select",
    label: "Favourite fruit",
    options: [
      { value: "apple", label: "Apple" },
      { value: "banana", label: "Banana" },
      { value: "cherry", label: "Cherry" },
    ],
  },
};

export const TypeRange: Story = {
  args: {
    name: "volume",
    inputType: "range",
    label: "Volume",
    min: 0,
    max: 100,
  },
};

export const TypeDate: Story = {
  args: { name: "starts_on", inputType: "date", label: "Start date" },
};

export const TypeColor: Story = {
  args: { name: "brand", inputType: "color", label: "Brand colour" },
};

/**
 * A custom input: `inputType: "custom"` renders the supplied `CustomComponent`,
 * which receives the field's `InputProps` (name + react-hook-form registration)
 * so it participates in the form like any built-in input. This example is a
 * simple star-rating control wired through `onChange`.
 */
const StarRating = ({
  value,
  onChange,
}: {
  value?: number;
  onChange?: (value: number) => void;
}) => (
  <div role="radiogroup" aria-label="Rating">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        aria-label={`${star} star${star > 1 ? "s" : ""}`}
        aria-pressed={(value ?? 0) >= star}
        onClick={() => onChange?.(star)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "1.25rem",
          color: (value ?? 0) >= star ? "#f5a623" : "#ccc",
        }}
      >
        ★
      </button>
    ))}
  </div>
);

export const TypeCustom: Story = {
  args: {
    name: "rating",
    inputType: "custom",
    label: "Rating",
    CustomComponent: StarRating,
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
        isOptional: true,
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
