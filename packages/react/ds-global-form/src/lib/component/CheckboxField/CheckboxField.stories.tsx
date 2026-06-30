import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import * as decorators from "storybook/decorators.js";
import { errorStory } from "storybook/errorStory.js";
import { CheckboxField } from "./index.js";

// Field-tier stories run inside a form decorator (label/description/error +
// react-hook-form state).
const meta = {
  title: "components/CheckboxField",
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

/**
 * `indeterminate` is a DOM property (not an attribute), so it can't be passed
 * as a prop — the helper sets it on the rendered input by `name` after mount.
 */
const IndeterminateField = ({
  name,
  label,
  disabled,
}: {
  name: string;
  label: string;
  disabled?: boolean;
}) => {
  useEffect(() => {
    const el = document.querySelector<HTMLInputElement>(
      `input[name="${name}"]`,
    );
    if (el) el.indeterminate = true;
  }, [name]);
  return <CheckboxField name={name} label={label} disabled={disabled} />;
};

export const Indeterminate: Story = {
  args: { name: "subscribe_indeterminate", label: "Indeterminate" },
  decorators: [decorators.form({ touchedFields: ["subscribe_indeterminate"] })],
  render: () => (
    <IndeterminateField name="subscribe_indeterminate" label="Indeterminate" />
  ),
};

export const Disabled: Story = {
  args: { name: "subscribe_disabled", label: "Disabled", disabled: true },
};

export const DisabledChecked: Story = {
  decorators: [
    decorators.form({ defaultValues: { subscribe_disabled_checked: true } }),
  ],
  args: {
    name: "subscribe_disabled_checked",
    label: "Disabled checked",
    disabled: true,
  },
};

export const DisabledIndeterminate: Story = {
  args: { name: "subscribe_disabled_indeterminate", label: "Disabled" },
  decorators: [
    decorators.form({ touchedFields: ["subscribe_disabled_indeterminate"] }),
  ],
  render: () => (
    <IndeterminateField
      name="subscribe_disabled_indeterminate"
      label="Disabled indeterminate"
      disabled
    />
  ),
};

/** Error state: touched + failing validation → the field shows `.danger` chrome + the error message. */
export const WithError = errorStory({
  name: "err_checkbox",
  label: "Accept terms",
});
