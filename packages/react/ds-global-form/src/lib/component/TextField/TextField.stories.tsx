import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { errorStory } from "storybook/errorStory.js";
import { TextField } from "./index.js";

// Field-tier stories run inside a form decorator (label/description/error +
// react-hook-form state).
const meta = {
  title: "components/TextField",
  component: TextField,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "full_name", label: "Full name" },
};

export const Email: Story = {
  args: { name: "email", label: "Email address", inputType: "email" },
};

export const WithPrefixAndSuffix: Story = {
  args: { name: "domain", label: "Domain", prefix: "https://", suffix: ".com" },
};

/** Error state: touched + failing validation → the field shows `.danger` chrome + the error message. */
export const WithError = errorStory({ name: "err_text", label: "Full name" });
