import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import * as decorators from "storybook/decorators.js";
import { FileUploadInput } from "./FileUploadInput.js";

// Presentational stories: the file upload is controlled directly, no form.
const meta = {
  title: "subcomponents/FileUploadInput",
  component: FileUploadInput,
  tags: ["autodocs"],
} satisfies Meta<typeof FileUploadInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<File[]>([]);
    return <FileUploadInput {...args} value={value} onChange={setValue} />;
  },
};

export const Multiple: Story = {
  render: (args) => {
    const [value, setValue] = useState<File[]>([]);
    return <FileUploadInput {...args} value={value} onChange={setValue} />;
  },
  args: { multiple: true },
};

export const ImagesOnly: Story = {
  render: (args) => {
    const [value, setValue] = useState<File[]>([]);
    return <FileUploadInput {...args} value={value} onChange={setValue} />;
  },
  args: {
    accept: "image/*",
    multiple: true,
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024,
  },
};

export const SingleFile: Story = {
  render: (args) => {
    const [value, setValue] = useState<File[]>([]);
    return <FileUploadInput {...args} value={value} onChange={setValue} />;
  },
  args: { accept: ".pdf,.doc,.docx", multiple: false },
};

export const Disabled: Story = {
  render: (args) => {
    const [value, setValue] = useState<File[]>([]);
    return <FileUploadInput {...args} value={value} onChange={setValue} />;
  },
  args: { disabled: true },
};

/**
 * Presentational error state: the bare input wrapped in the field `.danger`
 * context (the visual layer the Wrapper applies on a real validation error).
 * For the react-hook-form-driven error see FileUploadField's `WithError`.
 */
export const ErrorState: Story = {
  decorators: [decorators.danger()],
  args: { multiple: true },
};
