import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import * as decorators from "storybook/decorators.js";
import { CheckboxField } from "./index.js";

// Field-tier stories run inside a form decorator (label/description/error +
// react-hook-form state).
const meta = {
  title: "Fields/Checkbox",
  component: CheckboxField,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof CheckboxField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "subscribe", label: "Subscribe" },
};

export const Checked: Story = {
  decorators: [decorators.form({ defaultValues: { subscribe_checked: true } })],
  args: { name: "subscribe_checked", label: "Checked" },
};

const IndeterminateHelper = () => {
  useEffect(() => {
    const el = document.querySelector<HTMLInputElement>(
      'input[name="subscribe_indeterminate"]',
    );
    if (el) el.indeterminate = true;
  }, []);
  return <CheckboxField name="subscribe_indeterminate" label="Indeterminate" />;
};

export const Indeterminate: Story = {
  args: { name: "subscribe_indeterminate", label: "Indeterminate" },
  decorators: [decorators.form({ touchedFields: ["subscribe_indeterminate"] })],
  render: () => <IndeterminateHelper />,
};

export const Disabled: Story = {
  args: { name: "subscribe_disabled", label: "Disabled", disabled: true },
};
