import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";

import "./ButtonLink.js";
import type ButtonLink from "./ButtonLink.js";

const meta = {
  title: "Web Components/ButtonLink",
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "primary", "secondary"],
    },
  },
  render: (args: Partial<ButtonLink>) => html`
    <ds-button-link
      href="#"
      variant=${ifDefined(args.variant)}
    >Learn more</ds-button-link>
  `,
} satisfies Meta<ButtonLink>;

export default meta;
type Story = StoryObj<ButtonLink>;

export const Default: Story = {
  args: { variant: "default" },
};

export const Primary: Story = {
  args: { variant: "primary" },
  render: () => html`
    <ds-button-link href="#" variant="primary">Get started</ds-button-link>
  `,
};

export const Secondary: Story = {
  args: { variant: "secondary" },
  render: () => html`
    <ds-button-link href="#" variant="secondary">Read the docs</ds-button-link>
  `,
};

export const AllVariants: Story = {
  render: () => html`
    <ds-button-link href="#" variant="primary">Get started</ds-button-link>
    <ds-button-link href="#" variant="secondary">Read the docs</ds-button-link>
    <ds-button-link href="#">Learn more &rsaquo;</ds-button-link>
  `,
};
