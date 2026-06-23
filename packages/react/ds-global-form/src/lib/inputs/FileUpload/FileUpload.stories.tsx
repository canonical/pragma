import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { FileUpload } from "./FileUpload.js";

// Presentational stories: the file upload is controlled directly, no form.
const meta = {
  title: "Inputs/FileUpload",
  component: FileUpload,
  tags: ["autodocs"],
} satisfies Meta<typeof FileUpload>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<File[]>([]);
    return <FileUpload {...args} value={value} onChange={setValue} />;
  },
};

export const Multiple: Story = {
  render: (args) => {
    const [value, setValue] = useState<File[]>([]);
    return <FileUpload {...args} value={value} onChange={setValue} />;
  },
  args: { multiple: true },
};

export const ImagesOnly: Story = {
  render: (args) => {
    const [value, setValue] = useState<File[]>([]);
    return <FileUpload {...args} value={value} onChange={setValue} />;
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
    return <FileUpload {...args} value={value} onChange={setValue} />;
  },
  args: { accept: ".pdf,.doc,.docx", multiple: false },
};

export const Disabled: Story = {
  render: (args) => {
    const [value, setValue] = useState<File[]>([]);
    return <FileUpload {...args} value={value} onChange={setValue} />;
  },
  args: { disabled: true },
};
