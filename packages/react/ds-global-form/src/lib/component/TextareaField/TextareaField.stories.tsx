import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { TextareaField } from "./index.js";

// Field-tier stories run inside a form decorator (label/description/error +
// react-hook-form state).
const meta = {
  title: "components/TextareaField",
  component: TextareaField,
  decorators: [decorators.form()],
} satisfies Meta<typeof TextareaField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "content", label: "Content" },
};

export const Rows: Story = {
  args: { name: "content", label: "Content", rows: 7 },
};

export const Disabled: Story = {
  decorators: [
    decorators.form({
      defaultValues: {
        content: "This field is disabled and cannot be edited.",
      },
    }),
  ],
  args: { name: "content", label: "Content", disabled: true },
};

export const WithValidation: Story = {
  args: {
    name: "content",
    label: "Content",
    rows: 7,
    description: "The content of the board",
    registerProps: {
      required: {
        value: true,
        message: "A board name is required",
      },
      pattern: {
        value: /@/,
        message: "Field must contain an '@' symbol",
      },
      minLength: {
        value: 5,
        message: "Board name must be at least 5 characters",
      },
      maxLength: {
        value: 50,
        message: "Board name must be at most 50 characters",
      },
    },
  },
};
