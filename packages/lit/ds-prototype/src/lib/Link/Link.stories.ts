import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";

import "./Link.js";
import type Link from "./Link.js";

const meta = {
  title: "Web Components/Link",
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "primary", "secondary"],
    },
  },
  render: (args: Partial<Link>) => html`
    <ds-link
      href="#"
      variant=${ifDefined(args.variant)}
    >Learn more</ds-link>
  `,
} satisfies Meta<Link>;

export default meta;
type Story = StoryObj<Link>;

export const Default: Story = {
  args: { variant: "default" },
};

export const Primary: Story = {
  args: { variant: "primary" },
  render: () => html`
    <ds-link href="#" variant="primary">Get started</ds-link>
  `,
};

export const Secondary: Story = {
  args: { variant: "secondary" },
  render: () => html`
    <ds-link href="#" variant="secondary">Read the docs</ds-link>
  `,
};

export const AllVariants: Story = {
  render: () => html`
    <ds-link href="#" variant="primary">Get started</ds-link>
    <ds-link href="#" variant="secondary">Read the docs</ds-link>
    <ds-link href="#">Learn more &rsaquo;</ds-link>
  `,
};
