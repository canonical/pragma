import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextareaInput } from "./TextareaInput.js";

// Presentational stories render the input directly, with no form decorator.
const meta = {
  title: "subcomponents/TextareaInput",
  component: TextareaInput,
  tags: ["autodocs"],
} satisfies Meta<typeof TextareaInput>;

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
