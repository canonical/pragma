import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { FileUploadField } from "./index.js";

// Field-tier stories: the file upload bound to react-hook-form, inside a form.
const meta = {
  title: "components/FileUploadField",
  component: FileUploadField,
  decorators: [decorators.form()],
} satisfies Meta<typeof FileUploadField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "document",
    label: "Upload document",
  },
};

export const Multiple: Story = {
  args: {
    name: "documents",
    label: "Upload documents",
    multiple: true,
  },
};

export const ImagesOnly: Story = {
  args: {
    name: "photos",
    label: "Upload photos",
    accept: "image/*",
    multiple: true,
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024,
  },
};

/**
 * Caps the number of files: `maxFiles` is enforced as a react-hook-form
 * `validate` rule, so exceeding it shows a standard field error (rather than the
 * input silently dropping the extra files). Seeded over the limit + touched so
 * the error renders.
 */
export const MaxFiles: Story = {
  args: {
    name: "attachments",
    label: "Attachments (max 2)",
    multiple: true,
    maxFiles: 2,
  },
  decorators: [
    decorators.form({
      defaultValues: {
        attachments: [
          new File(["a"], "one.txt"),
          new File(["b"], "two.txt"),
          new File(["c"], "three.txt"),
        ],
      },
      touchedFields: ["attachments"],
    }),
  ],
};

export const SingleFile: Story = {
  args: {
    name: "resume",
    label: "Upload resume",
    accept: ".pdf,.doc,.docx",
    multiple: false,
  },
};

export const Disabled: Story = {
  args: {
    name: "file_disabled",
    label: "Upload (disabled)",
    disabled: true,
  },
};
