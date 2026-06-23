import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "./Textarea.js";

// Presentational stories render the input directly, with no form decorator.
const meta = {
  title: "Inputs/Textarea",
  component: Textarea,
  tags: ["autodocs"],
} satisfies Meta<typeof Textarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "content" },
};

export const Rows: Story = {
  args: { name: "content", rows: 7 },
};

export const Disabled: Story = {
  args: { name: "content", disabled: true },
};
