import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "lit";

import "./Example.js";
import type { DsExample } from "./Example.js";

const meta = {
  title: "Web Components/Example",
  tags: ["autodocs"],
  argTypes: {
    label: {
      control: "text",
    },
    variant: {
      control: "select",
      options: [undefined, "outlined"],
    },
  },
} satisfies Meta<DsExample>;

export default meta;
type Story = StoryObj<DsExample>;

/* ==========================================================================
   Basic Examples
   ========================================================================== */

/**
 * Default example with no modifiers - uses base token styling.
 */
export const Default: Story = {
  render: () => html`<ds-example></ds-example>`,
};

/**
 * Example with custom label.
 */
export const WithLabel: Story = {
  render: () => html`<ds-example label="Custom label"></ds-example>`,
};

/* ==========================================================================
   Variants
   ========================================================================== */

/**
 * Outlined variant with transparent background.
 */
export const Outlined: Story = {
  render: () =>
    html`<ds-example
      label="Outlined"
      variant="outlined"
    ></ds-example>`,
};
