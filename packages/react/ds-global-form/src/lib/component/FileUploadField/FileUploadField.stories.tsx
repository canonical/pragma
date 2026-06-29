import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { FileUploadField } from "./index.js";

// Field-tier stories: the file upload bound to react-hook-form, inside a form.
const meta = {
  title: "components/FileUploadField",
  component: FileUploadField,
  tags: ["autodocs"],
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
