import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "lit";

import "./CtaBlock.js";
import "../ButtonLink/ButtonLink.js";
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
      <ds-button-link slot="primary" variant="primary" href="#">Get started for free</ds-button-link>
      <ds-button-link slot="secondary" variant="secondary" href="#">Read the docs</ds-button-link>
      <ds-button-link slot="link" href="#">Learn more about pricing &rsaquo;</ds-button-link>
    </ds-cta-block>
  `,
};

export const PrimaryOnly: Story = {
  render: () => html`
    <ds-cta-block>
      <ds-button-link slot="primary" variant="primary" href="#">Download now</ds-button-link>
    </ds-cta-block>
  `,
};

export const PrimaryAndLink: Story = {
  render: () => html`
    <ds-cta-block>
      <ds-button-link slot="primary" variant="primary" href="#">Get started</ds-button-link>
      <ds-button-link slot="link" href="#">Learn more &rsaquo;</ds-button-link>
    </ds-cta-block>
  `,
};
