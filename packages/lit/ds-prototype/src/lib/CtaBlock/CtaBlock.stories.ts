import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "lit";

import "./CtaBlock.js";
import "../Link/Link.js";
import type CtaBlock from "./CtaBlock.js";

const meta = {
  title: "Web Components/CtaBlock",
  tags: ["autodocs"],
} satisfies Meta<CtaBlock>;

export default meta;
type Story = StoryObj<CtaBlock>;

export const Default: Story = {
  render: () => html`
    <ds-cta-block>
      <ds-link slot="primary" variant="primary" href="#">Get started for free</ds-link>
      <ds-link slot="secondary" variant="secondary" href="#">Read the docs</ds-link>
      <ds-link slot="link" href="#">Learn more about pricing &rsaquo;</ds-link>
    </ds-cta-block>
  `,
};

export const PrimaryOnly: Story = {
  render: () => html`
    <ds-cta-block>
      <ds-link slot="primary" variant="primary" href="#">Download now</ds-link>
    </ds-cta-block>
  `,
};

export const PrimaryAndLink: Story = {
  render: () => html`
    <ds-cta-block>
      <ds-link slot="primary" variant="primary" href="#">Get started</ds-link>
      <ds-link slot="link" href="#">Learn more &rsaquo;</ds-link>
    </ds-cta-block>
  `,
};
