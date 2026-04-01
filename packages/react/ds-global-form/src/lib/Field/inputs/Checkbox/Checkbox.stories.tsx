import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import * as decorators from "#storybook/decorators.js";
import Component from "./Checkbox.js";

const meta = {
  title: "Field/inputs/Checkbox",
  component: Component,
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [decorators.form()],
  args: {
    name: "subscribe",
  },
};

export const Checked: Story = {
  decorators: [decorators.form({ defaultValues: { subscribe_checked: true } })],
  args: {
    name: "subscribe_checked",
    label: "Checked",
  },
};

const IndeterminateHelper = () => {
  useEffect(() => {
    const el = document.querySelector<HTMLInputElement>(
      'input[name="subscribe_indeterminate"]',
    );
    if (el) el.indeterminate = true;
  }, []);
  return <Component name="subscribe_indeterminate" label="Indeterminate" />;
};

export const Indeterminate: Story = {
  args: { name: "subscribe_indeterminate" },
  decorators: [decorators.form({ touchedFields: ["subscribe_indeterminate"] })],
  render: () => <IndeterminateHelper />,
};

export const Disabled: Story = {
  decorators: [decorators.form()],
  args: {
    name: "subscribe_disabled",
    disabled: true,
  },
};
