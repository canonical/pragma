import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { PasswordField } from "./index.js";

// Field-tier stories run inside a form decorator (label/description/error +
// react-hook-form state).
const meta = {
  title: "components/PasswordField",
  component: PasswordField,
  decorators: [decorators.form()],
} satisfies Meta<typeof PasswordField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "password", label: "Password" },
};

export const WithDescription: Story = {
  args: {
    name: "password",
    label: "Password",
    description: "At least 8 characters.",
  },
};

export const NotRevealable: Story = {
  args: { name: "password", label: "Password", revealable: false },
};
