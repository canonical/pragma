import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "./Text.js";

// Presentational stories render the input directly, with no form decorator.
const meta = {
  title: "subcomponents/TextInput",
  component: Text,
  tags: ["autodocs"],
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "full_name", placeholder: "Jane Doe" },
};

export const Email: Story = {
  args: { name: "email", inputType: "email" },
};

export const WithPrefix: Story = {
  args: { name: "username", prefix: "@" },
};

export const WithSuffix: Story = {
  args: { name: "domain", suffix: ".domain.com" },
};

export const Disabled: Story = {
  args: { name: "disabled_example", disabled: true },
};
